import { z } from "zod";
import { CHECKOUT_REQUEST_STATUSES } from "../../models/checkout-request.model.js";
const id = z.string().uuid("INVALID_ID");
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });
export const checkoutIdSchema = wrap(z.any(), z.object({ requestId: id }));
export const rejectCheckoutSchema = wrap(
  z.object({ rejectReason: z.string().trim().max(1000).optional() }),
  z.object({ requestId: id }),
);
export const checkoutListSchema = wrap(
  z.any(),
  z.any(),
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(CHECKOUT_REQUEST_STATUSES).optional(),
  }),
);
