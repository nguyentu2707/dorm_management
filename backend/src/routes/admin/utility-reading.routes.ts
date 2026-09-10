import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  utilityIdSchema,
  utilityListSchema,
} from "../../validators/admin/utility-reading.validator.js";
export const adminUtilityReadingRouter = Router();
adminUtilityReadingRouter.get(
  "/utility-readings",
  validate(utilityListSchema),
  c.adminUtilityReadingController.list,
);
adminUtilityReadingRouter.get(
  "/utility-readings/:readingId",
  validate(utilityIdSchema),
  c.adminUtilityReadingController.get,
);
