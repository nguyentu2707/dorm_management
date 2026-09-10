import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  RoomBedSelector,
  type RoomBedSelection,
} from "../../components/common/RoomBedSelector";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { roomChangeApi } from "../../features/room-change-requests/api/room-change.api";
import { checkoutApi } from "../../features/checkout-requests/api/checkout.api";
import { useStudentRoom } from "../../hooks/useStudentRoom";
import { normalizeApiError } from "../../services/api-client";
import { formatDateTime } from "../../utils/date";
import type { RoomChangeRequest } from "../../types/api";

const roomLabel = (room?: RoomChangeRequest["targetRoom"]) =>
  room
    ? `${room.buildingName} - ${room.roomNumber} · Giường ${room.bedNumber}`
    : "—";

export function StudentRoomChangePage() {
  const current = useStudentRoom();
  const [items, setItems] = useState<RoomChangeRequest[]>([]);
  const [selection, setSelection] = useState<RoomBedSelection>({});
  const [open, setOpen] = useState(false);
  const [cancel, setCancel] = useState<RoomChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [requests, checkouts] = await Promise.all([
        roomChangeApi.mine(),
        checkoutApi.mine(),
      ]);
      setItems(requests);
      setCheckoutPending(checkouts.some((item) => item.status === "PENDING"));
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const pending = items.find((item) => item.status === "PENDING");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection.bed) return;
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await roomChangeApi.create(
        selection.bed.id,
        String(form.get("reason") || "") || undefined,
      );
      setOpen(false);
      setSelection({});
      await load();
    } catch (requestError) {
      const issue = normalizeApiError(requestError);
      setError(
        issue.code === "TARGET_BED_NOT_AVAILABLE"
          ? "Giường đích vừa được người khác chọn. Vui lòng chọn lại."
          : issue.message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || current.loading) return <LoadingState />;
  if (current.error)
    return <ErrorState message={current.error} onRetry={current.reload} />;
  return (
    <>
      <PageHeader
        title="Yêu cầu chuyển phòng"
        description="Chọn tòa nhà, phòng và giường mới phù hợp."
        action={
          !pending && !checkoutPending && current.contract ? (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={17} />
              Yêu cầu chuyển phòng
            </button>
          ) : undefined
        }
      />
      {error && <ErrorState message={error} onRetry={load} />}
      {!current.contract ? (
        <div className="card">
          <EmptyState message="Bạn cần có hợp đồng đang hoạt động để yêu cầu chuyển phòng." />
        </div>
      ) : pending ? (
        <section className="card space-y-4">
          <StatusBadge status="PENDING" />
          <h2 className="text-lg font-bold">Đang chờ duyệt</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Summary label="Từ" value={roomLabel(pending.currentRoom)} />
            <Summary label="Đến" value={roomLabel(pending.targetRoom)} />
            <Summary label="Lý do" value={pending.reason || "Không có lý do"} />
            <Summary
              label="Ngày gửi"
              value={formatDateTime(pending.createdAt)}
            />
          </dl>
          <button
            className="btn-secondary text-red-600"
            onClick={() => setCancel(pending)}
          >
            Hủy yêu cầu
          </button>
        </section>
      ) : checkoutPending ? (
        <div className="card">
          <EmptyState message="Bạn đang có yêu cầu trả phòng chờ xử lý. Hãy hủy yêu cầu đó trước khi chuyển phòng." />
        </div>
      ) : (
        <div className="card">
          <EmptyState message="Bạn chưa có yêu cầu chuyển phòng đang chờ xử lý." />
        </div>
      )}

      {items.some((item) => item.status !== "PENDING") && (
        <section className="card mt-5">
          <h2 className="font-bold">Lịch sử gần đây</h2>
          <div className="mt-3 space-y-3">
            {items
              .filter((item) => item.status !== "PENDING")
              .slice(0, 5)
              .map((item) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-sm"
                  key={item.id}
                >
                  <div>
                    <p className="font-medium">{roomLabel(item.targetRoom)}</p>
                    <p className="text-slate-500">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
          </div>
        </section>
      )}

      <Modal
        open={open && !pending && !checkoutPending}
        title="Tạo yêu cầu chuyển phòng"
        onClose={() => setOpen(false)}
      >
        <div className="mb-4 rounded-lg bg-slate-50 p-4 text-sm">
          <strong>Phòng hiện tại</strong>
          <p className="mt-1">
            {current.room?.building?.name} - {current.room?.roomNumber} · Giường{" "}
            {current.bed?.bedNumber}
          </p>
        </div>
        <form className="space-y-4" onSubmit={create}>
          <RoomBedSelector
            excludeRoomId={current.room?.id}
            onChange={setSelection}
          />
          {selection.room && selection.bed && (
            <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
              <strong>Xác nhận phòng muốn chuyển</strong>
              <p className="mt-1">
                {selection.building?.name} - {selection.room.roomNumber} ·
                Giường {selection.bed.bedNumber}
              </p>
              <p>
                {selection.room.roomType.pricePerMonth.toLocaleString("vi-VN")}đ
                / tháng
              </p>
            </div>
          )}
          <label>
            <span className="label">Lý do</span>
            <textarea className="field" name="reason" maxLength={500} />
          </label>
          <button
            className="btn-primary w-full"
            disabled={!selection.bed || submitting}
          >
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
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

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
