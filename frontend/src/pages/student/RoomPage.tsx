import { BedDouble, Building2, UsersRound, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { useStudentRoom } from "../../hooks/useStudentRoom";
import { formatDate } from "../../utils/date";

export function StudentRoomPage() {
  const { contract, room, bed, loading, error, reload } = useStudentRoom();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (!contract || !room) {
    return (
      <>
        <PageHeader title="Thông tin phòng" />
        <div className="card">
          <EmptyState message="Bạn chưa có hợp đồng đang hiệu lực" />
          <div className="text-center">
            <Link className="btn-primary" to="/student/contracts">
              Đăng ký ở ngay
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Phòng ${room.roomNumber}`}
        description={`${room.building?.name ?? "Tòa nhà"} · Tầng ${room.floor}`}
        action={<StatusBadge status={contract.status} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RoomFact
          icon={Building2}
          label="Tòa nhà"
          value={room.building?.name}
        />
        <RoomFact icon={BedDouble} label="Giường" value={bed?.bedNumber} />
        <RoomFact
          icon={UsersRound}
          label="Loại phòng"
          value={`${room.roomType.name} · ${room.roomType.capacity} người`}
        />
        <RoomFact
          icon={WalletCards}
          label="Giá mỗi tháng"
          value={`${room.roomType.pricePerMonth.toLocaleString("vi-VN")} ₫`}
        />
      </div>
      <section className="card mt-6">
        <h2 className="text-lg font-bold">Hợp đồng đang hiệu lực</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Info label="Mã hợp đồng" value={contract.id} />
          <Info
            label="Trạng thái phòng"
            value={<StatusBadge status={room.status} />}
          />
          <Info label="Ngày bắt đầu" value={formatDate(contract.startDate)} />
          <Info label="Ngày kết thúc" value={formatDate(contract.endDate)} />
          <Info label="Số giường" value={`${room.totalBedCount} giường`} />
          <Info label="Giường trống" value={`${room.emptyBedCount} giường`} />
        </dl>
      </section>
    </>
  );
}

function RoomFact({
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
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
