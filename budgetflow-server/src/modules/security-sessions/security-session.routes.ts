import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate-request";
import {
  changePasswordSchema,
  confirmTwoFactorSchema,
  deleteAccountSchema,
  verifyTwoFactorSetupSchema
} from "../auth/auth.validators";
import { securityConfirmationRateLimiter } from "../auth/auth.rate-limit";
import {
  cancelTwoFactor,
  changePasswordController,
  deleteAccountController,
  downloadAccountDataController,
  disableTwoFactorController,
  getLoginHistory,
  getSessions,
  getTwoFactor,
  logoutOtherSessions,
  regenerateRecoveryCodesController,
  revokeSession,
  startTwoFactor,
  verifyTwoFactorSetupController
} from "./security-session.controller";

export const securitySessionRouter = Router();

securitySessionRouter.use(requireAuth);

securitySessionRouter.get("/sessions", getSessions);
securitySessionRouter.delete("/sessions/:id", revokeSession);
securitySessionRouter.post("/sessions/logout-others", logoutOtherSessions);
securitySessionRouter.post("/change-password", securityConfirmationRateLimiter, validateBody(changePasswordSchema), changePasswordController);
securitySessionRouter.get("/2fa", getTwoFactor);
securitySessionRouter.post("/2fa/setup", securityConfirmationRateLimiter, startTwoFactor);
securitySessionRouter.post("/2fa/setup/verify", securityConfirmationRateLimiter, validateBody(verifyTwoFactorSetupSchema), verifyTwoFactorSetupController);
securitySessionRouter.post("/2fa/setup/cancel", cancelTwoFactor);
securitySessionRouter.post("/2fa/disable", securityConfirmationRateLimiter, validateBody(confirmTwoFactorSchema), disableTwoFactorController);
securitySessionRouter.post("/2fa/recovery-codes/regenerate", securityConfirmationRateLimiter, validateBody(confirmTwoFactorSchema), regenerateRecoveryCodesController);
securitySessionRouter.get("/login-history", getLoginHistory);
securitySessionRouter.get("/account-data/download", securityConfirmationRateLimiter, downloadAccountDataController);
securitySessionRouter.delete("/account", securityConfirmationRateLimiter, validateBody(deleteAccountSchema), deleteAccountController);
