import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import * as v from "../../validators/maintenance-request.validator.js";
export const studentMaintenanceRouter = Router();
studentMaintenanceRouter
  .get("/rooms/me/equipment", c.studentMaintenanceRequestController.equipment)
  .post(
    "/maintenance-requests",
    validate(v.createMaintenance),
    c.studentMaintenanceRequestController.create,
  )
  .get("/maintenance-requests/me", c.studentMaintenanceRequestController.mine)
  .patch(
    "/maintenance-requests/:id/cancel",
    validate(v.cancelMaintenance),
    c.studentMaintenanceRequestController.cancel,
  );
