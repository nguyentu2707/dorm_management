import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { checkoutApi } from "../../features/checkout-requests/api/checkout.api";
import { normalizeApiError } from "../../services/api-client";
import { formatDateTime } from "../../utils/date";
import type { CheckoutRequest, Paginated } from "../../types/api";
export function AdminCheckoutRequestsPage() {
  const [search, setSearch] = useSearchParams();
  const [result, setResult] = useState<Paginated<CheckoutRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState<{
    kind: "approve" | "reject";
    item: CheckoutRequest;
  } | null>(null);
  const page = Number(search.get("page") ?? 1),
    status = search.get("status") ?? "";
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(
        await checkoutApi.list({
          page,
          limit: 20,
          status: status || undefined,
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [page, status]);
  useEffect(() => {
    void load();
  }, [load]);
  async function run(rejectReason?: string) {
    if (!action) return;
    try {
      if (action.kind === "approve") await checkoutApi.approve(action.item.id);
      else await checkoutApi.reject(action.item.id, rejectReason);
      setMessage(
        action.kind === "approve"
          ? "Đã duyệt trả phòng."
          : "Đã từ chối yêu cầu.",
      );
      setAction(null);
      await load();
    } catch (e) {
      setError(normalizeApiError(e).message);
      setAction(null);
      await load();
    }
  }
  return (
    <>
      <PageHeader
        title="Yêu cầu trả phòng"
        description="Duyệt kết thúc hợp đồng và giải phóng giường"
      />
      {message && (
        <p className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      )}
      <div className="card mb-5 max-w-sm">
        <select
          className="field"
          value={status}
          onChange={(e) => setSearch({ status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !result?.items.length ? (
        <div className="card">
          <EmptyState />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Sinh viên</th>
                <th>Phòng / Giường</th>
                <th>Ngày yêu cầu</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((x) => (
                <tr className="border-b" key={x.id}>
                  <td className="p-3">
                    <strong className="block">
                      {x.student?.fullName ?? "—"}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {x.student?.mssv ?? "—"}
                    </span>
                  </td>
                  <td>
                    {x.room
                      ? `${x.room.buildingName} - ${x.room.roomNumber}`
                      : "—"}
                    <br />
                    <span className="text-xs text-slate-500">
                      Giường {x.bed?.bedNumber ?? "—"}
                    </span>
                  </td>
                  <td>{formatDateTime(x.createdAt)}</td>
                  <td>{x.reason || x.cancelReason || "—"}</td>
                  <td>
                    <StatusBadge status={x.status} />
                  </td>
                  <td>
                    {x.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          className="btn-primary"
                          onClick={() =>
                            setAction({ kind: "approve", item: x })
                          }
                        >
                          Duyệt
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => setAction({ kind: "reject", item: x })}
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            meta={result.pagination}
            onChange={(p) => setSearch({ status, page: String(p) })}
          />
        </div>
      )}
      {action?.kind === "reject" ? (
        <Modal open title="Từ chối trả phòng" onClose={() => setAction(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                String(new FormData(e.currentTarget).get("reason") || ""),
              );
            }}
          >
            <textarea className="field" name="reason" maxLength={1000} />
            <button className="btn-primary mt-4 w-full">Xác nhận</button>
          </form>
        </Modal>
      ) : (
        <ConfirmDialog
          open={action?.kind === "approve"}
          title="Xác nhận trả phòng?"
          message="Hợp đồng hiện tại sẽ kết thúc và giường sẽ được giải phóng."
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        />
      )}
    </>
  );
}
