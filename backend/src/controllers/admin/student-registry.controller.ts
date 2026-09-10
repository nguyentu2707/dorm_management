import type { RequestHandler } from "express";
import type { StudentRegistryService } from "../../services/admin/student-registry.service.js";
import { paginationFrom } from "../../types/common.types.js";

export class StudentRegistryController {
  constructor(private service: StudentRegistryService) {}
  list: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Danh sách xác minh sinh viên",
        data: await this.service.list({
          ...paginationFrom(Number(req.query.page) || 1, Number(req.query.limit) || 20),
          search: req.query.search as string | undefined,
          status: req.query.status as never,
          gender: req.query.gender as never,
        }),
      });
    } catch (error) { next(error); }
  };
  get: RequestHandler = async (req, res, next) => {
    try {
      res.json({ success: true, message: "Chi tiết hồ sơ xác minh", data: await this.service.get(req.params.registryId!) });
    } catch (error) { next(error); }
  };
  create: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({ success: true, message: "Tạo hồ sơ xác minh thành công", data: await this.service.create(req.body) });
    } catch (error) { next(error); }
  };
  update: RequestHandler = async (req, res, next) => {
    try {
      res.json({ success: true, message: "Cập nhật hồ sơ xác minh thành công", data: await this.service.update(req.params.registryId!, req.body) });
    } catch (error) { next(error); }
  };
  availability: RequestHandler = async (req, res, next) => {
    try {
      res.json({ success: true, message: "Cập nhật trạng thái hồ sơ thành công", data: await this.service.setAvailability(req.params.registryId!, req.body.status) });
    } catch (error) { next(error); }
  };
}
