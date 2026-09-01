import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  email: z.union([z.literal(""), z.email("Email không hợp lệ")]).optional(),
  phone: z.string().trim().max(20).optional(),
  permanentAddress: z.string().trim().max(300).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
});

export type ProfileForm = z.infer<typeof profileSchema>;
