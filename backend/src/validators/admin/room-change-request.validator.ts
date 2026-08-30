import { z } from "zod";
import { ROOM_CHANGE_STATUSES } from "../../models/room-change-request.model.js";
const id = z.string().regex(/^[a-f\d]{24}$/i, "INVALID_ID");
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });
export const requestIdSchema = wrap(z.any(), z.object({ requestId: id }));
export const rejectRoomChangeRequestSchema = wrap(
  z.object({ reason: z.string().trim().max(500).optional() }),
  z.object({ requestId: id }),
);
export const roomChangeListSchema = wrap(
  z.any(),
  z.any(),
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(ROOM_CHANGE_STATUSES).optional(),
    studentId: id.optional(),
  }),
);
