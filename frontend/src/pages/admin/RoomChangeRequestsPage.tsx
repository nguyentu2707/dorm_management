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
import { roomChangeApi } from "../../features/room-change-requests/api/room-change.api";
import { normalizeApiError } from "../../services/api-client";
import { formatDateTime } from "../../utils/date";
import type { Paginated, RoomChangeRequest } from "../../types/api";
export function AdminRoomChangeRequestsPage() {
  const [search, setSearch] = useSearchParams(),
    [result, setResult] = useState<Paginated<RoomChangeRequest> | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [action, setAction] = useState<{
      kind: "approve" | "reject";
      item: RoomChangeRequest;
    } | null>(null);
  const page = Number(search.get("page") ?? 1),
    status = search.get("status") ?? "";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(
        await roomChangeApi.adminList({
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
  async function run(reason?: string) {
    if (!action) return;
    try {
      if (action.kind === "approve")
        await roomChangeApi.approve(action.item.id);
      else await roomChangeApi.reject(action.item.id, reason);
      setAction(null);
      await load();
    } catch (e) {
      const err = normalizeApiError(e);
      setError(
        err.code === "TARGET_BED_NOT_AVAILABLE"
          ? "Giường đích không còn trống."
          : err.code === "CONTRACT_NOT_ACTIVE"
            ? "Hợp đồng hiện tại không còn hiệu lực."
            : err.message,
      );
      setAction(null);
      await load();
    }
  }
  return (
    <>
      <PageHeader
        title="Yêu cầu chuyển phòng"
        description="Duyệt yêu cầu và đồng bộ hợp đồng, phòng, giường"
      />
      <div className="card mb-5 max-w-sm">
        <select
          className="field"
          value={status}
          onChange={(e) => setSearch({ status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => (
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
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Sinh viên</th>
                <th>Hợp đồng hiện tại</th>
                <th>Giường đích</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((i) => (
                <tr className="border-b" key={i.id}>
                  <td className="p-3">{i.studentId}</td>
                  <td>{i.currentContractId}</td>
                  <td>{i.targetBedId}</td>
                  <td>{i.reason ?? "—"}</td>
                  <td>
                    <StatusBadge status={i.status} />
                  </td>
                  <td>{formatDateTime(i.createdAt)}</td>
                  <td>
                    {i.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          className="btn-primary"
                          onClick={() =>
                            setAction({ kind: "approve", item: i })
                          }
                        >
                          Duyệt
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => setAction({ kind: "reject", item: i })}
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
        <Modal open title="Từ chối yêu cầu" onClose={() => setAction(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                String(new FormData(e.currentTarget).get("reason") ?? ""),
              );
            }}
          >
            <textarea
              className="field"
              name="reason"
              maxLength={500}
              placeholder="Lý do"
            />
            <button className="btn-primary mt-4 w-full">Xác nhận</button>
          </form>
        </Modal>
      ) : (
        <ConfirmDialog
          open={action?.kind === "approve"}
          title="Duyệt chuyển phòng"
          message="Duyệt yêu cầu chuyển phòng? Hệ thống sẽ cập nhật hợp đồng và hai giường trong một transaction."
          onClose={() => setAction(null)}
          onConfirm={() => run()}
        />
      )}
    </>
  );
}
