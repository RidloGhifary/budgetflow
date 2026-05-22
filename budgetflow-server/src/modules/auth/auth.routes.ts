import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate-request";
import { login, logout, me, register } from "./auth.controller";
import { loginRateLimiter, registerRateLimiter } from "./auth.rate-limit";
import { loginSchema, registerSchema } from "./auth.validators";

export const authRouter = Router();

authRouter.post("/register", registerRateLimiter, validateBody(registerSchema), register);
authRouter.post("/login", loginRateLimiter, validateBody(loginSchema), login);
authRouter.get("/me", requireAuth, me);
authRouter.post("/logout", logout);
