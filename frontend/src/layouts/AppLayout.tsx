import {
  Building2,
  FileText,
  Home,
  LogOut,
  Package,
  RefreshCw,
  School,
  Tag,
  UsersRound,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
const adminLinks = [
  { to: "/admin", label: "Tổng quan", icon: Home, end: true },
  { to: "/admin/buildings", label: "Tòa nhà", icon: Building2 },
  { to: "/admin/room-types", label: "Loại phòng", icon: Tag },
  { to: "/admin/rooms", label: "Phòng", icon: School },
  { to: "/admin/equipment-categories", label: "Loại thiết bị", icon: Package },
  { to: "/admin/equipment", label: "Thiết bị", icon: Package },
  { to: "/admin/contracts", label: "Hợp đồng", icon: FileText },
  { to: "/admin/room-change-requests", label: "Chuyển phòng", icon: RefreshCw },
];
const studentLinks = [
  { to: "/student", label: "Trang chủ", icon: Home, end: true },
  { to: "/student/contracts", label: "Hợp đồng của tôi", icon: FileText },
  {
    to: "/student/room-change-requests",
    label: "Yêu cầu chuyển phòng",
    icon: RefreshCw,
  },
];
export function AppLayout({ kind }: { kind: "admin" | "student" }) {
  const { user, logout } = useAuth(),
    links = kind === "admin" ? adminLinks : studentLinks;
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b bg-slate-900 text-white lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="rounded-lg bg-brand-500 p-2">
            <UsersRound size={20} />
          </div>
          <div>
            <strong className="block">Dormitory</strong>
            <span className="text-xs text-slate-400">Management System</span>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-800"}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 lg:ml-64">
        <header className="flex h-16 items-center justify-between border-b bg-white px-5">
          <div>
            <p className="text-sm font-semibold">{user?.fullName}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <button className="btn-secondary" onClick={logout}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export const AdminLayout = () => <AppLayout kind="admin" />;
export const StudentLayout = () => <AppLayout kind="student" />;
