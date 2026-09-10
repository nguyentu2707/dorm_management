import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import * as v from "../../validators/admin/student-registry.validator.js";
export const adminStudentRegistryRouter = Router();
adminStudentRegistryRouter
  .get("/student-registry", validate(v.registryList), c.studentRegistryController.list)
  .post("/student-registry", validate(v.registryCreate), c.studentRegistryController.create)
  .get("/student-registry/:registryId", validate(v.registryId), c.studentRegistryController.get)
  .patch("/student-registry/:registryId", validate(v.registryUpdate), c.studentRegistryController.update)
  .patch("/student-registry/:registryId/status", validate(v.registryAvailability), c.studentRegistryController.availability);
