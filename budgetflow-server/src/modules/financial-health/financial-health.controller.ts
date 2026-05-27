import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import { getUserFinancialHealth } from "./financial-health.service";
import type { FinancialHealthQueryInput } from "./financial-health.validators";

export const getFinancialHealthController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const financialHealth = await getUserFinancialHealth(userId, req.query as FinancialHealthQueryInput);

  return sendSuccess(res, {
    message: "Financial health retrieved",
    data: { financialHealth }
  });
});
