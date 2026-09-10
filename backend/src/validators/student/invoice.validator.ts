import { z } from "zod";
const id = z.string().uuid("ID không hợp lệ");
const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });
export const myInvoiceListSchema = wrap(
  z.any(),
  z.any(),
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    billingPeriod: period.optional(),
  }),
);
export const myInvoiceIdSchema = wrap(
  z.any(),
  z.object({ invoiceId: id }),
  z.any(),
);
