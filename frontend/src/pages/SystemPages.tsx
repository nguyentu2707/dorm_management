import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
export function UnauthorizedPage() {
  const { user, logout } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md text-center">
        <p className="text-6xl font-bold text-slate-200">403</p>
        <h1 className="mt-4 text-2xl font-bold">Không có quyền truy cập</h1>
        <p className="mt-2 text-slate-500">
          Role {user?.role ?? "hiện tại"} không có module phù hợp trong phase
          này.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className="btn-secondary" to="/">
            Trang chủ
          </Link>
          <button className="btn-primary" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </div>
    </main>
  );
}
export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-3 text-slate-500">Không tìm thấy trang.</p>
        <Link className="btn-primary mt-5" to="/">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
