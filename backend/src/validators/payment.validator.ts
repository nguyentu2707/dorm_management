import { z } from "zod";
import { PAYMENT_STATUSES } from "../models/payment.model.js";
const id = z.string().uuid("INVALID_ID");
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });
const paymentParams = z.object({ paymentId: id });
export const paymentListSchema = wrap(
  z.any(),
  z.any(),
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(PAYMENT_STATUSES).optional(),
    billingPeriod: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
    invoiceId: id.optional(),
  }),
);
export const paymentIdSchema = wrap(z.any(), paymentParams);
export const paymentActionSchema = wrap(
  z.object({}).strict().default({}),
  paymentParams,
);
export const paymentReasonSchema = wrap(
  z.object({ reason: z.string().trim().min(1).max(1000) }).strict(),
  paymentParams,
);
export const paymentSubmitSchema = wrap(
  z
    .object({
      amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      method: z.literal("BANK_TRANSFER").default("BANK_TRANSFER"),
      referenceCode: z.string().trim().max(120).optional(),
      note: z.string().trim().max(1000).optional(),
    })
    .strict(),
  z.object({ invoiceId: id }),
);
