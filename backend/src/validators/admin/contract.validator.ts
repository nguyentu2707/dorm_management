import { z } from "zod";
import { CONTRACT_STATUSES } from "../../models/contract.model.js";
const id = z.string().uuid("INVALID_ID");
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });
export const contractIdSchema = wrap(z.any(), z.object({ contractId: id }));
export const adminCreateContractSchema = wrap(
  z
    .object({
      studentId: id,
      bedId: id,
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .superRefine((data, ctx) => {
      if (!!data.startDate !== !!data.endDate)
        ctx.addIssue({
          code: "custom",
          path: [data.startDate ? "endDate" : "startDate"],
          message: "startDate và endDate phải được cung cấp cùng nhau.",
        });
      if (data.startDate && data.endDate && data.endDate <= data.startDate)
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "INVALID_DATE_RANGE",
        });
    }),
);
export const rejectContractSchema = wrap(
  z.object({ reason: z.string().trim().max(500).optional() }),
  z.object({ contractId: id }),
);
export const cancelActiveContractSchema = wrap(
  z.object({ reason: z.string().trim().min(1).max(500) }),
  z.object({ contractId: id }),
);
export const contractListSchema = wrap(
  z.any(),
  z.any(),
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(CONTRACT_STATUSES).optional(),
    studentId: id.optional(),
    roomId: id.optional(),
    buildingId: id.optional(),
    sortBy: z.enum(["createdAt", "startDate", "endDate"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
);
