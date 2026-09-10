import { Router } from "express";
import { container } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import {
  billingIdSchema,
  billingListSchema,
  cancelBillingSchema,
  saveBillingDraftSchema,
} from "../../validators/admin/monthly-billing.validator.js";

export const adminMonthlyBillingRouter = Router();
adminMonthlyBillingRouter.get(
  "/monthly-billings",
  validate(billingListSchema),
  container.adminMonthlyBillingController.list,
);
adminMonthlyBillingRouter.get(
  "/monthly-billings/:billingId",
  validate(billingIdSchema),
  container.adminMonthlyBillingController.get,
);
adminMonthlyBillingRouter.put(
  "/monthly-billings/draft",
  validate(saveBillingDraftSchema),
  container.adminMonthlyBillingController.saveDraft,
);
adminMonthlyBillingRouter.post(
  "/monthly-billings/:billingId/preview",
  validate(billingIdSchema),
  container.adminMonthlyBillingController.preview,
);
adminMonthlyBillingRouter.post(
  "/monthly-billings/:billingId/finalize",
  validate(billingIdSchema),
  container.adminMonthlyBillingController.finalize,
);
adminMonthlyBillingRouter.patch(
  "/monthly-billings/:billingId/cancel",
  validate(cancelBillingSchema),
  container.adminMonthlyBillingController.cancel,
);
