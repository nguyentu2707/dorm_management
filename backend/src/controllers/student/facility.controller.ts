import type { RequestHandler } from "express";
import type { StudentFacilityService } from "../../services/student-facility.service.js";

export class StudentFacilityController {
  constructor(private service: StudentFacilityService) {}

  buildings: RequestHandler = async (_req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Danh sách tòa nhà",
        data: await this.service.getBuildings(),
      });
    } catch (error) {
      next(error);
    }
  };

  rooms: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Danh sách phòng còn chỗ",
        data: await this.service.getRooms(req.params.buildingId!),
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

  beds: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        success: true,
        message: "Danh sách giường trống",
        data: await this.service.getEmptyBeds(req.params.roomId!),
      });
    } catch (error) {
      next(error);
    }
  };
}
