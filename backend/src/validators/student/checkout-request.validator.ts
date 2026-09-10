import { z } from "zod";
const id = z.string().uuid("INVALID_ID");
const wrap = (body: z.ZodType = z.any(), params: z.ZodType = z.any()) =>
  z.object({ body, params, query: z.any() });
export const createCheckoutSchema = wrap(
  z.object({ reason: z.string().trim().max(1000).optional() }).strict(),
);
export const checkoutIdSchema = wrap(z.any(), z.object({ requestId: id }));
