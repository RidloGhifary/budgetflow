import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate-request";
import { aiChatController } from "./ai.controller";
import { aiChatSchema } from "./ai.validators";

export const aiRouter = Router();

aiRouter.use(requireAuth);
aiRouter.post("/chat", validateBody(aiChatSchema), aiChatController);
