import type { RequestHandler } from "express";
import type { AuthRequest } from "../../types/common.types.js";
import type { StudentProfileService } from "../../services/student-profile.service.js";

export class StudentProfileController {
  constructor(private service: StudentProfileService) {}

  get: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Thông tin hồ sơ sinh viên",
        data: await this.service.getProfile(req.user!.userId),
      });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Cập nhật hồ sơ thành công",
        data: await this.service.updateProfile(req.user!.userId, req.body),
      });
    } catch (error) {
      next(error);
    }
  };
  changePassword: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Đổi mật khẩu thành công",
        data: await this.service.changePassword(
          req.user!.userId,
          req.body.currentPassword,
          req.body.newPassword,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
}
