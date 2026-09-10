import type { IContractRepository } from "../repositories/interfaces/contract.repository.interface.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import { AppError } from "../errors/AppError.js";
import { normalizeResidenceHistory } from "./residence-history.rules.js";
export class ResidenceHistoryService {
  constructor(
    private contracts: IContractRepository,
    private students: IStudentRepository,
  ) {}
  private async byStudentId(studentId: string) {
    return {
      items: normalizeResidenceHistory(
        await this.contracts.findResidenceHistoryByStudentId(studentId),
      ),
    };
  }
  async mine(userId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return this.byStudentId(student.id);
  }
  async admin(studentId: string) {
    if (!(await this.students.findById(studentId)))
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return this.byStudentId(studentId);
  }
}
