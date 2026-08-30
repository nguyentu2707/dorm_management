import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  createRoomChangeRequestSchema,
  cancelRoomChangeRequestSchema,
} from "../../validators/student/room-change-request.validator.js";
export const studentRoomChangeRouter = Router();
studentRoomChangeRouter.post(
  "/room-change-requests",
  validate(createRoomChangeRequestSchema),
  c.studentRoomChangeRequestController.create,
);
studentRoomChangeRouter.get(
  "/room-change-requests/me",
  c.studentRoomChangeRequestController.mine,
);
studentRoomChangeRouter.patch(
  "/room-change-requests/:requestId/cancel",
  validate(cancelRoomChangeRequestSchema),
  c.studentRoomChangeRequestController.cancel,
);
