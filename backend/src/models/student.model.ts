export interface Student {
  userId: string;
  mssv: string;
  className?: string;
  faculty?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dob?: Date;
  cccd?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type StudentDocument = Student & { id: string };
