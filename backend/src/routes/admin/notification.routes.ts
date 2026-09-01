import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import * as v from "../../validators/notification.validator.js";
export const adminNotificationRouter = Router();
adminNotificationRouter
  .post(
    "/notifications",
    validate(v.createNotification),
    c.adminNotificationController.create,
  )
  .get(
    "/notifications",
    validate(v.adminListNotifications),
    c.adminNotificationController.list,
  )
  .get(
    "/notifications/:notificationId",
    validate(v.notificationId),
    c.adminNotificationController.detail,
  );
