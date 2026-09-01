import {
  BedDouble,
  Bell,
  Building2,
  FilePenLine,
  MessageSquare,
  RefreshCw,
  UserRound,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import {
  ComingSoonBadge,
  InfoPanel,
  StatCard,
} from "../../components/common/StudentDashboardComponents";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { profileApi } from "../../features/profile/api/profile.api";
import { studentNotificationApi } from "../../features/notifications/api/notification.api";
import { roomChangeApi } from "../../features/room-change-requests/api/room-change.api";
import { contractApi } from "../../features/contracts/api/contract.api";
import { useAuth } from "../../hooks/useAuth";
import { useStudentRoom } from "../../hooks/useStudentRoom";
import { normalizeApiError } from "../../services/api-client";
import type { Contract, StudentProfile } from "../../types/api";
import { formatDate } from "../../utils/date";

export function StudentDashboardPage() {
  const { user } = useAuth();
  const roomContext = useStudentRoom();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openContract, setOpenContract] = useState<Contract | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      profileApi.get(),
      roomChangeApi.mine(),
      studentNotificationApi.unreadCount(),
      contractApi.mine(),
    ])
      .then(([profileData, requests, unread, contracts]) => {
        setProfile(profileData);
        setRequestCount(requests.length);
        setUnreadCount(unread.count);
        setOpenContract(
          contracts.find(
            (item) => item.status === "ACTIVE" || item.status === "PENDING",
          ) ?? null,
        );
      })
      .catch((requestError) =>
        setError(normalizeApiError(requestError).message),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading || roomContext.loading) return <LoadingState />;
  if (error || roomContext.error) {
    return <ErrorState message={error || roomContext.error} />;
  }

  const roomLabel = roomContext.room
    ? `${roomContext.room.roomNumber} · ${roomContext.room.building?.name ?? ""}`
    : openContract?.status === "PENDING"
      ? "Đang chờ duyệt"
      : "Chưa đăng ký phòng";

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user?.fullName}`}
        description="Tổng quan thông tin lưu trú của bạn tại ký túc xá."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Phòng đang ở" value={roomLabel} icon={Building2} />
        <StatCard
          label="Giường của tôi"
          value={roomContext.bed?.bedNumber ?? "—"}
          icon={BedDouble}
        />
        <StatCard label="Thông báo chưa đọc" value={unreadCount} icon={Bell} />
        <StatCard
          label="Yêu cầu đã gửi"
          value={requestCount}
          icon={RefreshCw}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <InfoPanel
          title="Thông tin cá nhân"
          action={
            <Link
              className="text-sm font-semibold text-brand-600"
              to="/student/profile"
            >
              Cập nhật
            </Link>
          }
        >
          <InfoRows
            rows={[
              ["MSSV", profile?.mssv],
              ["Ngày sinh", formatDate(profile?.dob)],
              ["Giới tính", profile?.gender],
              ["Số điện thoại", profile?.phone],
              ["Email", profile?.email],
              ["Địa chỉ", profile?.permanentAddress],
              ["Liên hệ khẩn cấp", profile?.emergencyContactPhone],
            ]}
          />
        </InfoPanel>

        <InfoPanel title="Thông tin phòng">
          {roomContext.contract && roomContext.room ? (
            <InfoRows
              rows={[
                ["Tòa nhà", roomContext.room.building?.name],
                ["Phòng", roomContext.room.roomNumber],
                ["Giường", roomContext.bed?.bedNumber],
                ["Loại phòng", roomContext.room.roomType.name],
                ["Bắt đầu", formatDate(roomContext.contract.startDate)],
                ["Kết thúc", formatDate(roomContext.contract.endDate)],
              ]}
            />
          ) : (
            <div className="rounded-xl bg-slate-50 p-5 text-center">
              <Building2 className="mx-auto text-slate-400" />
              <p className="mt-3 font-semibold">
                {openContract?.status === "PENDING"
                  ? "Đăng ký đang chờ Ban quản lý duyệt"
                  : "Bạn chưa đăng ký phòng"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Chọn phòng và giường phù hợp để gửi đăng ký.
              </p>
              <Link
                className="btn-primary mt-4"
                to={
                  openContract?.status === "PENDING"
                    ? "/student/room"
                    : "/student/room/register"
                }
              >
                {openContract?.status === "PENDING"
                  ? "Xem đăng ký"
                  : "Đăng ký ở ngay"}
              </Link>
            </div>
          )}
        </InfoPanel>

        <InfoPanel title="Thao tác nhanh">
          <div className="space-y-2">
            <QuickAction
              icon={openContract?.status === "ACTIVE" ? RefreshCw : FilePenLine}
              label={
                openContract?.status === "ACTIVE"
                  ? "Yêu cầu chuyển phòng"
                  : openContract?.status === "PENDING"
                    ? "Xem đăng ký đang chờ"
                    : "Đăng ký ở"
              }
              to={
                openContract?.status === "ACTIVE"
                  ? "/student/room#room-change"
                  : openContract?.status === "PENDING"
                    ? "/student/room"
                    : "/student/room/register"
              }
            />
            <QuickAction
              icon={Wrench}
              label="Báo hỏng thiết bị"
              to="/student/maintenance"
            />
            <QuickAction icon={MessageSquare} label="Trợ lý AI KTX" disabled />
            <QuickAction
              icon={UserRound}
              label="Cập nhật hồ sơ cá nhân"
              to="/student/profile"
            />
          </div>
        </InfoPanel>
      </div>
    </>
  );
}

function InfoRows({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <dl className="space-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div className="flex justify-between gap-4 border-b pb-2" key={label}>
          <dt className="text-slate-500">{label}</dt>
          <dd className="text-right font-medium">{String(value || "—")}</dd>
        </div>
      ))}
    </dl>
  );
}

function QuickAction({
  icon: Icon,
  label,
  to,
  disabled,
}: {
  icon: typeof Wrench;
  label: string;
  to?: string;
  disabled?: boolean;
}) {
  const content = (
    <>
      <Icon size={18} />
      <span>{label}</span>
      {disabled && (
        <span className="ml-auto">
          <ComingSoonBadge />
        </span>
      )}
    </>
  );
  return disabled ? (
    <div
      title="Tính năng đang phát triển"
      className="flex cursor-not-allowed items-center gap-3 rounded-lg border p-3 text-slate-400"
    >
      {content}
    </div>
  ) : (
    <Link
      className="flex items-center gap-3 rounded-lg border p-3 transition hover:border-brand-500 hover:bg-brand-50"
      to={to!}
    >
      {content}
    </Link>
  );
}
