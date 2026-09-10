import type { IBedRepository } from "../interfaces/bed.repository.interface.js";
import type { BedDocument } from "../../models/bed.model.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresBedRepository implements IBedRepository {
  async findById(
    ...[id, s]: Parameters<IBedRepository["findById"]>
  ): ReturnType<IBedRepository["findById"]> {
    return one<BedDocument>(`SELECT * FROM beds WHERE id=$1`, [id], s);
  }
  async findByRoomId(
    ...[id, s]: Parameters<IBedRepository["findByRoomId"]>
  ): ReturnType<IBedRepository["findByRoomId"]> {
    return rows<BedDocument>(
      `SELECT * FROM beds WHERE room_id=$1 ORDER BY bed_number, id`,
      [id],
      s,
    );
  }
  async createMany(
    ...[id, count, s]: Parameters<IBedRepository["createMany"]>
  ): ReturnType<IBedRepository["createMany"]> {
    return rows<BedDocument>(
      `INSERT INTO beds(room_id, bed_number) SELECT $1, n::text FROM generate_series(1,$2::integer) n RETURNING *`,
      [id, count],
      s,
    );
  }
  async ensureCapacity(
    ...[id, count, s]: Parameters<IBedRepository["ensureCapacity"]>
  ): ReturnType<IBedRepository["ensureCapacity"]> {
    return (
      (
        await query(
          `INSERT INTO beds(room_id,bed_number) SELECT $1,n::text
      FROM generate_series(1,$2::integer) n
      ON CONFLICT ON CONSTRAINT uq_beds_room_bed_number DO NOTHING`,
          [id, count],
          s,
        )
      ).rowCount ?? 0
    );
  }
  async countOccupiedByRoomId(
    ...[id, s]: Parameters<IBedRepository["countOccupiedByRoomId"]>
  ): ReturnType<IBedRepository["countOccupiedByRoomId"]> {
    return count(
      `SELECT count(*) FROM beds WHERE room_id=$1 AND status='OCCUPIED'`,
      [id],
      s,
    );
  }
  async countEmptyByRoomId(
    ...[id, s]: Parameters<IBedRepository["countEmptyByRoomId"]>
  ): ReturnType<IBedRepository["countEmptyByRoomId"]> {
    return count(
      `SELECT count(*) FROM beds WHERE room_id=$1 AND status='EMPTY'`,
      [id],
      s,
    );
  }
  async occupyIfEmpty(
    ...[id, s]: Parameters<IBedRepository["occupyIfEmpty"]>
  ): ReturnType<IBedRepository["occupyIfEmpty"]> {
    return (
      (
        await query(
          `UPDATE beds SET status='OCCUPIED',updated_at=now() WHERE id=$1 AND status='EMPTY'`,
          [id],
          s,
        )
      ).rowCount === 1
    );
  }
  async releaseIfOccupied(
    ...[id, s]: Parameters<IBedRepository["releaseIfOccupied"]>
  ): ReturnType<IBedRepository["releaseIfOccupied"]> {
    return (
      (
        await query(
          `UPDATE beds SET status='EMPTY',updated_at=now() WHERE id=$1 AND status='OCCUPIED'`,
          [id],
          s,
        )
      ).rowCount === 1
    );
  }
  async summarizeByRoomIds(
    ...[ids]: Parameters<IBedRepository["summarizeByRoomIds"]>
  ): ReturnType<IBedRepository["summarizeByRoomIds"]> {
    const result = await rows<{
      roomId: string;
      total: number;
      occupied: number;
      empty: number;
    }>(
      `SELECT room_id,count(*) AS total,count(*) FILTER(WHERE status='OCCUPIED') AS occupied,count(*) FILTER(WHERE status='EMPTY') AS empty
      FROM beds
      WHERE room_id=ANY($1::uuid[])
      GROUP BY room_id`,
      [ids],
    );
    return new Map(result.map(({ roomId, ...summary }) => [roomId, summary]));
  }
  async deleteByRoomId(
    ...[id, s]: Parameters<IBedRepository["deleteByRoomId"]>
  ): ReturnType<IBedRepository["deleteByRoomId"]> {
    await query(`DELETE FROM beds WHERE room_id=$1`, [id], s);
  }
}
export { PostgresBedRepository as BedRepository };
