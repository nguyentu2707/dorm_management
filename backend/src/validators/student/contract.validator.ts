import { z } from "zod";
const id = z.string().regex(/^[a-f\d]{24}$/i, "INVALID_ID");
const dateRange = z.object({
  bedId: id,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
const wrap = (body: z.ZodType = z.any(), params: z.ZodType = z.any()) =>
  z.object({ body, params, query: z.any() });
export const createContractSchema = wrap(dateRange);
export const cancelContractSchema = wrap(
  z.object({ reason: z.string().trim().max(500).optional() }),
  z.object({ contractId: id }),
);
