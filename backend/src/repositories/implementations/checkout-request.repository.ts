import type { ICheckoutRequestRepository } from "../interfaces/checkout-request.repository.interface.js";
import type { CheckoutRequestDocument } from "../../models/checkout-request.model.js";
import type { CheckoutSummary } from "../interfaces/checkout-request.repository.interface.js";
import {
  query,
  rows,
  one,
  required,
  count,
  page,
  contains,
} from "../../database/query.js";
export class PostgresCheckoutRequestRepository implements ICheckoutRequestRepository {
  async findById(
    ...[id, s]: Parameters<ICheckoutRequestRepository["findById"]>
  ): ReturnType<ICheckoutRequestRepository["findById"]> {
    return one<CheckoutRequestDocument>(
      `SELECT * FROM checkout_requests WHERE id=$1 ${s ? "FOR UPDATE" : ""}`,
      [id],
      s,
    );
  }
  async findByStudentId(
    ...[id]: Parameters<ICheckoutRequestRepository["findByStudentId"]>
  ): ReturnType<ICheckoutRequestRepository["findByStudentId"]> {
    return rows<CheckoutRequestDocument>(
      `SELECT * FROM checkout_requests WHERE student_id=$1 ORDER BY created_at DESC,id`,
      [id],
      undefined,
    );
  }
  async findPendingByStudentId(
    ...[id, s]: Parameters<ICheckoutRequestRepository["findPendingByStudentId"]>
  ): ReturnType<ICheckoutRequestRepository["findPendingByStudentId"]> {
    return one<CheckoutRequestDocument>(
      `SELECT * FROM checkout_requests WHERE student_id=$1 AND status='PENDING'`,
      [id],
      s,
    );
  }
  async create(
    ...[d, s]: Parameters<ICheckoutRequestRepository["create"]>
  ): ReturnType<ICheckoutRequestRepository["create"]> {
    return required<CheckoutRequestDocument>(
      `INSERT INTO checkout_requests (student_id, contract_id, room_id, reason, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [d.studentId, d.contractId, d.roomId, d.reason, d.status],
      s,
    );
  }
  async findAll(
    ...[q]: Parameters<ICheckoutRequestRepository["findAll"]>
  ): ReturnType<ICheckoutRequestRepository["findAll"]> {
    return page<CheckoutRequestDocument>(
      `SELECT * FROM checkout_requests WHERE ($1::text IS NULL OR status=$1)`,
      [q.status],
      q,
      "created_at DESC,id",
    );
  }
  async updatePending(
    ...[id, status, d = {}, s]: Parameters<
      ICheckoutRequestRepository["updatePending"]
    >
  ): ReturnType<ICheckoutRequestRepository["updatePending"]> {
    return one<CheckoutRequestDocument>(
      `UPDATE checkout_requests
      SET processed_by = CASE WHEN $2::boolean THEN $3 ELSE processed_by END, processed_at = CASE WHEN $4::boolean THEN $5 ELSE processed_at END, reject_reason = CASE WHEN $6::boolean THEN $7 ELSE reject_reason END, cancel_reason = CASE WHEN $8::boolean THEN $9 ELSE cancel_reason END, updated_at = now() , status = $10
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
        d.cancelReason !== undefined,
        d.cancelReason,
        status,
      ],
      s,
    );
  }
  async cancelPendingByContractId(
    ...[contractId, reason, s]: Parameters<
      ICheckoutRequestRepository["cancelPendingByContractId"]
    >
  ): ReturnType<ICheckoutRequestRepository["cancelPendingByContractId"]> {
    await query(
      `UPDATE checkout_requests
      SET status='CANCELLED',cancel_reason=$2,processed_at=now(),updated_at=now()
      WHERE contract_id=$1 AND status='PENDING'`,
      [contractId, reason],
      s,
    );
  }
  async findSummaries(
    ...[ids]: Parameters<ICheckoutRequestRepository["findSummaries"]>
  ): ReturnType<ICheckoutRequestRepository["findSummaries"]> {
    const result = await rows<CheckoutSummary & { id: string }>(
      `SELECT req.id,json_build_object('id',s.id,'mssv',s.mssv,'fullName',u.full_name) AS student,json_build_object('id',r.id,'roomNumber',r.room_number,'buildingName',b.name) AS room,json_build_object('id',bed.id,'bedNumber',bed.bed_number) AS bed,json_build_object('id',c.id,'startDate',c.start_date,'endDate',c.end_date) AS contract
      FROM checkout_requests req
      JOIN contracts c ON c.id=req.contract_id
      JOIN students s ON s.id=req.student_id
      JOIN users u ON u.id=s.user_id
      JOIN rooms r ON r.id=req.room_id
      JOIN buildings b ON b.id=r.building_id
      JOIN beds bed ON bed.id=c.bed_id
      WHERE req.id=ANY($1::uuid[])`,
      [ids],
    );
    return new Map(
      result.map(({ id, ...summary }) => [
        id,
        {
          ...summary,
          contract: {
            ...summary.contract,
            startDate: new Date(summary.contract.startDate),
            endDate: new Date(summary.contract.endDate),
          },
        },
      ]),
    );
  }
}
export { PostgresCheckoutRequestRepository as CheckoutRequestRepository };
