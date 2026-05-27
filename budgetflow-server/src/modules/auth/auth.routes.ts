import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate-request";
import { login, logout, me, register, useRecoveryCode, verifyTwoFactor } from "./auth.controller";
import { loginRateLimiter, registerRateLimiter, twoFactorRateLimiter } from "./auth.rate-limit";
import { loginSchema, recoveryCodeLoginSchema, registerSchema, twoFactorLoginSchema } from "./auth.validators";

export const authRouter = Router();

authRouter.post("/register", registerRateLimiter, validateBody(registerSchema), register);
authRouter.post("/login", loginRateLimiter, validateBody(loginSchema), login);
authRouter.post("/login/2fa", twoFactorRateLimiter, validateBody(twoFactorLoginSchema), verifyTwoFactor);
authRouter.post("/login/recovery-code", twoFactorRateLimiter, validateBody(recoveryCodeLoginSchema), useRecoveryCode);
authRouter.get("/me", requireAuth, me);
authRouter.post("/logout", logout);
