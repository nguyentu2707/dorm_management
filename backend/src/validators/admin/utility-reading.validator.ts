import { z } from "zod";
const id = z.string().uuid("INVALID_ID"),
  period = z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "INVALID_BILLING_PERIOD"),
  number = z.coerce.number().finite().nonnegative();
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });
export const createUtilitySchema = wrap(
  z
    .object({
      roomId: id,
      billingPeriod: period,
      electricityPrevious: number,
      electricityCurrent: number,
      electricityUnitPrice: number,
      waterPrevious: number,
      waterCurrent: number,
      waterUnitPrice: number,
    })
    .strict(),
);
export const updateUtilitySchema = wrap(
  z
    .object({
      electricityPrevious: number.optional(),
      electricityCurrent: number.optional(),
      electricityUnitPrice: number.optional(),
      waterPrevious: number.optional(),
      waterCurrent: number.optional(),
      waterUnitPrice: number.optional(),
    })
    .strict()
    .refine((x) => Object.keys(x).length > 0, "EMPTY_UPDATE"),
  z.object({ readingId: id }),
);
export const utilityIdSchema = wrap(z.any(), z.object({ readingId: id }));
export const utilityListSchema = wrap(
  z.any(),
  z.any(),
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    billingPeriod: period.optional(),
    buildingId: id.optional(),
    roomId: id.optional(),
  }),
);
