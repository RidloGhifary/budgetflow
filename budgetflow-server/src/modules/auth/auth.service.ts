import { ConflictError, NotFoundError, UnauthorizedError } from "../../utils/app-error";
import { comparePassword, hashPassword } from "../../utils/password";
import { isPrismaUniqueConstraintError } from "../../utils/prisma-error";
import { signAuthToken } from "../../utils/jwt";
import { createUser, findUserByEmail, findUserById } from "../users/user.repository";
import { toSafeUser } from "../users/user.mapper";
import { normalizeEmail } from "./email-policy";
import type { LoginInput, RegisterInput } from "./auth.validators";
import type { SafeUser } from "../../types/user";

interface AuthResult {
  user: SafeUser;
  token: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
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

  return {
    user: toSafeUser(user),
    token: signAuthToken(user.id)
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const passwordMatches = await comparePassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return {
    user: toSafeUser(user),
    token: signAuthToken(user.id)
  };
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);

  if (!user) {
    throw new NotFoundError("Authenticated user was not found");
  }

  return toSafeUser(user);
}

function isUniqueConstraintError(error: unknown) {
  return isPrismaUniqueConstraintError(error);
}
