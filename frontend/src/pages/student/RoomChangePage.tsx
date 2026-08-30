import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { roomChangeApi } from "../../features/room-change-requests/api/room-change.api";
import { normalizeApiError } from "../../services/api-client";
import { formatDateTime } from "../../utils/date";
import type { RoomChangeRequest } from "../../types/api";
export function StudentRoomChangePage() {
  const [items, setItems] = useState<RoomChangeRequest[]>([]),
    [open, setOpen] = useState(false),
    [cancel, setCancel] = useState<RoomChangeRequest | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await roomChangeApi.mine());
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await roomChangeApi.create(
        String(f.get("targetBedId")),
        String(f.get("reason") || "") || undefined,
      );
      setOpen(false);
      await load();
    } catch (err) {
      setError(normalizeApiError(err).message);
    }
  }
  return (
    <>
      <PageHeader
        title="Yêu cầu chuyển phòng"
        description="Theo dõi các yêu cầu đổi chỗ ở"
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            Tạo yêu cầu
          </button>
        }
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <article
              className="card flex flex-wrap justify-between gap-3"
              key={i.id}
            >
              <div>
                <StatusBadge status={i.status} />
                <p className="mt-3 font-medium">Giường đích: {i.targetBedId}</p>
                <p className="text-sm text-slate-500">
                  {i.reason || "Không có lý do"} · {formatDateTime(i.createdAt)}
                </p>
              </div>
              {i.status === "PENDING" && (
                <button
                  className="btn-secondary text-red-600"
                  onClick={() => setCancel(i)}
                >
                  Hủy
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <Modal
        open={open}
        title="Tạo yêu cầu chuyển phòng"
        onClose={() => setOpen(false)}
      >
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Tạm nhập Target Bed ID vì backend chưa expose danh sách giường cho
          STUDENT.
        </div>
        <form className="space-y-4" onSubmit={create}>
          <label>
            <span className="label">Target Bed ID</span>
            <input
              className="field"
              name="targetBedId"
              required
              pattern="[a-fA-F0-9]{24}"
            />
          </label>
          <label>
            <span className="label">Lý do</span>
            <textarea className="field" name="reason" maxLength={500} />
          </label>
          <button className="btn-primary w-full">Gửi yêu cầu</button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!cancel}
        title="Hủy yêu cầu"
        message="Bạn có chắc muốn hủy yêu cầu đang chờ?"
        onClose={() => setCancel(null)}
        onConfirm={async () => {
          if (cancel) await roomChangeApi.cancel(cancel.id);
          setCancel(null);
          await load();
        }}
      />
    </>
  );
}
