import { AppError } from "../../errors/AppError.js";
import type { IRoomChangeRequestRepository } from "../interfaces/room-change-request.repository.interface.js";
import type { RoomChangeRequestDocument } from "../../models/room-change-request.model.js";
import type { RoomChangeDisplaySummary } from "../interfaces/room-change-request.repository.interface.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresRoomChangeRequestRepository implements IRoomChangeRequestRepository {
  async findById(
    ...[id, s]: Parameters<IRoomChangeRequestRepository["findById"]>
  ): ReturnType<IRoomChangeRequestRepository["findById"]> {
    return one<RoomChangeRequestDocument>(
      `SELECT * FROM room_change_requests WHERE id=$1 ${s ? "FOR UPDATE" : ""}`,
      [id],
      s,
    );
  }
  async findByStudentId(
    ...[id]: Parameters<IRoomChangeRequestRepository["findByStudentId"]>
  ): ReturnType<IRoomChangeRequestRepository["findByStudentId"]> {
    return rows<RoomChangeRequestDocument>(
      `SELECT * FROM room_change_requests WHERE student_id=$1 ORDER BY created_at DESC,id`,
      [id],
      undefined,
    );
  }
  async findPendingByStudentId(
    ...[id, s]: Parameters<
      IRoomChangeRequestRepository["findPendingByStudentId"]
    >
  ): ReturnType<IRoomChangeRequestRepository["findPendingByStudentId"]> {
    return one<RoomChangeRequestDocument>(
      `SELECT * FROM room_change_requests WHERE student_id=$1 AND status='PENDING'`,
      [id],
      s,
    );
  }
  async create(
    ...[d, s]: Parameters<IRoomChangeRequestRepository["create"]>
  ): ReturnType<IRoomChangeRequestRepository["create"]> {
    return required<RoomChangeRequestDocument>(
      `INSERT INTO room_change_requests (student_id, current_contract_id, target_bed_id, reason, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [d.studentId, d.currentContractId, d.targetBedId, d.reason, d.status],
      s,
    );
  }
  async findAll(
    ...[q]: Parameters<IRoomChangeRequestRepository["findAll"]>
  ): ReturnType<IRoomChangeRequestRepository["findAll"]> {
    return page<RoomChangeRequestDocument>(
      `SELECT * FROM room_change_requests WHERE ($1::text IS NULL OR status=$1) AND ($2::uuid IS NULL OR student_id=$2)`,
      [q.status, q.studentId],
      q,
      "created_at DESC,id",
    );
  }
  async updateStatus(
    ...[id, status, d = {}, s]: Parameters<
      IRoomChangeRequestRepository["updateStatus"]
    >
  ): ReturnType<IRoomChangeRequestRepository["updateStatus"]> {
    const updated = await one<RoomChangeRequestDocument>(
      `UPDATE room_change_requests
      SET processed_by = CASE WHEN $2::boolean THEN $3 ELSE processed_by END, processed_at = CASE WHEN $4::boolean THEN $5 ELSE processed_at END, reject_reason = CASE WHEN $6::boolean THEN $7 ELSE reject_reason END, updated_at = now() , status = $8
      WHERE id=$1 AND status='PENDING'
      RETURNING *`,
      [
        id,
        d.processedBy !== undefined,
        d.processedBy,
        d.processedAt !== undefined,
        d.processedAt,
        d.rejectReason !== undefined,
        d.rejectReason,
        status,
      ],
      s,
    );
    if (!updated)
      throw new AppError(
        409,
        "ROOM_CHANGE_REQUEST_NOT_PENDING",
        "Yêu cầu không còn chờ xử lý",
      );
    return updated;
  }
  async findDisplaySummaries(
    ...[ids]: Parameters<IRoomChangeRequestRepository["findDisplaySummaries"]>
  ): ReturnType<IRoomChangeRequestRepository["findDisplaySummaries"]> {
    const result = await rows<RoomChangeDisplaySummary & { id: string }>(
      `SELECT req.id,json_build_object('id',s.id,'mssv',s.mssv,'fullName',u.full_name) AS student,
 json_build_object('id',r.id,'roomNumber',r.room_number,'buildingName',b.name,'bedNumber',bed.bed_number) AS "currentRoom",
 json_build_object('id',tr.id,'roomNumber',tr.room_number,'buildingName',tb.name,'bedNumber',tbed.bed_number) AS "targetRoom"

      FROM room_change_requests req
      JOIN contracts c ON c.id=req.current_contract_id
      JOIN students s ON s.id=req.student_id
      JOIN users u ON u.id=s.user_id
      JOIN rooms r ON r.id=c.room_id
      JOIN buildings b ON b.id=r.building_id
      JOIN beds bed ON bed.id=c.bed_id
      JOIN beds tbed ON tbed.id=req.target_bed_id
      JOIN rooms tr ON tr.id=tbed.room_id
      JOIN buildings tb ON tb.id=tr.building_id
      WHERE req.id=ANY($1::uuid[])`,
      [ids],
    );
    return new Map(result.map(({ id, ...summary }) => [id, summary]));
  }
}
export { PostgresRoomChangeRequestRepository as RoomChangeRequestRepository };
