import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import * as v from "../../validators/admin/audit-log.validator.js";
export const adminAuditLogRouter = Router();
adminAuditLogRouter
  .get("/audit-logs", validate(v.auditList), c.auditLogController.list)
  .get(
    "/audit-logs/:auditId",
    validate(v.auditId),
    c.auditLogController.detail,
  );
