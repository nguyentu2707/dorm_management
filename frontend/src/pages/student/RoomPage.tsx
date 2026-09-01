import { useCallback, useEffect, useState } from "react";
import {
  BedDouble,
  Building2,
  RefreshCw,
  WalletCards,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { ConfirmDialog } from "../../components/ui/Modal";
import { contractApi } from "../../features/contracts/api/contract.api";
import { studentFacilityApi } from "../../features/student-facilities/api/student-facility.api";
import { roomChangeApi } from "../../features/room-change-requests/api/room-change.api";
import { normalizeApiError } from "../../services/api-client";
import { formatDate, formatDateTime } from "../../utils/date";
import type {
  Bed,
  Contract,
  RoomChangeRequest,
  StudentRoom,
} from "../../types/api";
export function StudentRoomPage() {
  const [contracts, setContracts] = useState<Contract[]>([]),
    [changes, setChanges] = useState<RoomChangeRequest[]>([]),
    [room, setRoom] = useState<StudentRoom | null>(null),
    [bed, setBed] = useState<Bed | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [cancel, setCancel] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [all, requests] = await Promise.all([
        contractApi.mine(),
        roomChangeApi.mine(),
      ]);
      setContracts(all);
      setChanges(requests);
      const current =
        all.find((x) => x.status === "ACTIVE") ??
        all.find((x) => x.status === "PENDING");
      if (current) {
        const detail = await studentFacilityApi.room(current.roomId);
        setRoom(detail);
        setBed(detail.beds?.find((x) => x.id === current.bedId) ?? null);
      } else {
        setRoom(null);
        setBed(null);
      }
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  const active = contracts.find((x) => x.status === "ACTIVE"),
    pending = contracts.find((x) => x.status === "PENDING"),
    current = active ?? pending;
  if (!current)
    return (
      <>
        <PageHeader
          title="Thông tin phòng"
          description="Trung tâm quản lý chỗ ở của bạn."
        />
        <div className="card py-12 text-center">
          <Building2 className="mx-auto text-slate-400" size={40} />
          <h2 className="mt-4 text-lg font-bold">
            Bạn chưa đăng ký phòng ở ký túc xá
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Chọn tòa, phòng và giường còn trống để gửi đăng ký.
          </p>
          <Link className="btn-primary mt-5" to="/student/room/register">
            Đăng ký phòng
          </Link>
        </div>
      </>
    );
  if (pending)
    return (
      <>
        <PageHeader
          title="Đăng ký phòng đang chờ duyệt"
          description="Đang chờ Ban quản lý duyệt."
          action={<StatusBadge status="PENDING" />}
        />
        <section className="card">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Tòa nhà" value={room?.building?.name} />
            <Info label="Phòng" value={room?.roomNumber} />
            <Info label="Giường" value={bed?.bedNumber} />
            <Info label="Ngày đăng ký" value={formatDate(pending.createdAt)} />
            <Info label="Bắt đầu" value={formatDate(pending.startDate)} />
            <Info label="Kết thúc" value={formatDate(pending.endDate)} />
          </dl>
          <button
            className="btn-secondary mt-6 text-red-600"
            onClick={() => setCancel(true)}
          >
            Hủy đăng ký
          </button>
        </section>
        <ConfirmDialog
          open={cancel}
          title="Hủy đăng ký"
          message="Bạn có chắc muốn hủy đăng ký đang chờ duyệt?"
          onClose={() => setCancel(false)}
          onConfirm={async () => {
            await contractApi.cancel(pending.id);
            setCancel(false);
            await load();
          }}
        />
      </>
    );
  const pendingChange = changes.find((x) => x.status === "PENDING");
  return (
    <>
      <PageHeader
        title={`Phòng ${room?.roomNumber ?? ""}`}
        description={`${room?.building?.name ?? "Tòa nhà"} · Tầng ${room?.floor ?? "—"}`}
        action={<StatusBadge status="ACTIVE" />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Fact icon={Building2} label="Tòa nhà" value={room?.building?.name} />
        <Fact icon={BedDouble} label="Giường" value={bed?.bedNumber} />
        <Fact
          icon={RefreshCw}
          label="Loại phòng"
          value={
            room
              ? `${room.roomType.name} · ${room.roomType.capacity} người`
              : undefined
          }
        />
        <Fact
          icon={WalletCards}
          label="Giá mỗi tháng"
          value={
            room
              ? `${room.roomType.pricePerMonth.toLocaleString("vi-VN")}đ`
              : undefined
          }
        />
      </div>
      <section className="card mt-6">
        <div className="flex justify-between">
          <h2 className="text-lg font-bold">Hợp đồng ở</h2>
          <StatusBadge status="ACTIVE" />
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info label="Mã hợp đồng" value={active?.id} />
          <Info
            label="Thời hạn"
            value={`${formatDate(active?.startDate)} → ${formatDate(active?.endDate)}`}
          />
          <Info
            label="Phê duyệt lúc"
            value={formatDateTime(active?.approvedAt)}
          />
          <Info label="Trạng thái phòng" value={room?.status} />
        </dl>
      </section>
      <section id="room-change" className="card mt-6">
        <h2 className="text-lg font-bold">Chuyển phòng</h2>
        {pendingChange ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-4">
            <StatusBadge status="PENDING" />
            <p className="mt-2 font-medium">Yêu cầu đang chờ duyệt</p>
            <p className="text-sm text-slate-600">
              Giường đích: {pendingChange.targetBedId}
            </p>
            <p className="text-sm text-slate-600">
              {pendingChange.reason || "Không có lý do"}
            </p>
            <Link
              className="btn-secondary mt-3"
              to="/student/room-change-requests"
            >
              Xem và hủy yêu cầu
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-slate-500">
              Bạn chưa có yêu cầu chuyển phòng đang chờ xử lý.
            </p>
            <Link
              className="btn-primary mt-4"
              to="/student/room-change-requests"
            >
              Yêu cầu chuyển phòng
            </Link>
          </div>
        )}
        {changes.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <h3 className="font-semibold">Lịch sử gần đây</h3>
            {changes.slice(0, 3).map((x) => (
              <div key={x.id} className="mt-2 flex justify-between text-sm">
                <span>{formatDateTime(x.createdAt)}</span>
                <StatusBadge status={x.status} />
              </div>
            ))}
          </div>
        )}
      </section>
      <Link className="btn-secondary mt-6" to="/student/maintenance">
        <Wrench size={17} /> Báo hỏng thiết bị
      </Link>
    </>
  );
}
function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value?: string;
}) {
  return (
    <article className="card">
      <Icon className="text-brand-600" />
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value || "—"}</p>
    </article>
  );
}
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium">{value || "—"}</dd>
    </div>
  );
}
