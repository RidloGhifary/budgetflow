import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import { answerDashboardQuestion } from "./ai.service";
import type { AiChatInput } from "./ai.validators";

export const aiChatController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await answerDashboardQuestion(userId, req.body as AiChatInput);

  return sendSuccess(res, {
    message: "AI dashboard analysis ready",
    data: result
  });
});
