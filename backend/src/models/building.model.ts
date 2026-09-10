export const BUILDING_STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE"] as const;
export type BuildingStatus = (typeof BUILDING_STATUSES)[number];
export const BUILDING_GENDERS = ["MALE", "FEMALE", "MIXED"] as const;
export type BuildingGender = (typeof BUILDING_GENDERS)[number];
export interface Building {
  name: string;
  address?: string;
  description?: string;
  status: BuildingStatus;
  allowedGender: BuildingGender;
  createdAt: Date;
  updatedAt: Date;
}
export type BuildingDocument = Building & { id: string };
