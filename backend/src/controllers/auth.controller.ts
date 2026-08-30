import type { RequestHandler } from "express";
import type { AuthRequest } from "../types/common.types.js";
import type { AuthService, RegisterInput } from "../services/auth.service.js";
export class AuthController {
  constructor(private service: AuthService) {}
  register: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        data: await this.service.register(req.body as RegisterInput),
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
        data: await this.service.login(req.body.username, req.body.password),
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
        data: this.service.refresh(req.body.refreshToken),
      });
    } catch (e) {
      next(e);
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
