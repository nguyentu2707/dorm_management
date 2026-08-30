import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  adminCreateContractSchema,
  cancelActiveContractSchema,
  contractIdSchema,
  contractListSchema,
  rejectContractSchema,
} from "../../validators/admin/contract.validator.js";
export const adminContractRouter = Router();
adminContractRouter.get(
  "/contracts",
  validate(contractListSchema),
  c.adminContractController.list,
);
adminContractRouter.get(
  "/contracts/:contractId",
  validate(contractIdSchema),
  c.adminContractController.get,
);
adminContractRouter.post(
  "/contracts",
  validate(adminCreateContractSchema),
  c.adminContractController.create,
);
adminContractRouter.patch(
  "/contracts/:contractId/approve",
  validate(contractIdSchema),
  c.adminContractController.approve,
);
adminContractRouter.patch(
  "/contracts/:contractId/reject",
  validate(rejectContractSchema),
  c.adminContractController.reject,
);
adminContractRouter.patch(
  "/contracts/:contractId/end",
  validate(contractIdSchema),
  c.adminContractController.end,
);
adminContractRouter.patch(
  "/contracts/:contractId/cancel",
  validate(cancelActiveContractSchema),
  c.adminContractController.cancel,
);
