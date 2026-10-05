import { count, one, required, rows } from "../../database/query.js";
import type { AuditLogDocument } from "../../models/audit-log.model.js";
import type { IAuditLogRepository } from "../interfaces/audit-log.repository.interface.js";

const select = `SELECT a.id,a.actor_user_id,a.action,a.entity_type,a.entity_id,
  a.old_data,a.new_data,a.metadata,a.request_id,a.ip_address,a.created_at,
  CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object('id',u.id,'fullName',u.full_name) END AS actor
  FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id`;

export class PostgresAuditLogRepository implements IAuditLogRepository {
  async create(
    data: Parameters<IAuditLogRepository["create"]>[0],
    tx: Parameters<IAuditLogRepository["create"]>[1],
  ) {
    return required<AuditLogDocument>(
      `INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,old_data,new_data,metadata,request_id,ip_address)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        data.actorUserId,
        data.action,
        data.entityType,
        data.entityId,
        data.oldData,
        data.newData,
        data.metadata,
        data.requestId,
        data.ipAddress,
      ],
      tx,
    );
  }
  async list(q: Parameters<IAuditLogRepository["list"]>[0]) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      values.push(value);
      clauses.push(sql.replace("?", `$${values.length}`));
    };
    if (q.action) add("a.action=?", q.action);
    if (q.entityType) add("a.entity_type=?", q.entityType);
    if (q.entityId) add("a.entity_id=?", q.entityId);
    if (q.actorUserId) add("a.actor_user_id=?", q.actorUserId);
    if (q.dateFrom) add("a.created_at>=?", q.dateFrom);
    if (q.dateTo) add("a.created_at<=?", q.dateTo);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const total = await count(
      `SELECT count(*) FROM audit_logs a${where}`,
      values,
    );
    const items = await rows<AuditLogDocument>(
      `${select}${where} ORDER BY a.created_at DESC,a.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, q.limit, (q.page - 1) * q.limit],
    );
    return {
      items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }
  findById(id: string) {
    return one<AuditLogDocument>(`${select} WHERE a.id=$1`, [id]);
  }
}
