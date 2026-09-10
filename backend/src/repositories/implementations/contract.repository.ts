import { AppError } from "../../errors/AppError.js";
import type { IContractRepository } from "../interfaces/contract.repository.interface.js";
import type { ContractDocument } from "../../models/contract.model.js";
import type {
  ContractDisplaySummary,
  ResidenceHistoryItem,
  BillingResidenceSegment,
} from "../interfaces/contract.repository.interface.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresContractRepository implements IContractRepository {
  async findById(
    ...[id, s]: Parameters<IContractRepository["findById"]>
  ): ReturnType<IContractRepository["findById"]> {
    return one<ContractDocument>(
      `SELECT * FROM contracts WHERE id=$1 ${s ? "FOR UPDATE" : ""}`,
      [id],
      s,
    );
  }
  async create(
    ...[d, s]: Parameters<IContractRepository["create"]>
  ): ReturnType<IContractRepository["create"]> {
    return required<ContractDocument>(
      `INSERT INTO contracts (student_id, bed_id, room_id, start_date, end_date, status, approved_by, approved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        d.studentId,
        d.bedId,
        d.roomId,
        d.startDate,
        d.endDate,
        d.status,
        d.approvedBy,
        d.approvedAt,
      ],
      s,
    );
  }
  async findByStudentId(
    ...[id]: Parameters<IContractRepository["findByStudentId"]>
  ): ReturnType<IContractRepository["findByStudentId"]> {
    return rows<ContractDocument>(
      `SELECT * FROM contracts WHERE student_id=$1 ORDER BY created_at DESC,id`,
      [id],
      undefined,
    );
  }
  async findActiveByStudentId(
    ...[id, s]: Parameters<IContractRepository["findActiveByStudentId"]>
  ): ReturnType<IContractRepository["findActiveByStudentId"]> {
    return one<ContractDocument>(
      `SELECT * FROM contracts WHERE student_id=$1 AND status='ACTIVE' ORDER BY created_at DESC,id ${s ? "FOR UPDATE" : ""}`,
      [id],
      s,
    );
  }
  async findPendingOrActiveByStudentId(
    ...[id, s]: Parameters<
      IContractRepository["findPendingOrActiveByStudentId"]
    >
  ): ReturnType<IContractRepository["findPendingOrActiveByStudentId"]> {
    return one<ContractDocument>(
      `SELECT * FROM contracts WHERE student_id=$1 AND status IN ('PENDING','ACTIVE') ORDER BY created_at DESC,id`,
      [id],
      s,
    );
  }
  async findActiveByBedId(
    ...[id, s]: Parameters<IContractRepository["findActiveByBedId"]>
  ): ReturnType<IContractRepository["findActiveByBedId"]> {
    return one<ContractDocument>(
      `SELECT * FROM contracts WHERE bed_id=$1 AND status='ACTIVE' ORDER BY created_at DESC,id`,
      [id],
      s,
    );
  }
  async findPendingByBedId(
    ...[id, s]: Parameters<IContractRepository["findPendingByBedId"]>
  ): ReturnType<IContractRepository["findPendingByBedId"]> {
    return rows<ContractDocument>(
      `SELECT * FROM contracts WHERE bed_id=$1 AND status='PENDING' ORDER BY created_at DESC,id`,
      [id],
      s,
    );
  }
  async updateStatus(
    ...[id, status, d = {}, s]: Parameters<IContractRepository["updateStatus"]>
  ): ReturnType<IContractRepository["updateStatus"]> {
    const expected =
      status === "ENDED" || (status === "CANCELLED" && d.endedAt !== undefined)
        ? "ACTIVE"
        : "PENDING";
    const updated = await one<ContractDocument>(
      `UPDATE contracts
      SET reject_reason = CASE WHEN $2::boolean THEN $3 ELSE reject_reason END, cancel_reason = CASE WHEN $4::boolean THEN $5 ELSE cancel_reason END, approved_by = CASE WHEN $6::boolean THEN $7 ELSE approved_by END, approved_at = CASE WHEN $8::boolean THEN $9 ELSE approved_at END, ended_at = CASE WHEN $10::boolean THEN $11 ELSE ended_at END, updated_at = now() , status = $12
      WHERE id = $1 AND status = $13
      RETURNING *`,
      [
        id,
        d.rejectReason !== undefined,
        d.rejectReason,
        d.cancelReason !== undefined,
        d.cancelReason,
        d.approvedBy !== undefined,
        d.approvedBy,
        d.approvedAt !== undefined,
        d.approvedAt,
        d.endedAt !== undefined,
        d.endedAt,
        status,
        expected,
      ],
      s,
    );
    if (!updated)
      throw new AppError(
        409,
        expected === "ACTIVE" ? "CONTRACT_NOT_ACTIVE" : "CONTRACT_NOT_PENDING",
        "Trạng thái hợp đồng vừa thay đổi",
      );
    return updated;
  }
  async rejectPendingByBedIdExcept(
    ...[bedId, exceptId, reason, s]: Parameters<
      IContractRepository["rejectPendingByBedIdExcept"]
    >
  ): ReturnType<IContractRepository["rejectPendingByBedIdExcept"]> {
    return (
      (
        await query(
          `UPDATE contracts SET status='REJECTED',reject_reason=$3,updated_at=now() WHERE bed_id=$1 AND id<>$2 AND status='PENDING'`,
          [bedId, exceptId, reason],
          s,
        )
      ).rowCount ?? 0
    );
  }
  async findAll(
    ...[q]: Parameters<IContractRepository["findAll"]>
  ): ReturnType<IContractRepository["findAll"]> {
    const order =
      {
        createdAt: "c.created_at",
        startDate: "c.start_date",
        endDate: "c.end_date",
      }[q.sortBy ?? "createdAt"] ?? "c.created_at";
    return page<ContractDocument>(
      `SELECT c.*
      FROM contracts c
      JOIN rooms r ON r.id=c.room_id
      WHERE ($1::text IS NULL OR c.status=$1) AND ($2::uuid IS NULL OR c.student_id=$2) AND ($3::uuid IS NULL OR c.room_id=$3) AND ($4::uuid IS NULL OR r.building_id=$4)`,
      [q.status, q.studentId, q.roomId, q.buildingId],
      q,
      `${order} ${q.sortOrder === "asc" ? "ASC" : "DESC"}, c.id`,
    );
  }
  async findActiveStudentIdsByBuildingId(
    ...[buildingId, s]: Parameters<
      IContractRepository["findActiveStudentIdsByBuildingId"]
    >
  ): ReturnType<IContractRepository["findActiveStudentIdsByBuildingId"]> {
    return (
      await rows<{ id: string }>(
        `SELECT DISTINCT c.student_id AS id
      FROM contracts c
      JOIN rooms r ON r.id=c.room_id
      WHERE r.building_id=$1 AND c.status='ACTIVE'
      ORDER BY id`,
        [buildingId],
        s,
      )
    ).map((x) => x.id);
  }
  async findDisplaySummaries(
    ...[ids]: Parameters<IContractRepository["findDisplaySummaries"]>
  ): ReturnType<IContractRepository["findDisplaySummaries"]> {
    const result = await rows<ContractDisplaySummary & { id: string }>(
      `SELECT c.id,json_build_object('id',s.id,'mssv',s.mssv,'fullName',u.full_name) AS student,json_build_object('id',r.id,'roomNumber',r.room_number,'buildingName',b.name) AS room,json_build_object('id',bed.id,'bedNumber',bed.bed_number) AS bed
      FROM contracts c
      JOIN students s ON s.id=c.student_id
      JOIN users u ON u.id=s.user_id
      JOIN rooms r ON r.id=c.room_id
      JOIN buildings b ON b.id=r.building_id
      JOIN beds bed ON bed.id=c.bed_id
      WHERE c.id=ANY($1::uuid[])`,
      [ids],
    );
    return new Map(result.map(({ id, ...summary }) => [id, summary]));
  }
  async findResidenceHistoryByStudentId(
    ...[id]: Parameters<IContractRepository["findResidenceHistoryByStudentId"]>
  ): ReturnType<IContractRepository["findResidenceHistoryByStudentId"]> {
    return rows<ResidenceHistoryItem>(
      `SELECT c.id AS "contractId",c.status,(c.status='ACTIVE') AS "isCurrent",
 json_build_object('id',b.id,'name',b.name) AS building,json_build_object('id',r.id,'roomNumber',r.room_number) AS room,json_build_object('id',bed.id,'bedNumber',bed.bed_number) AS bed,
 c.start_date AS "segmentStartDate",c.end_date AS "plannedEndDate",c.ended_at AS "actualEndDate",
 CASE WHEN c.status='ENDED' AND c.ended_at IS NULL THEN ARRAY['MISSING_ACTUAL_END_DATE'] ELSE ARRAY[]::text[] END AS "consistencyIssues"

      FROM contracts c
      JOIN students s ON s.id=c.student_id
      JOIN users u ON u.id=s.user_id
      JOIN rooms r ON r.id=c.room_id
      JOIN buildings b ON b.id=r.building_id
      JOIN beds bed ON bed.id=c.bed_id
      WHERE c.student_id=$1 AND (c.status IN ('ACTIVE','ENDED') OR (c.status='CANCELLED' AND c.ended_at IS NOT NULL))
      ORDER BY c.start_date DESC,c.id`,
      [id],
    );
  }
  async findBillingResidenceSegments(
    ...[roomId, s]: Parameters<
      IContractRepository["findBillingResidenceSegments"]
    >
  ): ReturnType<IContractRepository["findBillingResidenceSegments"]> {
    return rows<BillingResidenceSegment>(
      `SELECT c.id AS "contractId",c.student_id,c.status,s.mssv,u.full_name,c.start_date,c.end_date,c.ended_at AS "endedAt",rt.price_per_month AS "roomMonthlyPrice",
 (SELECT min(n.start_date)
      FROM contracts n
      WHERE n.student_id=c.student_id AND n.start_date>c.start_date AND n.status IN ('ACTIVE','ENDED','CANCELLED')) AS "nextSegmentStartDate"

      FROM contracts c
      JOIN students s ON s.id=c.student_id
      JOIN users u ON u.id=s.user_id
      JOIN rooms r ON r.id=c.room_id
      JOIN buildings b ON b.id=r.building_id
      JOIN beds bed ON bed.id=c.bed_id
      JOIN room_types rt ON rt.id=r.room_type_id
      WHERE c.room_id=$1 AND (c.status IN ('ACTIVE','ENDED') OR (c.status='CANCELLED' AND c.ended_at IS NOT NULL))
      ORDER BY c.start_date,c.id`,
      [roomId],
      s,
    );
  }
}
export { PostgresContractRepository as ContractRepository };
