import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { contractApi } from "../../features/contracts/api/contract.api";
import { normalizeApiError } from "../../services/api-client";
import { formatDate, formatDateTime } from "../../utils/date";
import type { Contract } from "../../types/api";

export function AdminContractDetailPage() {
  const { id = "" } = useParams();
  const [item, setItem] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItem(await contractApi.get(id));
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(kind: "approve" | "reject" | "end" | "cancel") {
    if (!item || !window.confirm("Xác nhận thực hiện thao tác này?")) return;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      if (kind === "approve") await contractApi.approve(item.id);
      if (kind === "reject")
        await contractApi.reject(
          item.id,
          window.prompt("Lý do từ chối") ?? undefined,
        );
      if (kind === "end") await contractApi.end(item.id);
      if (kind === "cancel") {
        const reason = window.prompt("Lý do hủy");
        if (!reason) return;
        await contractApi.cancelActive(item.id, reason);
      }
      setFeedback(
        kind === "approve"
          ? "Đã duyệt hợp đồng thành công."
          : "Đã cập nhật hợp đồng thành công.",
      );
      await load();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !item)
    return (
      <ErrorState message={error || "Không tìm thấy hợp đồng"} onRetry={load} />
    );

  return (
    <>
      <PageHeader
        title="Chi tiết hợp đồng"
        description={`Mã hợp đồng: ${item.id}`}
      />

      <div className="card">
        {feedback && (
          <p className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            {feedback}
          </p>
        )}
        <div className="mb-6">
          <StatusBadge status={item.status} />
        </div>

        <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[
            [
              "Sinh viên",
              item.student
                ? `${item.student.fullName} (${item.student.mssv})`
                : "—",
            ],
            [
              "Phòng",
              item.room
                ? `${item.room.roomNumber} · ${item.room.buildingName}`
                : "—",
            ],
            ["Giường", item.bed ? `Giường ${item.bed.bedNumber}` : "—"],
            ["Ngày bắt đầu", formatDate(item.startDate)],
            ["Ngày kết thúc", formatDate(item.endDate)],
            ["Ngày tạo", formatDateTime(item.createdAt)],
            ["Đã duyệt", formatDateTime(item.approvedAt)],
            ["Lý do từ chối", item.rejectReason],
            ["Lý do hủy", item.cancelReason],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                {label}
              </dt>
              <dd className="mt-1">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {item.status === "PENDING" && (
            <>
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => void act("approve")}
              >
                Duyệt
              </button>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => void act("reject")}
              >
                Từ chối
              </button>
            </>
          )}
          {item.status === "ACTIVE" && (
            <>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => void act("end")}
              >
                Kết thúc hợp đồng
              </button>
              <button
                className="btn-danger"
                disabled={busy}
                onClick={() => void act("cancel")}
              >
                Hủy hợp đồng
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
