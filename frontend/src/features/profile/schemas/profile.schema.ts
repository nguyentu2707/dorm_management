import { z } from "zod";

export const profileSchema = z.object({
  email: z.union([z.literal(""), z.email("Email không hợp lệ")]).optional(),
  phone: z.string().trim().max(20).optional(),
  permanentAddress: z.string().trim().max(300).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
});

export type ProfileForm = z.infer<typeof profileSchema>;
