import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import { getDashboardSummary } from "./dashboard.service";
import type { DashboardSummaryQueryInput } from "./dashboard.validators";

export const getDashboardSummaryController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const summary = await getDashboardSummary(userId, req.query as DashboardSummaryQueryInput);

  return sendSuccess(res, {
    message: "Dashboard summary retrieved",
    data: { summary }
  });
});
