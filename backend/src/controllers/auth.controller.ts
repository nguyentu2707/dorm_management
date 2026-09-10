import type { RequestHandler } from "express";
import type { AuthRequest } from "../types/common.types.js";
import type { AuthService, RegisterInput } from "../services/auth.service.js";
const REFRESH_COOKIE = "dormitory_refresh";
const cookieToken = (header?: string) =>
  header
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === REFRESH_COOKIE)
    ?.slice(1)
    .join("=");
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
};
export class AuthController {
  constructor(private service: AuthService) {}
  private metadata(req: Parameters<RequestHandler>[0]) {
    return { userAgent: req.get("user-agent") };
  }
  private sendAuth(
    res: Parameters<RequestHandler>[1],
    result: {
      accessToken: string;
      refreshToken: string;
      refreshExpiresAt: Date;
      user?: unknown;
    },
  ) {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...cookieOptions,
      expires: result.refreshExpiresAt,
    });
    const { refreshToken: _token, refreshExpiresAt: _expiry, ...publicData } = result;
    return publicData;
  }
  register: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        data: this.sendAuth(
          res,
          await this.service.register(
            req.body as RegisterInput,
            this.metadata(req),
          ),
        ),
      });
    } catch (e) {
      next(e);
    }
  };
  login: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Đăng nhập thành công",
        data: this.sendAuth(
          res,
          await this.service.login(
            req.body.username,
            req.body.password,
            this.metadata(req),
          ),
        ),
      });
    } catch (e) {
      next(e);
    }
  };
  refresh: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Làm mới token thành công",
        data: this.sendAuth(
          res,
          await this.service.refresh(
            req.body.refreshToken ?? cookieToken(req.headers.cookie),
            this.metadata(req),
          ),
        ),
      });
    } catch (e) {
      next(e);
    }
  };
  logout: RequestHandler = async (req, res, next) => {
    try {
      const data = await this.service.logout(
        req.body?.refreshToken ?? cookieToken(req.headers.cookie),
      );
      res.clearCookie(REFRESH_COOKIE, cookieOptions);
      res.json({ success: true, message: "Đăng xuất thành công", data });
    } catch (error) {
      next(error);
    }
  };
  logoutAll: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      const data = await this.service.logoutAll(req.user!.userId);
      res.clearCookie(REFRESH_COOKIE, cookieOptions);
      res.json({ success: true, message: "Đã thu hồi tất cả phiên", data });
    } catch (error) {
      next(error);
    }
  };
  me: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Lấy thông tin tài khoản thành công",
        data: await this.service.me(req.user!.userId),
      });
    } catch (e) {
      next(e);
    }
  };
}
