export interface Staff {
  staffCode: string;
  fullName: string;
  phone?: string;
  specialty?: string;
  status: "ACTIVE" | "INACTIVE";
  userId?: string;
  position?: "MAINTENANCE" | "SECURITY" | "RECEPTIONIST" | "MANAGER";
  createdAt: Date;
  updatedAt: Date;
}
export type StaffDocument = Staff & { id: string };
