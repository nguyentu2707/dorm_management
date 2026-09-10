export interface Staff {
  userId: string;
  position: "MAINTENANCE" | "SECURITY" | "RECEPTIONIST" | "MANAGER";
  createdAt: Date;
  updatedAt: Date;
}
export type StaffDocument = Staff & { id: string };
