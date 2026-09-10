import type { RequestHandler } from "express";
import type { StudentFacilityService } from "../../services/student-facility.service.js";
import type { AuthRequest } from "../../types/common.types.js";

export class StudentFacilityController {
  constructor(private service: StudentFacilityService) {}

  buildings: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Danh sách tòa nhà",
        data: await this.service.getBuildings(req.user!.userId),
      });
    } catch (error) {
      next(error);
    }
  };

  rooms: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Danh sách phòng còn chỗ",
        data: await this.service.getRooms(req.user!.userId, req.params.buildingId!),
      });
    } catch (error) {
      next(error);
    }
  };

  room: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Thông tin phòng",
        data: await this.service.getRoom(req.params.roomId!),
      });
    } catch (error) {
      next(error);
    }
  };

  beds: RequestHandler = async (req: AuthRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: "Danh sách giường trống",
        data: await this.service.getEmptyBeds(req.user!.userId, req.params.roomId!),
      });
    } catch (error) {
      next(error);
    }
  };
}
