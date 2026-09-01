import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import * as v from "../../validators/notification.validator.js";
export const studentNotificationRouter = Router();
studentNotificationRouter
  .get(
    "/notifications/me",
    validate(v.studentListNotifications),
    c.studentNotificationController.mine,
  )
  .get("/notifications/unread-count", c.studentNotificationController.unread)
  .get(
    "/notifications/:notificationId",
    validate(v.notificationId),
    c.studentNotificationController.detail,
  )
  .patch(
    "/notifications/:notificationId/read",
    validate(v.notificationId),
    c.studentNotificationController.read,
  );
