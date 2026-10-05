import { z } from "zod";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "../../models/audit-log.model.js";
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });
export const auditList = wrap(
  z.any(),
  z.any(),
  z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      action: z.enum(AUDIT_ACTIONS).optional(),
      entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
      entityId: z.string().trim().min(1).max(200).optional(),
      actorUserId: z.string().uuid().optional(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
    })
    .refine((q) => !q.dateFrom || !q.dateTo || q.dateFrom <= q.dateTo, {
      message: "Khoảng thời gian không hợp lệ",
    }),
);
export const auditId = wrap(z.any(), z.object({ auditId: z.string().uuid() }));
