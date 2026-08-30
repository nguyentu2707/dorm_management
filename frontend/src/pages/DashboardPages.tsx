import { Building2, FileText, RefreshCw, School } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { useAuth } from "../hooks/useAuth";
const adminCards = [
  { to: "/admin/buildings", label: "Quản lý tòa nhà", icon: Building2 },
  { to: "/admin/rooms", label: "Quản lý phòng", icon: School },
  { to: "/admin/contracts", label: "Xử lý hợp đồng", icon: FileText },
  {
    to: "/admin/room-change-requests",
    label: "Yêu cầu chuyển phòng",
    icon: RefreshCw,
  },
];
export function AdminDashboard() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        title={`Xin chào, ${user?.fullName}`}
        description="Chọn một khu vực để bắt đầu quản lý."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adminCards.map(({ to, label, icon: Icon }) => (
          <Link
            className="card transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
            to={to}
            key={to}
          >
            <Icon className="mb-5 text-brand-600" />
            <strong>{label}</strong>
            <p className="mt-1 text-sm text-slate-500">Mở khu vực quản lý</p>
          </Link>
        ))}
      </div>
    </>
  );
}
export function StudentDashboard() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        title={`Chào ${user?.fullName}`}
        description="Quản lý chỗ ở và yêu cầu của bạn."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link className="card hover:border-brand-500" to="/student/contracts">
          <FileText className="mb-4 text-brand-600" />
          <strong>Hợp đồng của tôi</strong>
          <p className="mt-1 text-sm text-slate-500">
            Đăng ký ở và xem lịch sử
          </p>
        </Link>
        <Link
          className="card hover:border-brand-500"
          to="/student/room-change-requests"
        >
          <RefreshCw className="mb-4 text-brand-600" />
          <strong>Chuyển phòng</strong>
          <p className="mt-1 text-sm text-slate-500">Tạo và theo dõi yêu cầu</p>
        </Link>
      </div>
    </>
  );
}
