import type { RequestHandler } from "express";
import type { AuthRequest, Role } from "../types/common.types.js";
import { AppError } from "../errors/AppError.js";
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req: AuthRequest, _res, next) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, "FORBIDDEN", "Bạn không có quyền truy cập"));
