import { Router } from "express";
import { container } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import * as v from "../../validators/student/personalization.validator.js";
export const studentPersonalizationRouter = Router();
studentPersonalizationRouter
  .get("/room-preference/me", container.studentPersonalizationController.preference)
  .put("/room-preference/me", validate(v.preferencePut), container.studentPersonalizationController.putPreference)
  .delete("/room-preference/me", container.studentPersonalizationController.deletePreference)
  .get("/class-schedule/me", container.studentPersonalizationController.schedule)
  .put("/class-schedule/me", validate(v.schedulePut), container.studentPersonalizationController.putSchedule)
  .delete("/class-schedule/me", container.studentPersonalizationController.deleteSchedule)
  .get("/room-recommendations", validate(v.recommendationQuery), container.studentPersonalizationController.recommend);
