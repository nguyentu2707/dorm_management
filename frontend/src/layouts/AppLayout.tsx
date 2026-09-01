import {
  Building2,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  RefreshCw,
  School,
  Search,
  UsersRound,
  Bell,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  SidebarNavGroup,
  type SidebarItem,
} from "../components/layout/SidebarNavGroup";
import { useAuth } from "../hooks/useAuth";
import { adminStudentApi } from "../features/students/api/student.api";
import type { AdminStudent } from "../types/api";

const groups: Array<{ title: string; items: SidebarItem[] }> = [
  {
    title: "Tổng quan",
    items: [{ label: "Dashboard", icon: Home, to: "/admin", end: true }],
  },
  {
    title: "Cơ sở vật chất",
    items: [
      { label: "Tòa nhà", icon: Building2, to: "/admin/buildings" },
      { label: "Phòng", icon: School, to: "/admin/rooms" },
    ],
  },
  {
    title: "Sinh viên & Hợp đồng",
    items: [
      { label: "Sinh viên", icon: UsersRound, to: "/admin/students" },
      { label: "Hợp đồng", icon: FileText, to: "/admin/contracts" },
      {
        label: "Yêu cầu chuyển phòng",
        icon: RefreshCw,
        to: "/admin/room-change-requests",
      },
    ],
  },
  {
    title: "Liên lạc",
    items: [{ label: "Thông báo", icon: Bell, to: "/admin/notifications" }],
  },
  {
    title: "Vận hành",
    items: [{ label: "Bảo trì", icon: RefreshCw, to: "/admin/maintenance" }],
  },
];

function GlobalStudentSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setItems([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        setItems(
          (
            await adminStudentApi.list({
              search: query.trim(),
              page: 1,
              limit: 6,
            })
          ).items,
        );
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
      <input
        className="field pl-10"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm sinh viên..."
      />
      {query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 rounded-xl border bg-white p-2 shadow-xl">
          {loading ? (
            <p className="p-3 text-sm text-slate-500">Đang tìm...</p>
          ) : items.length ? (
            items.map((student) => (
              <Link
                key={student.id}
                to={`/admin/students/${student.id}`}
                onClick={() => setQuery("")}
                className="block rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                <strong className="block text-sm">{student.fullName}</strong>
                <span className="text-xs text-slate-500">
                  {student.mssv} ·{" "}
                  {student.currentContractStatus ?? "Chưa có hợp đồng"}
                </span>
              </Link>
            ))
          ) : (
            <p className="p-3 text-sm text-slate-500">
              Không tìm thấy sinh viên
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="border-b bg-slate-900 text-white lg:fixed lg:inset-y-0 lg:w-72 lg:border-b-0">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="rounded-xl bg-brand-500 p-2.5">
            <Building2 size={21} />
          </div>
          <div>
            <strong className="block">UniDorm Admin</strong>
            <span className="text-xs text-slate-400">
              Hệ thống quản lý ký túc xá
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
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b bg-white/95 px-5 py-2 backdrop-blur">
          <GlobalStudentSearch />
          <div className="relative shrink-0">
            <button
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span className="hidden text-right sm:block">
                <strong className="block text-sm">{user?.fullName}</strong>
                <span className="text-xs text-slate-500">ADMIN</span>
              </span>
              <ChevronDown size={16} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border bg-white p-2 shadow-lg">
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={logout}
                >
                  <LogOut size={16} />
                  Đăng xuất
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
