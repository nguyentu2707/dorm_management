import { Router } from "express";
import { container } from "../config/container.js";
import { validate } from "../middlewares/validate.js";
import {
  paymentListSchema,
  paymentIdSchema,
  paymentActionSchema,
  paymentReasonSchema,
  paymentSubmitSchema,
} from "../validators/payment.validator.js";
const c = container.paymentController;
export const studentPaymentRouter = Router();
studentPaymentRouter.post(
  "/invoices/:invoiceId/payments",
  validate(paymentSubmitSchema),
  c.submit,
);
studentPaymentRouter.get("/payments/me", validate(paymentListSchema), c.mine);
studentPaymentRouter.get(
  "/payments/:paymentId",
  validate(paymentIdSchema),
  c.own,
);
studentPaymentRouter.patch(
  "/payments/:paymentId/cancel",
  validate(paymentActionSchema),
  c.cancel,
);
export const adminPaymentRouter = Router();
adminPaymentRouter.get("/payments", validate(paymentListSchema), c.list);
adminPaymentRouter.get(
  "/payments/:paymentId",
  validate(paymentIdSchema),
  c.get,
);
adminPaymentRouter.patch(
  "/payments/:paymentId/confirm",
  validate(paymentActionSchema),
  c.confirm,
);
adminPaymentRouter.patch(
  "/payments/:paymentId/reject",
  validate(paymentReasonSchema),
  c.reject,
);
adminPaymentRouter.patch(
  "/payments/:paymentId/void",
  validate(paymentReasonSchema),
  c.void,
);
