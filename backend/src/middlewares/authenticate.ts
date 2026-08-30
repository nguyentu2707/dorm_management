import type { RequestHandler } from "express";
import type { AuthRequest } from "../types/common.types.js";
import type { ITokenService } from "../services/token.service.js";
import { AppError } from "../errors/AppError.js";
export const authenticate =
  (tokens: ITokenService): RequestHandler =>
  (req: AuthRequest, _res, next) => {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer "))
      return next(new AppError(401, "UNAUTHORIZED", "Yêu cầu xác thực"));
    try {
      req.user = tokens.verifyAccessToken(h.slice(7));
      next();
    } catch (e) {
      next(e);
    }
  };
