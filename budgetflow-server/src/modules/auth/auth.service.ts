import { ConflictError, NotFoundError, UnauthorizedError } from "../../utils/app-error";
import { comparePassword, hashPassword } from "../../utils/password";
import { isPrismaUniqueConstraintError } from "../../utils/prisma-error";
import { signAuthToken, verifyAuthToken } from "../../utils/jwt";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { createUserSession, revokeUserSession } from "../security-sessions/security-session.service";
import { createUser, findUserByEmail, findUserById } from "../users/user.repository";
import { toSafeUser } from "../users/user.mapper";
import { normalizeEmail } from "./email-policy";
import { LOGIN_HISTORY_STATUS, LOGIN_METHODS, recordLoginHistorySafely } from "./login-history.service";
import { createTwoFactorChallenge } from "./two-factor.service";
import type { LoginInput, RegisterInput } from "./auth.validators";
import type { SafeUser } from "../../types/user";

interface AuthResult {
  user: SafeUser;
  token: string;
}

interface TwoFactorRequiredResult {
  challengeId: string;
  challengeToken: string;
  email: string;
  expiresAt: Date;
  twoFactorRequired: true;
}

type LoginResult = AuthResult | TwoFactorRequiredResult;

export async function registerUser(input: RegisterInput, context: AuditRequestContext): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new ConflictError("Email is already registered");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    name: input.name,
    email,
    passwordHash
  }).catch((error: unknown) => {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError("Email is already registered");
    }

    throw error;
  });
  const session = await createUserSession(user.id, context);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.AUTH_REGISTER_SUCCESS,
    afterSnapshot: {
      email: user.email,
      name: user.name
    },
    context: {
      ...context,
      actorUserId: user.id,
      sessionId: session.id
    },
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { source: "auth" },
    userId: user.id
  });

  return {
    user: toSafeUser(user),
    token: signAuthToken(user.id, session.id)
  };
}

export async function loginUser(input: LoginInput, context: AuditRequestContext): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);

  if (!user) {
    await recordLoginFailure(null, email, context);
    throw new UnauthorizedError("Invalid email or password");
  }

  const passwordMatches = await comparePassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    await recordLoginFailure(user.id, email, context);
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const challenge = await createTwoFactorChallenge(user);

    return {
      ...challenge,
      twoFactorRequired: true
    };
  }

  const session = await createUserSession(user.id, context);

  await recordLoginHistorySafely({
    attemptedEmail: user.email,
    metadata: context,
    method: LOGIN_METHODS.PASSWORD,
    sessionId: session.id,
    status: LOGIN_HISTORY_STATUS.SUCCESS,
    userId: user.id
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
    context: {
      ...context,
      actorUserId: user.id,
      sessionId: session.id
    },
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { source: "auth" },
    userId: user.id
  });

  return {
    user: toSafeUser(user),
    token: signAuthToken(user.id, session.id)
  };
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("Authenticated user was not found");
  }

  return toSafeUser(user);
}

export async function logoutSession(token?: string, context?: AuditRequestContext) {
  if (!token) {
    return;
  }

  try {
    const payload = verifyAuthToken(token);

    if (payload.sid) {
      await revokeUserSession(payload.sub, payload.sid, payload.sid, {
        ...context,
        actorUserId: payload.sub,
        sessionId: payload.sid
      });
      await recordAuditLogSafely({
        action: AUDIT_ACTIONS.AUTH_LOGOUT,
        context: {
          ...context,
          actorUserId: payload.sub,
          sessionId: payload.sid
        },
        entityId: payload.sid,
        entityType: AUDIT_ENTITY_TYPES.SESSION,
        metadata: { source: "logout" },
        userId: payload.sub
      });
    }
  } catch {
    return;
  }
}

async function recordLoginFailure(userId: string | null, email: string, context: AuditRequestContext) {
  await recordLoginHistorySafely({
    attemptedEmail: email,
    failureReason: "invalid_credentials",
    metadata: context,
    method: LOGIN_METHODS.PASSWORD,
    status: LOGIN_HISTORY_STATUS.FAILURE,
    userId
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
    context,
    entityId: userId,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: {
      attemptedEmail: email,
      reason: "invalid_credentials"
    },
    result: "FAILURE",
    severity: "WARNING",
    userId
  });
}

function isUniqueConstraintError(error: unknown) {
  return isPrismaUniqueConstraintError(error);
}
