import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import { getAuditRequestContext } from "../audit-logs/audit-log.context";
import { getUserPreferences, updateUserPrivacyMode } from "./preference.service";
import type { UpdatePrivacyModeInput } from "./preference.validators";

export const getPreferences = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const preferences = await getUserPreferences(userId);

  return sendSuccess(res, {
    message: "Preferences retrieved",
    data: { preferences }
  });
});

export const updatePrivacyMode = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const preferences = await updateUserPrivacyMode(userId, req.body as UpdatePrivacyModeInput, getAuditRequestContext(req));

  return sendSuccess(res, {
    message: "Privacy mode updated",
    data: { preferences }
  });
});
