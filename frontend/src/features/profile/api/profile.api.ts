import { apiClient, dataOf } from "../../../services/api-client";
import type { StudentProfile } from "../../../types/api";

export type UpdateStudentProfileInput = Pick<
  StudentProfile,
  | "email"
  | "phone"
  | "permanentAddress"
  | "emergencyContactName"
  | "emergencyContactPhone"
>;

export const profileApi = {
  get: () => dataOf<StudentProfile>(apiClient.get("/student/profile")),
  update: (input: UpdateStudentProfileInput) =>
    dataOf<StudentProfile>(apiClient.patch("/student/profile", input)),
};
