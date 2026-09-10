import { z } from "zod";

const optionalText = (max: number) =>
  z.union([z.literal(""), z.string().trim().max(max)]).optional();

export const updateStudentProfileSchema = z.object({
  body: z
    .object({
      email: z.union([z.literal(""), z.email("Email không hợp lệ")]).optional(),
      fullName: z.string().trim().min(2).max(100).optional(),
      dob: z.coerce.date().optional(),
      phone: optionalText(20),
      permanentAddress: optionalText(300),
      emergencyContactName: optionalText(100),
      emergencyContactPhone: optionalText(20),
    })
    .strip(),
  params: z.any(),
  query: z.any(),
});
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6).max(100),
  }),
  params: z.any(),
  query: z.any(),
});
