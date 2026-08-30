import { z } from "zod";
const id = z.string().regex(/^[a-f\d]{24}$/i, "INVALID_ID");
const wrap = (body: z.ZodType = z.any(), params: z.ZodType = z.any()) =>
  z.object({ body, params, query: z.any() });
export const createRoomChangeRequestSchema = wrap(
  z.object({ targetBedId: id, reason: z.string().trim().max(500).optional() }),
);
export const cancelRoomChangeRequestSchema = wrap(
  z.any(),
  z.object({ requestId: id }),
);
