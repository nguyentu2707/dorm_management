import type { IUserRepository } from "../repositories/interfaces/user.repository.interface.js";
import type {
  IStudentRepository,
  UpdateStudentProfileData,
} from "../repositories/interfaces/student.repository.interface.js";
import type { ITransactionManager } from "./transaction-manager.js";
import { AppError } from "../errors/AppError.js";
import { StudentProfileMapper } from "../mappers/student-profile.mapper.js";

export type UpdateStudentProfileInput = UpdateStudentProfileData & {
  email?: string;
  phone?: string;
};

export class StudentProfileService {
  constructor(
    private users: IUserRepository,
    private students: IStudentRepository,
    private transactionManager: ITransactionManager,
  ) {}

  private transactionUnsupported(error: unknown): boolean {
    const message = error instanceof Error ? error.message : "";
    return /Transaction numbers are only allowed|replica set|mongos/i.test(
      message,
    );
  }

  private async entities(userId: string) {
    const [user, student] = await Promise.all([
      this.users.findById(userId),
      this.students.findByUserId(userId),
    ]);
    if (!user || !student) {
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    }
    return { user, student };
  }

  async getProfile(userId: string) {
    const { user, student } = await this.entities(userId);
    return StudentProfileMapper.toResponse(user, student);
  }

  async updateProfile(userId: string, input: UpdateStudentProfileInput) {
    const { student } = await this.entities(userId);
    const studentData: UpdateStudentProfileData = {
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      permanentAddress: input.permanentAddress,
    };

    try {
      return await this.transactionManager.runInTransaction(async (session) => {
        const updatedStudent = await this.students.updateProfile(
          student._id.toString(),
          studentData,
          session,
        );
        const updatedUser = await this.users.updateProfile(
          userId,
          { email: input.email, phone: input.phone },
          session,
        );
        if (!updatedUser || !updatedStudent) {
          throw new AppError(
            404,
            "STUDENT_NOT_FOUND",
            "Không tìm thấy sinh viên",
          );
        }
        return StudentProfileMapper.toResponse(updatedUser, updatedStudent);
      });
    } catch (error) {
      if (!this.transactionUnsupported(error)) throw error;

      const updatedStudent = await this.students.updateProfile(
        student._id.toString(),
        studentData,
      );
      const updatedUser = await this.users.updateProfile(userId, {
        email: input.email,
        phone: input.phone,
      });
      if (!updatedUser || !updatedStudent) {
        throw new AppError(
          404,
          "STUDENT_NOT_FOUND",
          "Không tìm thấy sinh viên",
        );
      }
      return StudentProfileMapper.toResponse(updatedUser, updatedStudent);
    }
  }
}
