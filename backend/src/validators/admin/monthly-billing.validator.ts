import { z } from "zod";
import { MONTHLY_BILLING_STATUSES } from "../../models/monthly-billing.model.js";

const id = z.string().uuid("ID không hợp lệ");
const period = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Kỳ hóa đơn phải có dạng YYYY-MM");
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });

export const saveBillingDraftSchema = wrap(
  z
    .object({
      roomId: id,
      billingPeriod: period,
      electricityCurrent: z.number().finite().nonnegative(),
      waterCurrent: z.number().finite().nonnegative(),
      electricityPrevious: z.number().finite().nonnegative().optional(),
      waterPrevious: z.number().finite().nonnegative().optional(),
    })
    .strict(),
);
export const billingIdSchema = wrap(
  z.any(),
  z.object({ billingId: id }),
  z.any(),
);
export const cancelBillingSchema = wrap(
  z.object({ reason: z.string().trim().max(1000).optional() }).strict(),
  z.object({ billingId: id }),
  z.any(),
);
export const billingListSchema = wrap(
  z.any(),
  z.any(),
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    billingPeriod: period.optional(),
    buildingId: id.optional(),
    roomId: id.optional(),
    status: z.enum(MONTHLY_BILLING_STATUSES).optional(),
  }),
);
