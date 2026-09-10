import { z } from "zod";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_DAMAGE_CAUSES,
  MAINTENANCE_RESOLUTION_METHODS,
  MAINTENANCE_STATUSES,
} from "../models/maintenance-request.model.js";
const id = z.string().uuid("INVALID_ID"),
  empty = z.object({});
const wrap = (
  body: z.ZodType = empty,
  params: z.ZodType = empty,
  query: z.ZodType = empty,
) => z.object({ body, params, query });
export const createMaintenance = wrap(
  z
    .object({
      category: z.enum(MAINTENANCE_CATEGORIES),
      description: z.string().trim().min(1).max(2000),
      equipmentItemId: id.optional(),
    })
    .strict(),
);
export const maintenanceId = wrap(empty, z.object({ id }));
export const cancelMaintenance = wrap(
  z.object({ reason: z.string().trim().max(500).optional() }),
  z.object({ id }),
);
export const assignMaintenance = wrap(
  z.object({ staffId: id }),
  z.object({ id }),
);
export const resolveMaintenance = wrap(
  z
    .object({
      resolutionMethod: z.enum(MAINTENANCE_RESOLUTION_METHODS),
      damageCause: z.enum(MAINTENANCE_DAMAGE_CAUSES),
      damageCauseDetail: z.string().trim().max(1000).optional(),
      resolutionReason: z.string().trim().min(1).max(2000),
      resolutionCost: z.coerce.number().finite().min(0).max(1_000_000_000),
      resolutionNote: z.string().trim().max(2000).optional(),
    })
    .strict()
    .superRefine((value, context) => {
      if (value.damageCause === "OTHER" && !value.damageCauseDetail) {
        context.addIssue({
          code: "custom",
          path: ["damageCauseDetail"],
          message: "DAMAGE_CAUSE_DETAIL_REQUIRED",
        });
      }
    }),
  z.object({ id }),
);
export const listMaintenance = wrap(
  empty,
  empty,
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(MAINTENANCE_STATUSES).optional(),
    roomId: id.optional(),
    buildingId: id.optional(),
    category: z.enum(MAINTENANCE_CATEGORIES).optional(),
    assignedStaffId: id.optional(),
  }),
);
