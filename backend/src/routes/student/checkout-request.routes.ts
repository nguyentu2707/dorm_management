import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  checkoutIdSchema,
  createCheckoutSchema,
} from "../../validators/student/checkout-request.validator.js";
export const studentCheckoutRouter = Router();
studentCheckoutRouter.post(
  "/checkout-requests",
  validate(createCheckoutSchema),
  c.studentCheckoutRequestController.create,
);
studentCheckoutRouter.get(
  "/checkout-requests/me",
  c.studentCheckoutRequestController.mine,
);
studentCheckoutRouter.patch(
  "/checkout-requests/:requestId/cancel",
  validate(checkoutIdSchema),
  c.studentCheckoutRequestController.cancel,
);
