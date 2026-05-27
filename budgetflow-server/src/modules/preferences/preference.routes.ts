import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate-request";
import { getPreferences, updatePrivacyMode } from "./preference.controller";
import { updatePrivacyModeSchema } from "./preference.validators";

export const preferenceRouter = Router();

preferenceRouter.use(requireAuth);

preferenceRouter.get("/", getPreferences);
preferenceRouter.patch("/privacy-mode", validateBody(updatePrivacyModeSchema), updatePrivacyMode);
