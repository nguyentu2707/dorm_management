import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  checkoutIdSchema,
  checkoutListSchema,
  rejectCheckoutSchema,
} from "../../validators/admin/checkout-request.validator.js";
export const adminCheckoutRouter = Router();
adminCheckoutRouter.get(
  "/checkout-requests",
  validate(checkoutListSchema),
  c.adminCheckoutRequestController.list,
);
adminCheckoutRouter.get(
  "/checkout-requests/:requestId",
  validate(checkoutIdSchema),
  c.adminCheckoutRequestController.get,
);
adminCheckoutRouter.patch(
  "/checkout-requests/:requestId/approve",
  validate(checkoutIdSchema),
  c.adminCheckoutRequestController.approve,
);
adminCheckoutRouter.patch(
  "/checkout-requests/:requestId/reject",
  validate(rejectCheckoutSchema),
  c.adminCheckoutRequestController.reject,
);
