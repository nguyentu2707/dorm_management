import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../types/common.types.js";
import { AppError } from "../errors/AppError.js";
export interface TokenPayload {
  userId: string;
  role: Role;
}
export interface ITokenService {
  generateAccessToken(p: TokenPayload): string;
  generateRefreshToken(p: TokenPayload): string;
  verifyAccessToken(t: string): TokenPayload;
  verifyRefreshToken(t: string): TokenPayload;
}
export class JwtTokenService implements ITokenService {
  private sign(p: TokenPayload, secret: string, expires: string) {
    return jwt.sign(p, secret, {
      expiresIn: expires as SignOptions["expiresIn"],
    });
  }
  generateAccessToken(p: TokenPayload) {
    return this.sign(p, env.JWT_SECRET, env.JWT_EXPIRES_IN);
  }
  generateRefreshToken(p: TokenPayload) {
    return this.sign(p, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);
  }
  private verify(t: string, s: string) {
    try {
      return jwt.verify(t, s) as TokenPayload;
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError)
        throw new AppError(401, "TOKEN_EXPIRED", "Token đã hết hạn");
      throw new AppError(401, "INVALID_TOKEN", "Token không hợp lệ");
    }
  }
  verifyAccessToken(t: string) {
    return this.verify(t, env.JWT_SECRET);
  }
  verifyRefreshToken(t: string) {
    return this.verify(t, env.JWT_REFRESH_SECRET);
  }
}
