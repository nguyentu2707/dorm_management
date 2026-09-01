import type { RequestHandler } from "express";
import type { AdminStudentService } from "../../services/admin/student.service.js";
import { paginationFrom } from "../../types/common.types.js";

export class AdminStudentController {
  constructor(private service: AdminStudentService) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const pagination = paginationFrom(
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20,
      );
      res.json({
        success: true,
        message: "Danh sách sinh viên",
        data: await this.service.list({
          ...pagination,
          search: req.query.search as string | undefined,
          faculty: req.query.faculty as string | undefined,
          gender: req.query.gender as "MALE" | "FEMALE" | "OTHER" | undefined,
        }),
      });
    } catch (error) {
      next(error);
    }
  };

  get: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Chi tiết sinh viên",
        data: await this.service.get(req.params.studentId!),
      });
    } catch (error) {
      next(error);
    }
  };
}
