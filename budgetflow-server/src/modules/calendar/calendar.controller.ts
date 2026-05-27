import { sendSuccess } from "../../utils/api-response";
import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import {
  getUserCalendarDayDetail,
  getUserCalendarSummary
} from "./calendar.service";
import type {
  CalendarDayDetailQueryInput,
  CalendarSummaryQueryInput
} from "./calendar.validators";

export const getCalendarSummary = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const calendar = await getUserCalendarSummary(userId, req.query as unknown as CalendarSummaryQueryInput);

  return sendSuccess(res, {
    message: "Calendar summary retrieved",
    data: { calendar }
  });
});

export const getCalendarDayDetail = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const day = await getUserCalendarDayDetail(userId, req.query as unknown as CalendarDayDetailQueryInput);

  return sendSuccess(res, {
    message: "Calendar day detail retrieved",
    data: { day }
  });
});
