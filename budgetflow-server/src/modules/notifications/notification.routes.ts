import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate-request";
import {
  archiveNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead
} from "./notification.controller";
import { notificationQuerySchema } from "./notification.validators";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get("/", validateQuery(notificationQuerySchema), getNotifications);
notificationRouter.get("/unread-count", getUnreadNotificationCount);
notificationRouter.patch("/read-all", markAllNotificationsRead);
notificationRouter.patch("/:id/read", markNotificationRead);
notificationRouter.patch("/:id/archive", archiveNotification);
