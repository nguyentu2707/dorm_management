import {
  Bell,
  Building2,
  ChevronDown,
  CircleUserRound,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  RefreshCw,
  UserRound,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  SidebarNavGroup,
  type SidebarItem,
} from "../components/layout/SidebarNavGroup";
import { useAuth } from "../hooks/useAuth";

const groups: Array<{ title: string; items: SidebarItem[] }> = [
  {
    title: "Trang chủ",
    items: [{ label: "Tổng quan", icon: Home, to: "/student", end: true }],
  },
  {
    title: "Phòng của tôi",
    items: [
      { label: "Thông tin phòng", icon: Building2, to: "/student/room" },
      { label: "Hợp đồng ở", icon: FileText, to: "/student/contracts" },
      {
        label: "Yêu cầu chuyển phòng",
        icon: RefreshCw,
        to: "/student/room-change-requests",
      },
      { label: "Báo hỏng thiết bị", icon: Wrench, disabled: true },
    ],
  },
  {
    title: "Liên lạc",
    items: [
      { label: "Thông báo", icon: Bell, disabled: true },
      { label: "Nhắn tin với BQL", icon: MessageSquare, disabled: true },
    ],
  },
  {
    title: "Tài khoản",
    items: [
      { label: "Hồ sơ cá nhân", icon: UserRound, to: "/student/profile" },
    ],
  },
];

export function StudentLayout() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="border-b bg-slate-900 text-white lg:fixed lg:inset-y-0 lg:w-72 lg:border-b-0">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="rounded-xl bg-brand-500 p-2.5">
            <Building2 size={21} />
          </div>
          <div>
            <strong className="block">UniDorm</strong>
            <span className="text-xs text-slate-400">
              Cổng thông tin sinh viên
            </span>
          </div>
        </div>
        <nav className="flex gap-6 overflow-x-auto px-3 pb-3 lg:block lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:py-3">
          {groups.map((group) => (
            <SidebarNavGroup key={group.title} {...group} />
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-3 border-b bg-white/95 px-5 backdrop-blur">
          <button
            disabled
            title="Tính năng thông báo đang phát triển"
            className="relative rounded-lg p-2 text-slate-400"
          >
            <Bell size={20} />
          </button>
          <div className="relative">
            <button
              className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-slate-50"
              onClick={() => setProfileOpen((value) => !value)}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600">
                <CircleUserRound size={22} />
              </span>
              <span className="hidden text-left sm:block">
                <strong className="block text-sm">{user?.fullName}</strong>
                <span className="text-xs text-slate-500">{user?.username}</span>
              </span>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-2 shadow-lg">
                <Link
                  to="/student/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <UserRound size={16} /> Hồ sơ cá nhân
                </Link>
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={logout}
                >
                  <LogOut size={16} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
