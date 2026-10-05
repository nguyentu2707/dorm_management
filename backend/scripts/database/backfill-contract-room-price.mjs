import "dotenv/config";
import pg from "pg";

const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm-demo-current-price");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
if (apply && (!confirmed || process.env.NODE_ENV === "production")) {
  console.error(
    "Apply is restricted to non-production demo/dev data and requires --confirm-demo-current-price",
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const client = await pool.connect();
try {
  const report = await client.query(`
    SELECT
      c.status,
      count(*)::int AS contracts,
      count(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM invoices i
          JOIN monthly_billings mb ON mb.id = i.monthly_billing_id
          WHERE i.contract_id = c.id
            AND mb.status IN ('FINALIZED', 'CANCELLED')
        )
      )::int AS contracts_with_finalized_or_cancelled_billings
    FROM contracts c
    WHERE c.room_price_per_month_snapshot IS NULL
    GROUP BY c.status
    ORDER BY c.status
  `);
  const total = report.rows.reduce((sum, row) => sum + row.contracts, 0);
  console.log(
    JSON.stringify(
      { mode: apply ? "apply" : "dry-run", total, byStatus: report.rows },
      null,
      2,
    ),
  );

  if (!apply || total === 0) process.exitCode = 0;
  else {
    await client.query("BEGIN");
    const result = await client.query(`
      UPDATE contracts c
      SET room_price_per_month_snapshot = rt.price_per_month,
          updated_at = now()
      FROM rooms r
      JOIN room_types rt ON rt.id = r.room_type_id
      WHERE c.room_id = r.id
        AND c.room_price_per_month_snapshot IS NULL
    `);
    await client.query("COMMIT");
    console.log(
      JSON.stringify({
        applied: result.rowCount,
        classification: "BEST_EFFORT_CURRENT_ROOM_TYPE_PRICE",
      }),
    );
  }
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {}
  console.error(error instanceof Error ? error.message : "Backfill failed");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
