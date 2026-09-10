export const STUDENT_REGISTRY_STATUSES = [
  "AVAILABLE",
  "CLAIMED",
  "DISABLED",
] as const;
export type StudentRegistryStatus =
  (typeof STUDENT_REGISTRY_STATUSES)[number];
export type StudentRegistryGender = "MALE" | "FEMALE" | "OTHER";
export interface StudentRegistryDocument {
  id: string;
  studentCode: string;
  fullName: string;
  email?: string;
  gender?: StudentRegistryGender;
  dateOfBirth?: Date;
  status: StudentRegistryStatus;
  claimedUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}
