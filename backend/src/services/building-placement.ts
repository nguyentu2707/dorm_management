import type { BuildingDocument } from "../models/building.model.js";
import type { StudentDocument } from "../models/student.model.js";
import { AppError } from "../errors/AppError.js";

export function isGenderCompatible(
  studentGender: StudentDocument["gender"],
  allowedGender: BuildingDocument["allowedGender"],
) {
  if (!studentGender) return false;
  return allowedGender === "MIXED" || studentGender === allowedGender;
}

export function assertPlacementAllowed(
  student: StudentDocument,
  building: BuildingDocument,
) {
  if (building.status !== "ACTIVE")
    throw new AppError(409, "BUILDING_NOT_ACTIVE", "Tòa nhà hiện không tiếp nhận sinh viên");
  if (!student.gender)
    throw new AppError(409, "STUDENT_GENDER_REQUIRED", "Sinh viên cần cập nhật giới tính trước khi đăng ký phòng");
  if (!isGenderCompatible(student.gender, building.allowedGender))
    throw new AppError(409, "BUILDING_GENDER_NOT_ALLOWED", "Tòa nhà không phù hợp với giới tính của sinh viên");
}
