import { Router } from "express";
import { container } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  studentBuildingIdSchema,
  studentRoomIdSchema,
} from "../../validators/student/facility.validator.js";

export const studentFacilityRouter = Router();
studentFacilityRouter.get(
  "/buildings",
  container.studentFacilityController.buildings,
);
studentFacilityRouter.get(
  "/buildings/:buildingId/rooms",
  validate(studentBuildingIdSchema),
  container.studentFacilityController.rooms,
);
studentFacilityRouter.get(
  "/rooms/:roomId",
  validate(studentRoomIdSchema),
  container.studentFacilityController.room,
);
studentFacilityRouter.get(
  "/rooms/:roomId/beds",
  validate(studentRoomIdSchema),
  container.studentFacilityController.beds,
);
