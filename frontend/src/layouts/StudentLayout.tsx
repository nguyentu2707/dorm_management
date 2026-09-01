import {
  Bell,
  Building2,
  ChevronDown,
  CircleUserRound,
  Home,
  LogOut,
  MessageSquare,
  UserRound,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  SidebarNavGroup,
  type SidebarItem,
} from "../components/layout/SidebarNavGroup";
import { useAuth } from "../hooks/useAuth";
import { studentNotificationApi } from "../features/notifications/api/notification.api";

const groups: Array<{ title: string; items: SidebarItem[] }> = [
  {
    title: "Trang chủ",
    items: [{ label: "Tổng quan", icon: Home, to: "/student", end: true }],
  },
  {
    title: "Phòng của tôi",
    items: [
      { label: "Thông tin phòng", icon: Building2, to: "/student/room" },
      { label: "Báo hỏng thiết bị", icon: Wrench, to: "/student/maintenance" },
    ],
  },
  {
    title: "Hỗ trợ",
    items: [
      { label: "Thông báo", icon: Bell, to: "/student/notifications" },
      {
        label: "Trợ lý AI KTX",
        icon: MessageSquare,
        disabled: true,
        title: "Tra cứu nội quy và hỗ trợ thông tin KTX bằng AI — sắp ra mắt.",
      },
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
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  useEffect(() => {
    const refresh = () =>
      studentNotificationApi
        .unreadCount()
        .then((x) => setUnread(x.count))
        .catch(() => setUnread(0));
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("notification-read", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("notification-read", refresh);
    };
  }, [location.pathname]);

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
            <SidebarNavGroup
              key={group.title}
              {...group}
              items={group.items.map((item) =>
                item.to === "/student/notifications"
                  ? { ...item, badge: unread }
                  : item,
              )}
            />
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-3 border-b bg-white/95 px-5 backdrop-blur">
          <Link
            to="/student/notifications"
            title="Thông báo"
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs leading-5 text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
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
