import { asyncHandler } from "../../utils/async-handler";
import { getAuthenticatedUserId } from "../../utils/auth-context";
import { sendSuccess } from "../../utils/api-response";
import {
  archiveUserNotification,
  getUserUnreadNotificationCount,
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead
} from "./notification.service";
import type { NotificationQueryInput } from "./notification.validators";

export const getNotifications = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await listUserNotifications(userId, req.query as unknown as NotificationQueryInput);

  return sendSuccess(res, {
    message: "Notifications retrieved",
    data: result
  });
});

export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await getUserUnreadNotificationCount(userId);

  return sendSuccess(res, {
    message: "Unread notification count retrieved",
    data: result
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const notification = await markUserNotificationRead(userId, req.params.id);

  return sendSuccess(res, {
    message: "Notification marked as read",
    data: { notification }
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await markAllUserNotificationsRead(userId);

  return sendSuccess(res, {
    message: "Notifications marked as read",
    data: result
  });
});

export const archiveNotification = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const result = await archiveUserNotification(userId, req.params.id);

  return sendSuccess(res, {
    message: "Notification archived",
    data: result
  });
});
