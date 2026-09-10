import { z } from "zod";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../types/common.types.js";
import { AppError } from "../errors/AppError.js";
export interface TokenPayload {
  userId: string;
  role: Role;
}
export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}
export interface ITokenService {
  generateAccessToken(p: TokenPayload): string;
  generateRefreshToken(
    userId: string,
    sessionId: string,
  ): { token: string; expiresAt: Date };
  verifyAccessToken(t: string): TokenPayload;
  verifyRefreshToken(t: string): RefreshTokenPayload;
}
export class JwtTokenService implements ITokenService {
  private sign(p: object, secret: string, expires: string) {
    return jwt.sign(p, secret, {
      expiresIn: expires as SignOptions["expiresIn"],
    });
  }
  generateAccessToken(p: TokenPayload) {
    return this.sign(
      { sub: p.userId, role: p.role, type: "access" },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN,
    );
  }
  generateRefreshToken(userId: string, sessionId: string) {
    const token = this.sign(
      { sub: userId, sid: sessionId, type: "refresh" },
      env.JWT_REFRESH_SECRET,
      env.JWT_REFRESH_EXPIRES_IN,
    );
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === "string" || !decoded.exp)
      throw new Error("Refresh token expiry was not generated");
    return { token, expiresAt: new Date(decoded.exp * 1000) };
  }
  private verify(t: string, s: string) {
    try {
      return jwt.verify(t, s);
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError)
        throw new AppError(401, "TOKEN_EXPIRED", "Token đã hết hạn");
      throw new AppError(401, "INVALID_TOKEN", "Token không hợp lệ");
    }
  }
  verifyAccessToken(t: string) {
    try {
      const payload = z
        .object({
          sub: z.uuid(),
          role: z.enum(["STUDENT", "ADMIN", "STAFF"]),
          type: z.literal("access"),
        })
        .parse(this.verify(t, env.JWT_SECRET));
      return { userId: payload.sub, role: payload.role };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(401, "INVALID_TOKEN", "Token không hợp lệ");
    }
  }
  verifyRefreshToken(t: string) {
    try {
      const payload = z
        .object({
          sub: z.uuid(),
          sid: z.uuid(),
          type: z.literal("refresh"),
        })
        .parse(this.verify(t, env.JWT_REFRESH_SECRET));
      return { userId: payload.sub, sessionId: payload.sid };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(401, "INVALID_TOKEN", "Token không hợp lệ");
    }
  }
}
