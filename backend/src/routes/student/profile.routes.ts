import { Router } from "express";
import { container } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import { updateStudentProfileSchema } from "../../validators/student/profile.validator.js";

export const studentProfileRouter = Router();
studentProfileRouter.get("/profile", container.studentProfileController.get);
studentProfileRouter.patch(
  "/profile",
  validate(updateStudentProfileSchema),
  container.studentProfileController.update,
);
