import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import * as v from "../../validators/maintenance-request.validator.js";
export const adminMaintenanceRouter = Router();
adminMaintenanceRouter.get(
  "/maintenance-staff",
  c.adminMaintenanceRequestController.staff,
);
adminMaintenanceRouter
  .get(
    "/maintenance-requests",
    validate(v.listMaintenance),
    c.adminMaintenanceRequestController.list,
  )
  .get(
    "/maintenance-requests/:id",
    validate(v.maintenanceId),
    c.adminMaintenanceRequestController.detail,
  )
  .patch(
    "/maintenance-requests/:id/assign",
    validate(v.assignMaintenance),
    c.adminMaintenanceRequestController.assign,
  )
  .patch(
    "/maintenance-requests/:id/resolve",
    validate(v.resolveMaintenance),
    c.adminMaintenanceRequestController.resolve,
  )
  .patch(
    "/maintenance-requests/:id/cancel",
    validate(v.cancelMaintenance),
    c.adminMaintenanceRequestController.cancel,
  );
