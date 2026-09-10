import type {
  IStudentRegistryRepository,
  StudentRegistryData,
  StudentRegistryQuery,
} from "../../repositories/interfaces/student-registry.repository.interface.js";
import { AppError } from "../../errors/AppError.js";

const normalize = (data: Partial<StudentRegistryData>) => ({
  ...data,
  ...(data.studentCode !== undefined
    ? { studentCode: data.studentCode.trim().toUpperCase() }
    : {}),
  ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
  ...(data.email !== undefined
    ? { email: data.email.trim().toLowerCase() }
    : {}),
});

export class StudentRegistryService {
  constructor(private registry: IStudentRegistryRepository) {}
  list(query: StudentRegistryQuery) {
    return this.registry.findAll(query);
  }
  async get(id: string) {
    const item = await this.registry.findById(id);
    if (!item)
      throw new AppError(404, "STUDENT_REGISTRY_NOT_FOUND", "Không tìm thấy hồ sơ xác minh");
    return item;
  }
  create(data: StudentRegistryData) {
    return this.registry.create(normalize(data) as StudentRegistryData);
  }
  async update(id: string, data: Partial<StudentRegistryData>) {
    const current = await this.get(id);
    if (current.status === "CLAIMED")
      throw new AppError(409, "STUDENT_REGISTRY_IDENTITY_LOCKED", "Không thể sửa danh tính đã được claim");
    const updated = await this.registry.updateAvailable(id, normalize(data));
    if (!updated)
      throw new AppError(409, "STUDENT_REGISTRY_STATE_CHANGED", "Trạng thái hồ sơ vừa thay đổi");
    return updated;
  }
  async setAvailability(id: string, status: "AVAILABLE" | "DISABLED") {
    const current = await this.get(id);
    if (current.status === "CLAIMED")
      throw new AppError(409, "STUDENT_REGISTRY_IDENTITY_LOCKED", "Không thể thay đổi hồ sơ đã được claim");
    const updated = await this.registry.setAvailability(id, status);
    if (!updated)
      throw new AppError(409, "STUDENT_REGISTRY_STATE_CHANGED", "Trạng thái hồ sơ vừa thay đổi");
    return updated;
  }
}
