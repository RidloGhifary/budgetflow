import type { Request } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { AUTH_COOKIE_NAME, clearAuthCookie, setAuthCookie } from "../../utils/cookie";
import { sendSuccess } from "../../utils/api-response";
import { UnauthorizedError } from "../../utils/app-error";
import { getAuditRequestContext } from "../audit-logs/audit-log.context";
import { getCurrentUser, loginUser, logoutSession, registerUser } from "./auth.service";
import { verifyRecoveryCodeLogin, verifyTwoFactorLogin } from "./two-factor.service";
import type { LoginInput, RecoveryCodeLoginInput, RegisterInput, TwoFactorLoginInput } from "./auth.validators";

export const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body as RegisterInput, getAuditRequestContext(req));
  setAuthCookie(res, result.token);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Registration successful",
    data: { user: result.user }
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body as LoginInput, getAuditRequestContext(req));

  if ("twoFactorRequired" in result) {
    return sendSuccess(res, {
      message: "Two-factor authentication required",
      data: result
    });
  }

  setAuthCookie(res, result.token);

  return sendSuccess(res, {
    message: "Login successful",
    data: { user: result.user }
  });
});

export const verifyTwoFactor = asyncHandler(async (req, res) => {
  const result = await verifyTwoFactorLogin(req.body as TwoFactorLoginInput, getAuditRequestContext(req));
  setAuthCookie(res, result.token);

  return sendSuccess(res, {
    message: "Login successful",
    data: { user: result.user }
  });
});

export const useRecoveryCode = asyncHandler(async (req, res) => {
  const result = await verifyRecoveryCodeLogin(req.body as RecoveryCodeLoginInput, getAuditRequestContext(req));
  setAuthCookie(res, result.token);

  return sendSuccess(res, {
    message: "Login successful",
    data: { user: result.user }
  });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.auth?.userId) {
    throw new UnauthorizedError();
  }

  const user = await getCurrentUser(req.auth.userId);

  return sendSuccess(res, {
    message: "Current user retrieved",
    data: { user }
  });
});

export const logout = asyncHandler(async (req, res) => {
  await logoutSession(req.cookies?.[AUTH_COOKIE_NAME] ?? getBearerToken(req), getAuditRequestContext(req));
  clearAuthCookie(res);

  return sendSuccess(res, {
    message: "Logout successful",
    data: null
  });
});

function getBearerToken(req: Request) {
  const header = req.headers.authorization;

  if (!header) {
    return undefined;
  }

  const [scheme, token] = header.split(" ");

  return scheme === "Bearer" && token ? token : undefined;
}
