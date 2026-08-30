import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import mongoose from "mongoose";
type Duplicate = {
  code: number;
  keyPattern?: Record<string, number>;
  message?: string;
};
const duplicate = (e: Duplicate) => {
  const k = e.keyPattern ?? {};
  if (k.username)
    return ["USERNAME_ALREADY_EXISTS", "Tên đăng nhập đã tồn tại"];
  if (k.mssv) return ["MSSV_ALREADY_EXISTS", "Mã số sinh viên đã tồn tại"];
  if (k.buildingId && k.roomNumber)
    return ["ROOM_NUMBER_ALREADY_EXISTS", "Số phòng đã tồn tại trong tòa nhà"];
  if (k.roomId && k.bedNumber)
    return ["BED_NUMBER_ALREADY_EXISTS", "Số giường đã tồn tại trong phòng"];
  if (k.serialNumber)
    return ["EQUIPMENT_SERIAL_ALREADY_EXISTS", "Số serial thiết bị đã tồn tại"];
  if (k.studentId && e.message?.includes("roomchangerequests"))
    return [
      "ROOM_CHANGE_REQUEST_ALREADY_PENDING",
      "Sinh viên đã có yêu cầu chuyển phòng chờ xử lý",
    ];
  if (k.studentId)
    return [
      "STUDENT_ALREADY_HAS_ACTIVE_CONTRACT",
      "Sinh viên đã có hợp đồng chờ duyệt hoặc đang hoạt động",
    ];
  return ["VALIDATION_ERROR", "Dữ liệu bị trùng"];
};
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if ((err as Duplicate).code === 11000) {
    const [c, m] = duplicate(err as Duplicate);
    res.status(409).json({ success: false, message: m, code: c });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res
      .status(400)
      .json({ success: false, message: "ID không hợp lệ", code: "INVALID_ID" });
    return;
  }
  const e =
    err instanceof AppError
      ? err
      : new AppError(500, "INTERNAL_SERVER_ERROR", "Lỗi máy chủ nội bộ");
  if (!(err instanceof AppError)) console.error(err);
  res
    .status(e.statusCode)
    .json({ success: false, message: e.message, code: e.code });
};
