import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const { rows } = await pool.query(`
    SELECT
      b.name AS building,
      r.id AS "roomId",
      r.room_number AS "roomNumber",
      rt.id AS "roomTypeId",
      rt.name AS "roomType",
      rt.capacity::integer AS "expectedCapacity",
      count(bed.id)::integer AS "actualBedCount"
    FROM rooms r
    JOIN buildings b ON b.id = r.building_id
    JOIN room_types rt ON rt.id = r.room_type_id
    LEFT JOIN beds bed ON bed.room_id = r.id
    GROUP BY b.name, r.id, r.room_number, rt.id, rt.name, rt.capacity
    ORDER BY b.name, r.room_number, r.id
  `);
  const mismatches = rows.filter(
    (room) => room.actualBedCount !== room.expectedCapacity,
  );
  console.log(
    JSON.stringify(
      { totalRooms: rows.length, mismatchCount: mismatches.length, mismatches },
      null,
      2,
    ),
  );
  if (mismatches.length) process.exitCode = 2;
} finally {
  await pool.end();
}
