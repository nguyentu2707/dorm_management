import type {
  IStudentRepository,
  StudentSearchQuery,
} from "../../repositories/interfaces/student.repository.interface.js";
import { AppError } from "../../errors/AppError.js";
import type { IUserRepository } from "../../repositories/interfaces/user.repository.interface.js";
import type { IRefreshSessionRepository } from "../../repositories/interfaces/refresh-session.repository.interface.js";
import type { ITransactionManager } from "../transaction-manager.js";

export class AdminStudentService {
  constructor(
    private students: IStudentRepository,
    private users: IUserRepository,
    private sessions: IRefreshSessionRepository,
    private tx: ITransactionManager,
  ) {}
  list(query: StudentSearchQuery) {
    return this.students.search(query);
  }
  async get(id: string) {
    const student = await this.students.findAdminDetail(id);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return student;
  }
  async accountStatus(id: string, status: "ACTIVE" | "LOCKED") {
    const student = await this.students.findAdminDetail(id);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    await this.tx.runInTransaction(async (tx) => {
      if (!(await this.users.updateStatus(student.userId, status, tx)))
        throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
      if (status === "LOCKED")
        await this.sessions.revokeAllByUserId(student.userId, tx);
    });
    return { status };
  }
}
