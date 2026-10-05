import { z } from "zod";
const id = z.string().uuid("ID không hợp lệ");
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });
const fields = {
  staffCode: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(1).max(150),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+().\s-]+$/, "Số điện thoại không hợp lệ")
    .optional(),
  specialty: z.string().trim().max(150).optional(),
};
export const staffList = wrap(
  z.any(),
  z.any(),
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(150).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  }),
);
export const staffId = wrap(z.any(), z.object({ staffId: id }), z.any());
export const staffCreate = wrap(z.object(fields).strict());
export const staffUpdate = wrap(
  z
    .object(fields)
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "Cần ít nhất một thay đổi",
    )
    .strict(),
  z.object({ staffId: id }),
);
export const staffStatus = wrap(
  z.object({ status: z.enum(["ACTIVE", "INACTIVE"]) }).strict(),
  z.object({ staffId: id }),
);
