import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { auditLogApi } from "../../features/audit-logs/api/audit-log.api";
import { normalizeApiError } from "../../services/api-client";
import type { AuditLog, Paginated } from "../../types/api";
const labels: Record<string, string> = {
  PAYMENT_CONFIRMED: "Xác nhận thanh toán",
  PAYMENT_REJECTED: "Từ chối thanh toán",
  PAYMENT_VOIDED: "Hủy hiệu lực thanh toán",
  CONTRACT_APPROVED: "Duyệt hợp đồng",
  CONTRACT_REJECTED: "Từ chối hợp đồng",
  CONTRACT_ENDED: "Kết thúc hợp đồng",
  ROOM_CHANGE_APPROVED: "Duyệt chuyển phòng",
  ROOM_CHANGE_REJECTED: "Từ chối chuyển phòng",
  CHECKOUT_APPROVED: "Duyệt trả phòng",
  CHECKOUT_REJECTED: "Từ chối trả phòng",
  MAINTENANCE_ASSIGNED: "Phân công bảo trì",
  MAINTENANCE_REASSIGNED: "Phân công lại bảo trì",
  MAINTENANCE_RESOLVED: "Hoàn tất bảo trì",
  MAINTENANCE_CANCELLED: "Hủy yêu cầu bảo trì",
  MONTHLY_BILLING_FINALIZED: "Hoàn tất kỳ hóa đơn",
  MONTHLY_BILLING_CANCELLED: "Hủy kỳ hóa đơn",
  STAFF_CREATED: "Tạo nhân viên",
  STAFF_UPDATED: "Cập nhật nhân viên",
  STAFF_ACTIVATED: "Kích hoạt nhân viên",
  STAFF_DEACTIVATED: "Vô hiệu hóa nhân viên",
  BUILDING_STATUS_CHANGED: "Đổi trạng thái tòa nhà",
  BUILDING_GENDER_CHANGED: "Đổi giới tính tòa nhà",
  ROOM_STATUS_CHANGED: "Đổi trạng thái phòng",
  ROOM_TYPE_CHANGED: "Đổi loại phòng",
  ROOM_TYPE_PRICE_CHANGED: "Đổi giá loại phòng",
};
const json = (v?: Record<string, unknown>) =>
  v ? (
    <pre className="overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
      {JSON.stringify(v, null, 2)}
    </pre>
  ) : (
    <p className="text-sm text-slate-400">Không có dữ liệu</p>
  );
export function AdminAuditLogsPage() {
  const [data, setData] = useState<Paginated<AuditLog> | null>(null),
    [page, setPage] = useState(1),
    [entityType, setEntityType] = useState(""),
    [action, setAction] = useState(""),
    [dateFrom, setDateFrom] = useState(""),
    [dateTo, setDateTo] = useState(""),
    [detail, setDetail] = useState<AuditLog | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        await auditLogApi.list({
          page,
          limit: 20,
          entityType: entityType || undefined,
          action: Object.hasOwn(labels, action) ? action : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action, dateFrom, dateTo]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <PageHeader
        title="Nhật ký hệ thống"
        description="Lịch sử chỉ đọc của các thao tác nghiệp vụ quan trọng."
      />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <input
          className="field"
          placeholder="Mã hành động"
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value.toUpperCase());
          }}
        />
        <select
          className="field"
          value={entityType}
          onChange={(e) => {
            setPage(1);
            setEntityType(e.target.value);
          }}
        >
          <option value="">Mọi đối tượng</option>
          {[
            "BUILDING",
            "ROOM",
            "ROOM_TYPE",
            "CONTRACT",
            "ROOM_CHANGE_REQUEST",
            "CHECKOUT_REQUEST",
            "MAINTENANCE_REQUEST",
            "MONTHLY_BILLING",
            "PAYMENT",
            "STAFF",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <input
          className="field"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          className="field"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Thời gian</th>
                <th>Người thao tác</th>
                <th>Hành động</th>
                <th>Đối tượng</th>
                <th>Mô tả</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((x) => (
                <tr
                  className="cursor-pointer border-b hover:bg-slate-50"
                  key={x.id}
                  onClick={async () => {
                    try {
                      setDetail(await auditLogApi.detail(x.id));
                    } catch (e) {
                      setError(normalizeApiError(e).message);
                    }
                  }}
                >
                  <td className="p-3 whitespace-nowrap">
                    {new Date(x.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td>{x.actor?.fullName ?? "Hệ thống/Tài khoản đã xóa"}</td>
                  <td>{labels[x.action] ?? x.action}</td>
                  <td>
                    {x.entityType}
                    <div className="max-w-40 truncate text-xs text-slate-400">
                      {x.entityId}
                    </div>
                  </td>
                  <td>{labels[x.action] ?? x.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && <Pagination meta={data.pagination} onChange={setPage} />}
        </div>
      )}
      <Modal
        open={!!detail}
        title={detail ? (labels[detail.action] ?? detail.action) : "Chi tiết"}
        onClose={() => setDetail(null)}
        size="lg"
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <p>
              <b>Đối tượng:</b> {detail.entityType} · {detail.entityId}
            </p>
            <p>
              <b>Người thao tác:</b>{" "}
              {detail.actor?.fullName ?? "Hệ thống/Tài khoản đã xóa"}
            </p>
            <div>
              <b>Trước thay đổi</b>
              {json(detail.oldData)}
            </div>
            <div>
              <b>Sau thay đổi</b>
              {json(detail.newData)}
            </div>
            <div>
              <b>Metadata</b>
              {json(detail.metadata)}
            </div>
            <p className="text-xs text-slate-500">
              Request ID: {detail.requestId ?? "—"} · IP:{" "}
              {detail.ipAddress ?? "—"}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
