import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  rejectRoomChangeRequestSchema,
  requestIdSchema,
  roomChangeListSchema,
} from "../../validators/admin/room-change-request.validator.js";
export const adminRoomChangeRouter = Router();
adminRoomChangeRouter.get(
  "/room-change-requests",
  validate(roomChangeListSchema),
  c.adminRoomChangeRequestController.list,
);
adminRoomChangeRouter.get(
  "/room-change-requests/:requestId",
  validate(requestIdSchema),
  c.adminRoomChangeRequestController.get,
);
adminRoomChangeRouter.patch(
  "/room-change-requests/:requestId/approve",
  validate(requestIdSchema),
  c.adminRoomChangeRequestController.approve,
);
adminRoomChangeRouter.patch(
  "/room-change-requests/:requestId/reject",
  validate(rejectRoomChangeRequestSchema),
  c.adminRoomChangeRequestController.reject,
);
