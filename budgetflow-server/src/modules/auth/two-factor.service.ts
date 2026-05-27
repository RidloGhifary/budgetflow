import type { TwoFactorChallenge, User } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { BadRequestError, UnauthorizedError } from "../../utils/app-error";
import { comparePassword } from "../../utils/password";
import { signAuthToken } from "../../utils/jwt";
import type { AuditRequestContext } from "../audit-logs/audit-log.context";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit-logs/audit-log.constants";
import { recordAuditLogSafely } from "../audit-logs/audit-log.service";
import { NOTIFICATION_ENTITY_TYPES, NOTIFICATION_TYPES } from "../notifications/notification.constants";
import { createUserNotificationSafely } from "../notifications/notification.service";
import { createUserSession } from "../security-sessions/security-session.service";
import { toSafeUser } from "../users/user.mapper";
import {
  LOGIN_HISTORY_STATUS,
  LOGIN_METHODS,
  recordLoginHistorySafely
} from "./login-history.service";
import {
  compareRecoveryCode,
  generateRecoveryCodes,
  hashRecoveryCodes,
  normalizeRecoveryCode
} from "./recovery-code.service";
import {
  buildOtpAuthUrl,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateChallengeToken,
  generateTwoFactorSecret,
  hashToken,
  toQrCodeDataUrl,
  verifyTokenHash,
  verifyTotpCode
} from "./two-factor.crypto";

const challengeTtlMs = 5 * 60 * 1000;
const maxChallengeAttempts = 5;

interface TwoFactorLoginChallengeInput {
  challengeId: string;
  challengeToken: string;
}

interface VerifyTwoFactorLoginInput extends TwoFactorLoginChallengeInput {
  code: string;
}

interface VerifyRecoveryLoginInput extends TwoFactorLoginChallengeInput {
  recoveryCode: string;
}

interface ConfirmSecurityInput {
  password: string;
  code: string;
}

export async function getTwoFactorStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      twoFactorRecoveryCodes: {
        where: { usedAt: null },
        select: { id: true }
      }
    }
  });

  if (!user) {
    throw new UnauthorizedError();
  }

  return {
    enabled: user.twoFactorEnabled,
    enabledAt: user.twoFactorEnabledAt,
    pendingSetup: Boolean(user.twoFactorPendingSecret),
    recoveryCodesRemaining: user.twoFactorRecoveryCodes.length
  };
}

export async function startTwoFactorSetup(userId: string, context: AuditRequestContext) {
  const user = await getUserOrThrow(userId);
  const secret = generateTwoFactorSecret();
  const encryptedSecret = encryptTwoFactorSecret(secret);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorPendingSecret: encryptedSecret
    }
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.TWO_FACTOR_SETUP_STARTED,
    context,
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { source: "security_settings" },
    userId: user.id
  });

  const otpAuthUrl = buildOtpAuthUrl(user.email, secret);

  return {
    manualKey: secret,
    otpAuthUrl,
    qrCodeDataUrl: await toQrCodeDataUrl(otpAuthUrl)
  };
}

export async function verifyTwoFactorSetup(userId: string, code: string, context: AuditRequestContext) {
  const user = await getUserOrThrow(userId);

  if (!user.twoFactorPendingSecret) {
    throw new BadRequestError("Start 2FA setup before verifying a code.");
  }

  const secret = decryptTwoFactorSecret(user.twoFactorPendingSecret);

  if (!verifyTotpCode(secret, code)) {
    await recordAuditLogSafely({
      action: AUDIT_ACTIONS.TWO_FACTOR_SETUP_FAILED,
      context,
      entityId: user.id,
      entityType: AUDIT_ENTITY_TYPES.USER,
      metadata: { reason: "invalid_otp" },
      result: "FAILURE",
      severity: "WARNING",
      userId: user.id
    });
    throw new UnauthorizedError("Invalid verification code.");
  }

  const recoveryCodes = generateRecoveryCodes();
  const recoveryCodeHashes = await hashRecoveryCodes(recoveryCodes);
  const encryptedSecret = encryptTwoFactorSecret(secret);
  const enabledAt = new Date();

  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: enabledAt,
        twoFactorLastVerifiedAt: enabledAt,
        twoFactorPendingSecret: null,
        twoFactorSecret: encryptedSecret
      }
    }),
    prisma.twoFactorRecoveryCode.createMany({
      data: recoveryCodeHashes.map((codeHash) => ({
        codeHash,
        userId: user.id
      }))
    })
  ]);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.TWO_FACTOR_ENABLED,
    context,
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { recoveryCodeCount: recoveryCodes.length },
    userId: user.id
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.two_factor_enabled:${user.id}:${enabledAt.toISOString()}`,
    entityId: user.id,
    entityType: NOTIFICATION_ENTITY_TYPES.USER,
    message: "Two-factor authentication is now enabled for your account.",
    metadata: { recoveryCodeCount: recoveryCodes.length },
    severity: "SUCCESS",
    title: "2FA enabled",
    type: NOTIFICATION_TYPES.SECURITY_TWO_FACTOR_ENABLED,
    userId: user.id
  });

  return {
    recoveryCodes,
    status: await getTwoFactorStatus(user.id)
  };
}

export async function cancelTwoFactorSetup(userId: string, context: AuditRequestContext) {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorPendingSecret: null }
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.TWO_FACTOR_SETUP_CANCELLED,
    context,
    entityId: userId,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { source: "security_settings" },
    userId
  });

  return getTwoFactorStatus(userId);
}

export async function disableTwoFactor(userId: string, input: ConfirmSecurityInput, context: AuditRequestContext) {
  const user = await getUserOrThrow(userId);

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new BadRequestError("2FA is not enabled.");
  }

  await confirmPassword(user, input.password);
  await verifySecondFactorForUser(user, input.code);

  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.twoFactorChallenge.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorEnabledAt: null,
        twoFactorLastVerifiedAt: null,
        twoFactorPendingSecret: null,
        twoFactorSecret: null
      }
    })
  ]);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.TWO_FACTOR_DISABLED,
    context,
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { source: "security_settings" },
    severity: "WARNING",
    userId: user.id
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.two_factor_disabled:${user.id}:${new Date().toISOString()}`,
    entityId: user.id,
    entityType: NOTIFICATION_ENTITY_TYPES.USER,
    message: "Two-factor authentication was disabled for your account.",
    metadata: {},
    severity: "WARNING",
    title: "2FA disabled",
    type: NOTIFICATION_TYPES.SECURITY_TWO_FACTOR_DISABLED,
    userId: user.id
  });

  return getTwoFactorStatus(user.id);
}

export async function regenerateRecoveryCodes(userId: string, input: ConfirmSecurityInput, context: AuditRequestContext) {
  const user = await getUserOrThrow(userId);

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new BadRequestError("2FA is not enabled.");
  }

  await confirmPassword(user, input.password);
  await verifySecondFactorForUser(user, input.code);

  const recoveryCodes = generateRecoveryCodes();
  const recoveryCodeHashes = await hashRecoveryCodes(recoveryCodes);

  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.twoFactorRecoveryCode.createMany({
      data: recoveryCodeHashes.map((codeHash) => ({
        codeHash,
        userId: user.id
      }))
    })
  ]);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.TWO_FACTOR_RECOVERY_CODES_REGENERATED,
    context,
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { recoveryCodeCount: recoveryCodes.length },
    userId: user.id
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.recovery_codes_regenerated:${user.id}:${new Date().toISOString()}`,
    entityId: user.id,
    entityType: NOTIFICATION_ENTITY_TYPES.USER,
    message: "Your 2FA recovery codes were regenerated.",
    metadata: { recoveryCodeCount: recoveryCodes.length },
    severity: "INFO",
    title: "Recovery codes regenerated",
    type: NOTIFICATION_TYPES.SECURITY_RECOVERY_CODES_REGENERATED,
    userId: user.id
  });

  return {
    recoveryCodes,
    status: await getTwoFactorStatus(user.id)
  };
}

export async function confirmSecondFactorForUser(userId: string, code: string) {
  const user = await getUserOrThrow(userId);

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return "not_enabled";
  }

  return verifySecondFactorForUser(user, code);
}

export async function createTwoFactorChallenge(user: Pick<User, "id" | "email">) {
  const challengeToken = generateChallengeToken();
  const challenge = await prisma.twoFactorChallenge.create({
    data: {
      expiresAt: new Date(Date.now() + challengeTtlMs),
      tokenHash: hashToken(challengeToken),
      userId: user.id
    }
  });

  return {
    challengeId: challenge.id,
    challengeToken,
    email: user.email,
    expiresAt: challenge.expiresAt
  };
}

export async function verifyTwoFactorLogin(input: VerifyTwoFactorLoginInput, context: AuditRequestContext) {
  const { challenge, user } = await getValidChallenge(input);
  const secret = getEnabledTwoFactorSecret(user);

  if (!verifyTotpCode(secret, input.code)) {
    await registerFailedChallengeAttempt(challenge, user, "invalid_otp", LOGIN_METHODS.TOTP, context);
    throw new UnauthorizedError("Invalid verification code.");
  }

  return completeTwoFactorLogin(challenge, user, LOGIN_METHODS.TOTP, context);
}

export async function verifyRecoveryCodeLogin(input: VerifyRecoveryLoginInput, context: AuditRequestContext) {
  const { challenge, user } = await getValidChallenge(input);
  const recoveryCode = await consumeRecoveryCode(user.id, input.recoveryCode);

  if (!recoveryCode) {
    await registerFailedChallengeAttempt(challenge, user, "invalid_recovery_code", LOGIN_METHODS.RECOVERY_CODE, context);
    throw new UnauthorizedError("Invalid recovery code.");
  }

  const result = await completeTwoFactorLogin(challenge, user, LOGIN_METHODS.RECOVERY_CODE, context, true);

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.TWO_FACTOR_RECOVERY_CODE_USED,
    context: {
      ...context,
      actorUserId: user.id,
      sessionId: result.sessionId
    },
    entityId: recoveryCode.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { source: "login" },
    severity: "WARNING",
    userId: user.id
  });

  await createUserNotificationSafely({
    actionUrl: "/settings",
    category: "SECURITY",
    dedupeKey: `security.recovery_code_used:${recoveryCode.id}`,
    entityId: recoveryCode.id,
    entityType: NOTIFICATION_ENTITY_TYPES.USER,
    message: "A 2FA recovery code was used to sign in to your account.",
    metadata: {},
    severity: "WARNING",
    title: "Recovery code used",
    type: NOTIFICATION_TYPES.SECURITY_RECOVERY_CODE_USED,
    userId: user.id
  });

  return result;
}

async function completeTwoFactorLogin(
  challenge: TwoFactorChallenge,
  user: User,
  method: typeof LOGIN_METHODS.TOTP | typeof LOGIN_METHODS.RECOVERY_CODE,
  context: AuditRequestContext,
  recoveryCodeUsed = false
) {
  const session = await createUserSession(user.id, context);
  const verifiedAt = new Date();

  await prisma.$transaction([
    prisma.twoFactorChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: verifiedAt }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { twoFactorLastVerifiedAt: verifiedAt }
    })
  ]);

  await recordLoginHistorySafely({
    attemptedEmail: user.email,
    metadata: context,
    method,
    recoveryCodeUsed,
    sessionId: session.id,
    status: LOGIN_HISTORY_STATUS.SUCCESS,
    twoFactorPassed: true,
    twoFactorRequired: true,
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
    metadata: { method, source: "auth", twoFactor: true },
    userId: user.id
  });

  return {
    sessionId: session.id,
    token: signAuthToken(user.id, session.id),
    user: toSafeUser(user)
  };
}

async function getValidChallenge(input: TwoFactorLoginChallengeInput) {
  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: { id: input.challengeId },
    include: { user: true }
  });

  if (
    !challenge ||
    challenge.usedAt ||
    challenge.expiresAt.getTime() <= Date.now() ||
    challenge.attempts >= maxChallengeAttempts ||
    !verifyTokenHash(input.challengeToken, challenge.tokenHash)
  ) {
    throw new UnauthorizedError("Invalid or expired 2FA challenge.");
  }

  if (!challenge.user.twoFactorEnabled || !challenge.user.twoFactorSecret) {
    throw new UnauthorizedError("Invalid or expired 2FA challenge.");
  }

  return {
    challenge,
    user: challenge.user
  };
}

async function registerFailedChallengeAttempt(
  challenge: TwoFactorChallenge,
  user: User,
  reason: string,
  method: typeof LOGIN_METHODS.TOTP | typeof LOGIN_METHODS.RECOVERY_CODE,
  context: AuditRequestContext
) {
  await prisma.twoFactorChallenge.update({
    where: { id: challenge.id },
    data: { attempts: { increment: 1 } }
  });

  await recordLoginHistorySafely({
    attemptedEmail: user.email,
    failureReason: reason,
    metadata: context,
    method,
    status: LOGIN_HISTORY_STATUS.FAILURE,
    twoFactorRequired: true,
    userId: user.id
  });

  await recordAuditLogSafely({
    action: AUDIT_ACTIONS.TWO_FACTOR_LOGIN_FAILED,
    context,
    entityId: user.id,
    entityType: AUDIT_ENTITY_TYPES.USER,
    metadata: { method, reason },
    result: "FAILURE",
    severity: "WARNING",
    userId: user.id
  });
}

async function confirmPassword(user: Pick<User, "passwordHash">, password: string) {
  const passwordMatches = await comparePassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid confirmation.");
  }
}

async function verifySecondFactorForUser(user: User, code: string) {
  const secret = getEnabledTwoFactorSecret(user);

  if (verifyTotpCode(secret, code)) {
    return "totp";
  }

  const recoveryCode = await consumeRecoveryCode(user.id, code);

  if (recoveryCode) {
    return "recovery_code";
  }

  throw new UnauthorizedError("Invalid verification code.");
}

function getEnabledTwoFactorSecret(user: Pick<User, "twoFactorEnabled" | "twoFactorSecret">) {
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new BadRequestError("2FA is not enabled.");
  }

  return decryptTwoFactorSecret(user.twoFactorSecret);
}

async function consumeRecoveryCode(userId: string, value: string) {
  const normalized = normalizeRecoveryCode(value);

  if (!normalized) {
    return null;
  }

  const recoveryCodes = await prisma.twoFactorRecoveryCode.findMany({
    where: {
      userId,
      usedAt: null
    },
    orderBy: { createdAt: "asc" }
  });

  for (const recoveryCode of recoveryCodes) {
    if (await compareRecoveryCode(normalized, recoveryCode.codeHash)) {
      return prisma.twoFactorRecoveryCode.update({
        where: { id: recoveryCode.id },
        data: { usedAt: new Date() }
      });
    }
  }

  return null;
}

async function getUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}
