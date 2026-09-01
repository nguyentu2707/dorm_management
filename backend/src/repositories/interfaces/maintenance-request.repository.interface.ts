import type {
  MaintenanceCategory,
  MaintenanceRequestDocument,
  MaintenanceStatus,
} from "../../models/maintenance-request.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
export interface IMaintenanceRequestRepository {
  create(data: {
    studentId: string;
    roomId: string;
    equipmentItemId?: string;
    category: MaintenanceCategory;
    description: string;
  }): Promise<MaintenanceRequestDocument>;
  findById(id: string): Promise<MaintenanceRequestDocument | null>;
  findByStudentId(id: string): Promise<MaintenanceRequestDocument[]>;
  findAll(q: {
    page: number;
    limit: number;
    status?: MaintenanceStatus;
    roomId?: string;
    buildingId?: string;
    category?: MaintenanceCategory;
    assignedStaffId?: string;
  }): Promise<PaginatedResult<MaintenanceRequestDocument>>;
  update(
    id: string,
    data: Record<string, unknown>,
  ): Promise<MaintenanceRequestDocument | null>;
  countOperational(): Promise<{ pending: number; inProgress: number }>;
}
