import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedSessionId, getAuthenticatedUserId } from "../../utils/auth-context";
import { clearAuthCookie } from "../../utils/cookie";
import { sendSuccess } from "../../utils/api-response";
import { getAuditRequestContext } from "../audit-logs/audit-log.context";
import { listLoginHistory } from "../auth/login-history.service";
import {
  cancelTwoFactorSetup,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateRecoveryCodes,
  startTwoFactorSetup,
  verifyTwoFactorSetup
} from "../auth/two-factor.service";
import type {
  ChangePasswordInput,
  ConfirmTwoFactorInput,
  DeleteAccountInput,
  VerifyTwoFactorSetupInput
} from "../auth/auth.validators";
import {
  buildAccountDataDownload,
  changeUserPassword,
  deleteUserAccount
} from "./account-trust.service";
import {
  listUserSessions,
  revokeOtherUserSessions,
  revokeUserSession
} from "./security-session.service";

export const getSessions = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const currentSessionId = getAuthenticatedSessionId(req);
  const sessions = await listUserSessions(userId, currentSessionId);

  return sendSuccess(res, {
    message: "Sessions retrieved",
    data: { sessions }
  });
});

export const revokeSession = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const currentSessionId = getAuthenticatedSessionId(req);
  const result = await revokeUserSession(userId, req.params.id, currentSessionId, getAuditRequestContext(req));

  if (result.revokedCurrentSession) {
    clearAuthCookie(res);
  }

  return sendSuccess(res, {
    message: "Session revoked",
    data: result
  });
});

export const logoutOtherSessions = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const currentSessionId = getAuthenticatedSessionId(req);
  const result = await revokeOtherUserSessions(userId, currentSessionId, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Other sessions revoked",
    data: result
  });
});

export const getTwoFactor = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const status = await getTwoFactorStatus(userId);

  return sendSuccess(res, {
    message: "2FA status retrieved",
    data: { status }
  });
});

export const startTwoFactor = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const setup = await startTwoFactorSetup(userId, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "2FA setup started",
    data: { setup }
  });
});

export const verifyTwoFactorSetupController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await verifyTwoFactorSetup(userId, (req.body as VerifyTwoFactorSetupInput).code, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "2FA enabled",
    data: result
  });
});

export const cancelTwoFactor = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const status = await cancelTwoFactorSetup(userId, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "2FA setup cancelled",
    data: { status }
  });
});

export const disableTwoFactorController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const status = await disableTwoFactor(userId, req.body as ConfirmTwoFactorInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "2FA disabled",
    data: { status }
  });
});

export const regenerateRecoveryCodesController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await regenerateRecoveryCodes(userId, req.body as ConfirmTwoFactorInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Recovery codes regenerated",
    data: result
  });
});

export const getLoginHistory = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const history = await listLoginHistory(userId);

  return sendSuccess(res, {
    message: "Login history retrieved",
    data: { history }
  });
});

export const changePasswordController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await changeUserPassword(userId, req.body as ChangePasswordInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Password changed",
    data: result
  });
});

export const downloadAccountDataController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const file = await buildAccountDataDownload(userId, getAuditRequestContext(req));

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Length", file.buffer.byteLength);
  res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);

  return res.status(200).send(file.buffer);
});

export const deleteAccountController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await deleteUserAccount(userId, req.body as DeleteAccountInput, getAuditRequestContext(req));
  clearAuthCookie(res);

  return sendSuccess(res, {
    message: "Account deleted",
    data: result
  });
});
