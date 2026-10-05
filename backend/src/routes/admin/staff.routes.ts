import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import * as v from "../../validators/admin/staff.validator.js";
export const adminStaffRouter = Router();
adminStaffRouter
  .get("/staff", validate(v.staffList), c.staffController.list)
  .get("/staff/:staffId", validate(v.staffId), c.staffController.get)
  .post("/staff", validate(v.staffCreate), c.staffController.create)
  .patch("/staff/:staffId", validate(v.staffUpdate), c.staffController.update)
  .patch(
    "/staff/:staffId/status",
    validate(v.staffStatus),
    c.staffController.status,
  );
