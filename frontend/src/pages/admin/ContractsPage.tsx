import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { contractApi } from "../../features/contracts/api/contract.api";
import { AdminContractRegistrationModal } from "../../features/contracts/components/AdminContractRegistrationModal";
import { normalizeApiError } from "../../services/api-client";
import { formatDate, formatDateTime } from "../../utils/date";
import type { Contract, Paginated } from "../../types/api";
type Action = {
  kind: "approve" | "reject" | "end" | "cancel";
  contract: Contract;
};
export function AdminContractsPage() {
  const [search, setSearch] = useSearchParams(),
    [result, setResult] = useState<Paginated<Contract> | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [action, setAction] = useState<Action | null>(null),
    [createOpen, setCreateOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const page = Number(search.get("page") ?? 1),
    status = search.get("status") ?? "";
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(
        await contractApi.adminList({
          page,
          limit: 20,
          status: status || undefined,
          studentId: search.get("studentId") || undefined,
          roomId: search.get("roomId") || undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);
  useEffect(() => {
    void load();
  }, [load]);
  async function runAction(reason?: string) {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === "approve")
        await contractApi.approve(action.contract.id);
      if (action.kind === "reject")
        await contractApi.reject(action.contract.id, reason);
      if (action.kind === "end") await contractApi.end(action.contract.id);
      if (action.kind === "cancel")
        await contractApi.cancelActive(action.contract.id, reason ?? "");
      setFeedback(
        action.kind === "approve"
          ? "Đã duyệt hợp đồng thành công."
          : "Đã cập nhật hợp đồng thành công.",
      );
      setAction(null);
      await load();
    } catch (e) {
      const err = normalizeApiError(e);
      setError(
        err.code === "BED_NOT_AVAILABLE"
          ? "Giường đã được đăng ký cho hợp đồng khác."
          : err.code === "ROOM_NOT_AVAILABLE"
            ? "Phòng hiện không khả dụng."
            : err.message,
      );
      setAction(null);
      await load();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Hợp đồng"
        description="Duyệt và quản lý vòng đời hợp đồng"
        action={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={17} />
            Tạo hợp đồng
          </button>
        }
      />
      {feedback && (
        <p className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {feedback}
        </p>
      )}
      <div className="card mb-5 max-w-sm">
        <select
          className="field"
          value={status}
          onChange={(e) => setSearch({ status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          {["PENDING", "ACTIVE", "ENDED", "CANCELLED", "REJECTED"].map((s) => (
            <option key={s}>{s}</option>
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="p-3">Sinh viên</th>
                <th>Phòng / Giường</th>
                <th>Thời hạn</th>
                <th>Trạng thái</th>
                <th>Tạo lúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((c) => (
                <tr className="border-b" key={c.id}>
                  <td className="p-3">
                    <strong className="block">
                      {c.student?.fullName ?? "Sinh viên"}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {c.student?.mssv ?? "—"}
                    </span>
                  </td>
                  <td>
                    <strong>{c.room?.roomNumber ?? "—"}</strong>
                    <span className="ml-2 text-xs text-slate-500">
                      {c.room?.buildingName}
                    </span>
                    <br />
                    <span className="text-xs text-slate-500">
                      Giường {c.bed?.bedNumber ?? "—"}
                    </span>
                  </td>
                  <td>
                    {formatDate(c.startDate)} – {formatDate(c.endDate)}
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{formatDateTime(c.createdAt)}</td>
                  <td>
                    <div className="flex gap-2">
                      <Link
                        className="btn-secondary"
                        to={`/admin/contracts/${c.id}`}
                      >
                        Xem
                      </Link>
                      {c.status === "PENDING" && (
                        <>
                          <button
                            className="btn-primary"
                            onClick={() =>
                              setAction({ kind: "approve", contract: c })
                            }
                          >
                            Duyệt
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() =>
                              setAction({ kind: "reject", contract: c })
                            }
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                      {c.status === "ACTIVE" && (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={() =>
                              setAction({ kind: "end", contract: c })
                            }
                          >
                            Kết thúc
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() =>
                              setAction({ kind: "cancel", contract: c })
                            }
                          >
                            Hủy
                          </button>
                        </>
                      )}
                    </div>
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
      <AdminContractRegistrationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
      {action && (action.kind === "reject" || action.kind === "cancel") ? (
        <ReasonModal
          title={
            action.kind === "reject"
              ? "Từ chối hợp đồng"
              : "Hủy hợp đồng đang hiệu lực"
          }
          required={action.kind === "cancel"}
          busy={busy}
          onClose={() => setAction(null)}
          onSubmit={runAction}
        />
      ) : (
        <ConfirmDialog
          open={!!action}
          title={
            action?.kind === "approve" ? "Duyệt hợp đồng" : "Kết thúc hợp đồng"
          }
          message={
            action?.kind === "approve"
              ? "Bạn có chắc muốn duyệt hợp đồng này?"
              : "Kết thúc hợp đồng và trả giường?"
          }
          busy={busy}
          onClose={() => setAction(null)}
          onConfirm={() => runAction()}
        />
      )}
    </>
  );
}
function ReasonModal({
  title,
  required,
  busy,
  onClose,
  onSubmit,
}: {
  title: string;
  required: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  return (
    <Modal open title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(String(new FormData(e.currentTarget).get("reason") ?? ""));
        }}
      >
        <label>
          <span className="label">Lý do</span>
          <textarea
            className="field"
            name="reason"
            required={required}
            maxLength={500}
          />
        </label>
        <button className="btn-primary mt-4 w-full" disabled={busy}>
          Xác nhận
        </button>
      </form>
    </Modal>
  );
}
