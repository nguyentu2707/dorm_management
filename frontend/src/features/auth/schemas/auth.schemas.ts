import { z } from "zod";
export const loginSchema = z.object({
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
export const registerSchema = z.object({
  username: z.string().trim().min(4, "Tối thiểu 4 ký tự").max(20),
  password: z.string().min(6, "Tối thiểu 6 ký tự").max(100),
  mssv: z.string().trim().min(1, "Vui lòng nhập MSSV"),
  email: z.email("Email không hợp lệ"),
  confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Mật khẩu xác nhận không khớp",
});
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
