import type { QueryResultRow } from "pg";
import { pool } from "./pool.js";
import { activeClient, type TransactionContext } from "./context.js";
import { translatePostgresError } from "./postgres-errors.js";
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
  tx?: TransactionContext,
) {
  const active = activeClient.getStore();
  if (tx && active?.context !== tx)
    throw new Error("Inactive or mismatched transaction context");
  try {
    return await (active?.client ?? pool).query<T>(sql, values);
  } catch (error) {
    throw translatePostgresError(error) ?? error;
  }
}
export function numeric(value: unknown): number {
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    Math.abs(n) > Number.MAX_SAFE_INTEGER ||
    (typeof value === "string" &&
      /^-?\d+(?:\.0+)?$/.test(value) &&
      !Number.isSafeInteger(n))
  )
    throw new Error("Database numeric exceeds supported API range");
  return n;
}
export function mapRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (
      value === null &&
      ![
        "latest_finalized_billing_period",
        "wants_hot_water",
        "endedAt",
        "nextSegmentStartDate",
        "actualEndDate",
        "currentContractId",
        "currentContractStatus",
      ].includes(key)
    )
      continue;
    out[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
  }
  return out as T;
}
export async function rows<T>(
  sql: string,
  values: unknown[] = [],
  tx?: TransactionContext,
): Promise<T[]> {
  const result = await query(sql, values, tx);
  const decimals = new Set(
    result.fields
      .filter((f) => f.dataTypeID === 1700 || f.dataTypeID === 20)
      .map((f) => f.name),
  );
  return result.rows.map((row) => {
    for (const key of decimals)
      if (row[key] !== null) row[key] = numeric(row[key]);
    return mapRow<T>(row);
  });
}
export async function one<T>(
  sql: string,
  values: unknown[] = [],
  tx?: TransactionContext,
): Promise<T | null> {
  return (await rows<T>(sql, values, tx))[0] ?? null;
}
export async function required<T>(
  sql: string,
  values: unknown[] = [],
  tx?: TransactionContext,
): Promise<T> {
  const row = await one<T>(sql, values, tx);
  if (!row) throw new Error("Expected returned database row");
  return row;
}
export async function count(
  sql: string,
  values: unknown[] = [],
  tx?: TransactionContext,
): Promise<number> {
  return (await required<{ count: number }>(sql, values, tx)).count;
}
export async function page<T>(
  sql: string,
  values: unknown[],
  q: { page: number; limit: number },
  order: string,
) {
  // SQL and order are repository-owned constants/whitelists, never request strings.
  const total = await count(`SELECT count(*) FROM (${sql}) AS result`, values);
  const items = await rows<T>(
    `${sql} ORDER BY ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
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
export const contains = (value?: string) =>
  value === undefined ? null : `%${value.replace(/[\\%_]/g, "\\$&")}%`;
