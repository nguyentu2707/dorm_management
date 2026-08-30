import type { StudentDocument } from "../models/student.model.js";
import type { UserDocument } from "../models/user.model.js";

export class StudentProfileMapper {
  static toResponse(user: UserDocument, student: StudentDocument) {
    return {
      id: student._id.toString(),
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      mssv: student.mssv,
      className: student.className,
      faculty: student.faculty,
      gender: student.gender,
      dob: student.dob,
      cccd: student.cccd,
      permanentAddress: student.permanentAddress,
      emergencyContactName: student.emergencyContactName,
      emergencyContactPhone: student.emergencyContactPhone,
    };
  }
}
