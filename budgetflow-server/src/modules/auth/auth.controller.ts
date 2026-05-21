import { asyncHandler } from "../../utils/async-handler";
import { clearAuthCookie, setAuthCookie } from "../../utils/cookie";
import { sendSuccess } from "../../utils/api-response";
import { UnauthorizedError } from "../../utils/app-error";
import { getCurrentUser, loginUser, registerUser } from "./auth.service";
import type { LoginInput, RegisterInput } from "./auth.validators";

export const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body as RegisterInput);
  setAuthCookie(res, result.token);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Registration successful",
    data: { user: result.user }
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body as LoginInput);
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

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);

  return sendSuccess(res, {
    message: "Logout successful",
    data: null
  });
});
