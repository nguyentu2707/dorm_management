import { z } from "zod";
const body = (s: z.ZodType) =>
  z.object({ body: s, params: z.any(), query: z.any() });
export const registerSchema = body(
  z
    .object({
      username: z.string().trim().min(4).max(20),
      password: z.string().min(6).max(100),
      fullName: z.string().trim().min(1).max(100),
      mssv: z.string().trim().min(1),
      email: z.email().optional(),
    })
    .strip(),
);
export const loginSchema = body(
  z.object({ username: z.string().min(1), password: z.string().min(1) }),
);
export const refreshSchema = body(
  z.object({ refreshToken: z.string().min(1) }),
);
