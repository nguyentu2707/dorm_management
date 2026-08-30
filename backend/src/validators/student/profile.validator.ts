import { z } from "zod";

const optionalText = (max: number) =>
  z.union([z.literal(""), z.string().trim().max(max)]).optional();

export const updateStudentProfileSchema = z.object({
  body: z
    .object({
      email: z.union([z.literal(""), z.email("Email không hợp lệ")]).optional(),
      phone: optionalText(20),
      permanentAddress: optionalText(300),
      emergencyContactName: optionalText(100),
      emergencyContactPhone: optionalText(20),
    })
    .strip(),
  params: z.any(),
  query: z.any(),
});
