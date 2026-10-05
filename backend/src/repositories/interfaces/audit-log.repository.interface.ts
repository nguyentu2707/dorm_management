import type {
  AuditAction,
  AuditData,
  AuditEntityType,
  AuditLogDocument,
} from "../../models/audit-log.model.js";
import type { PaginatedResult } from "../../types/common.types.js";
import type { TransactionContext } from "../../services/transaction-manager.js";

export interface AuditLogQuery {
  page: number;
  limit: number;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  actorUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
export interface AuditLogCreateData {
  actorUserId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldData?: AuditData;
  newData?: AuditData;
  metadata?: AuditData;
  requestId?: string;
  ipAddress?: string;
}
export interface IAuditLogRepository {
  create(
    data: AuditLogCreateData,
    tx: TransactionContext,
  ): Promise<AuditLogDocument>;
  list(query: AuditLogQuery): Promise<PaginatedResult<AuditLogDocument>>;
  findById(id: string): Promise<AuditLogDocument | null>;
}
