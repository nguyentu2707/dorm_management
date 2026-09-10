import { Router } from "express";
import { container } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  myInvoiceIdSchema,
  myInvoiceListSchema,
} from "../../validators/student/invoice.validator.js";

export const studentInvoiceRouter = Router();
studentInvoiceRouter.get(
  "/invoices/me",
  validate(myInvoiceListSchema),
  container.studentInvoiceController.list,
);
studentInvoiceRouter.get(
  "/invoices/:invoiceId",
  validate(myInvoiceIdSchema),
  container.studentInvoiceController.get,
);
