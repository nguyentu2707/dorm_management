import { z } from "zod";
export const loginSchema = z.object({
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
export const registerSchema = z.object({
  username: z.string().trim().min(4, "Tối thiểu 4 ký tự").max(20),
  password: z.string().min(6, "Tối thiểu 6 ký tự").max(100),
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên").max(100),
  mssv: z.string().trim().min(1, "Vui lòng nhập MSSV"),
  email: z.union([z.literal(""), z.email("Email không hợp lệ")]).optional(),
});
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
