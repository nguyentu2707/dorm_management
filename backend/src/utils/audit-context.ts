import type { AuditContext } from "../models/audit-log.model.js";
import type { AuthRequest } from "../types/common.types.js";
export function auditContextFrom(request: AuthRequest): AuditContext {
  return { actorUserId: request.user!.userId, requestId: request.requestId, ipAddress: request.ip };
}
