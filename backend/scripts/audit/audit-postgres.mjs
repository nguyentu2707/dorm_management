import "dotenv/config";
import pg from "pg";
import { writeFile } from "node:fs/promises";

// Read-only catalog/data audit. Never migrate, seed or reset the selected database.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
const qi = (s) => '"' + s.replaceAll('"', '""') + '"';
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const c = await pool.connect();
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const tables = (
      await c.query(
        "SELECT tablename FROM pg_tables WHERE schemaname=current_schema() ORDER BY tablename",
      )
    ).rows.map((r) => r.tablename);
    const columns = (
      await c.query(
        `SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema=current_schema() ORDER BY table_name,ordinal_position`,
      )
    ).rows;
    const constraints = (
      await c.query(`SELECT conname,contype,conrelid::regclass::text AS table_name,confrelid::regclass::text AS target,convalidated,pg_get_constraintdef(oid) AS definition,
      ARRAY(SELECT attname::text FROM unnest(conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute ON attrelid=conrelid AND attnum=num ORDER BY ord) AS columns,
      ARRAY(SELECT attname::text FROM unnest(confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute ON attrelid=confrelid AND attnum=num ORDER BY ord) AS target_columns
      FROM pg_constraint WHERE connamespace=current_schema()::regnamespace ORDER BY conrelid::regclass::text,conname`)
    ).rows;
    const indexes = (
      await c.query(
        "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() ORDER BY tablename,indexname",
      )
    ).rows;
    const counts = {};
    for (const table of tables)
      counts[table] = Number(
        (await c.query(`SELECT count(*) FROM ${qi(table)}`)).rows[0].count,
      );
    const orphans = {};
    for (const fk of constraints.filter((x) => x.contype === "f")) {
      const join = fk.columns
        .map((k, i) => `s.${qi(k)}=t.${qi(fk.target_columns[i])}`)
        .join(" AND ");
      const present = fk.columns
        .map((k) => `s.${qi(k)} IS NOT NULL`)
        .join(" AND ");
      orphans[fk.conname] = Number(
        (
          await c.query(
            `SELECT count(*) FROM ${qi(fk.table_name)} s WHERE ${present} AND NOT EXISTS (SELECT 1 FROM ${qi(fk.target)} t WHERE ${join})`,
          )
        ).rows[0].count,
      );
    }
    const invariants = (
      await c.query(`SELECT
      (SELECT count(*) FROM beds b WHERE (b.status='OCCUPIED' AND (SELECT count(*) FROM contracts c WHERE c.bed_id=b.id AND c.status='ACTIVE')<>1) OR (b.status='EMPTY' AND EXISTS (SELECT 1 FROM contracts c WHERE c.bed_id=b.id AND c.status='ACTIVE'))) AS bed_contract_mismatches,
      (SELECT count(*) FROM rooms r LEFT JOIN room_billing_cursors c ON c.room_id=r.id WHERE c.room_id IS NULL) AS missing_cursors,
      (SELECT count(*) FROM contracts c JOIN beds b ON b.id=c.bed_id WHERE c.room_id<>b.room_id) AS contract_room_mismatches,
      (SELECT count(*) FROM room_billing_cursors c WHERE c.latest_finalized_billing_period IS DISTINCT FROM (SELECT max(b.billing_period) FROM monthly_billings b WHERE b.room_id=c.room_id AND b.status IN ('FINALIZED','CANCELLED'))) AS cursor_history_mismatches,
      (SELECT count(*) FROM monthly_billings b WHERE b.status IN ('FINALIZED','CANCELLED') AND (b.electricity_amount IS DISTINCT FROM (SELECT sum(i.electricity_share) FROM invoices i WHERE i.monthly_billing_id=b.id) OR b.water_amount IS DISTINCT FROM (SELECT sum(i.water_share) FROM invoices i WHERE i.monthly_billing_id=b.id) OR b.wifi_fee IS DISTINCT FROM (SELECT sum(i.wifi_share) FROM invoices i WHERE i.monthly_billing_id=b.id) OR b.trash_fee IS DISTINCT FROM (SELECT sum(i.trash_share) FROM invoices i WHERE i.monthly_billing_id=b.id))) AS financial_allocation_mismatches`)
    ).rows[0];
    const missingPK = tables.filter(
      (t) => !constraints.some((k) => k.table_name === t && k.contype === "p"),
    );
    if (tables.includes("payments")) {
      Object.assign(
        invariants,
        (
          await c.query(`WITH amounts AS (
        SELECT invoice_id,SUM(amount) FILTER (WHERE status='CONFIRMED') AS paid,
        count(*) FILTER (WHERE status='PENDING') AS pending FROM payments GROUP BY invoice_id
      ) SELECT
        (SELECT count(*) FROM invoices i LEFT JOIN amounts a ON a.invoice_id=i.id WHERE COALESCE(a.paid,0)>i.total_amount) AS overpaid_invoices,
        (SELECT count(*) FROM amounts WHERE pending>1) AS duplicate_pending_payments,
        (SELECT count(*) FROM invoices i LEFT JOIN amounts a ON a.invoice_id=i.id WHERE
          (i.status='CANCELLED' AND COALESCE(a.paid,0)>0) OR
          (i.status<>'CANCELLED' AND i.status<>CASE WHEN COALESCE(a.paid,0)=0 THEN 'UNPAID' WHEN a.paid=i.total_amount THEN 'PAID' ELSE 'PARTIALLY_PAID' END)) AS payment_projection_mismatches,
        (SELECT count(*) FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN monthly_billings b ON b.id=i.monthly_billing_id WHERE p.status IN ('PENDING','CONFIRMED') AND (i.status='CANCELLED' OR b.status<>'FINALIZED')) AS payments_on_invalid_invoices`)
        ).rows[0],
      );
    }
    const report = {
      capturedAt: new Date().toISOString(),
      version: (await c.query("SELECT version()")).rows[0].version,
      tables,
      counts,
      columns,
      constraints,
      indexes,
      missingPK,
      orphans,
      invariants,
    };
    await c.query("COMMIT");
    const output = process.argv[2];
    if (output) await writeFile(output, JSON.stringify(report, null, 2) + "\n");
    console.log(
      JSON.stringify(
        {
          tables: tables.length,
          businessTables: tables.filter((t) => t !== "schema_migrations")
            .length,
          constraints: constraints.reduce(
            (a, k) => ((a[k.contype] = (a[k.contype] ?? 0) + 1), a),
            {},
          ),
          indexes: indexes.length,
          missingPK,
          orphans: Object.values(orphans).reduce((a, b) => a + b, 0),
          invariants,
        },
        null,
        2,
      ),
    );
    if (
      missingPK.length ||
      Object.values(orphans).some(Number) ||
      Object.values(invariants).some(Number)
    )
      process.exitCode = 1;
  } finally {
    c.release();
  }
} catch (e) {
  console.error("PostgreSQL audit failed:", e.code ?? e.name);
  process.exitCode = 1;
} finally {
  await pool.end();
}
