import type { RequestHandler } from "express";
import type { AuthRequest } from "../types/common.types.js";
import type { ITokenService } from "../services/token.service.js";
import { AppError } from "../errors/AppError.js";
import type { IUserRepository } from "../repositories/interfaces/user.repository.interface.js";
export const authenticate =
  (tokens: ITokenService, users: IUserRepository): RequestHandler =>
  async (req: AuthRequest, _res, next) => {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer "))
      return next(new AppError(401, "UNAUTHORIZED", "Yêu cầu xác thực"));
    try {
      req.user = tokens.verifyAccessToken(h.slice(7));
      const user = await users.findById(req.user.userId);
      if (!user)
        throw new AppError(401, "UNAUTHORIZED", "Tài khoản không tồn tại");
      if (user.status !== "ACTIVE")
        throw new AppError(403, "FORBIDDEN", "Tài khoản đã bị khóa");
      req.user = { userId: user.id, role: user.role };
      next();
    } catch (e) {
      next(e);
    }
  };
