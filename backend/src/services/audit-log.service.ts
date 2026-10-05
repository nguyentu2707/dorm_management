import type { AuditContext, AuditData } from "../models/audit-log.model.js";
import type {
  IAuditLogRepository,
  AuditLogCreateData,
  AuditLogQuery,
} from "../repositories/interfaces/audit-log.repository.interface.js";
import type { TransactionContext } from "./transaction-manager.js";
import { AppError } from "../errors/AppError.js";

const forbiddenKey = (key: string) => {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return (
    normalized.includes("password") ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized === "authorization" ||
    normalized === "cookie" ||
    normalized === "databaseurl" ||
    normalized === "jwt"
  );
};
export function sanitizeAuditData(value?: AuditData): AuditData | undefined {
  if (!value) return undefined;
  const clean = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(clean);
    if (!item || typeof item !== "object" || item instanceof Date) return item;
    return Object.fromEntries(
      Object.entries(item as Record<string, unknown>)
        .filter(([key]) => !forbiddenKey(key))
        .map(([key, child]) => [key, clean(child)]),
    );
  };
  return clean(value) as AuditData;
}
export class AuditLogService {
  constructor(private repository: IAuditLogRepository) {}
  record(
    data: Omit<AuditLogCreateData, "actorUserId" | "requestId" | "ipAddress">,
    context: AuditContext,
    tx: TransactionContext,
  ) {
    return this.repository.create(
      {
        ...data,
        actorUserId: context.actorUserId,
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        oldData: sanitizeAuditData(data.oldData),
        newData: sanitizeAuditData(data.newData),
        metadata: sanitizeAuditData(data.metadata),
      },
      tx,
    );
  }
  list(query: AuditLogQuery) {
    return this.repository.list(query);
  }
  async detail(id: string) {
    const item = await this.repository.findById(id);
    if (!item)
      throw new AppError(
        404,
        "AUDIT_LOG_NOT_FOUND",
        "Không tìm thấy bản ghi nhật ký",
      );
    return item;
  }
}
