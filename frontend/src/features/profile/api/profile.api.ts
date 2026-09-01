import { apiClient, dataOf } from "../../../services/api-client";
import type { StudentProfile } from "../../../types/api";

export type UpdateStudentProfileInput = Pick<
  StudentProfile,
  | "fullName"
  | "dob"
  | "gender"
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
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    dataOf<{ changed: boolean }>(
      apiClient.patch("/student/profile/password", input),
    ),
};
