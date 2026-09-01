import type {
  IStudentRepository,
  StudentSearchQuery,
} from "../../repositories/interfaces/student.repository.interface.js";
import { AppError } from "../../errors/AppError.js";

export class AdminStudentService {
  constructor(private students: IStudentRepository) {}
  list(query: StudentSearchQuery) {
    return this.students.search(query);
  }
  async get(id: string) {
    const student = await this.students.findAdminDetail(id);
    if (!student)
      throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return student;
  }
}
