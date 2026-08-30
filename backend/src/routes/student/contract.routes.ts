import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  createContractSchema,
  cancelContractSchema,
} from "../../validators/student/contract.validator.js";
export const studentContractRouter = Router();
studentContractRouter.post(
  "/contracts",
  validate(createContractSchema),
  c.studentContractController.create,
);
studentContractRouter.get("/contracts/me", c.studentContractController.mine);
studentContractRouter.get(
  "/contracts/me/active",
  c.studentContractController.active,
);
studentContractRouter.patch(
  "/contracts/:contractId/cancel",
  validate(cancelContractSchema),
  c.studentContractController.cancel,
);
