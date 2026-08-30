import { Building2 } from "lucide-react";
import { Outlet } from "react-router-dom";
export function AuthLayout() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-xl font-bold">
          <Building2 className="text-blue-400" />
          Dormitory Management
        </div>
        <div>
          <h1 className="max-w-lg text-4xl font-bold leading-tight">
            Quản lý ký túc xá rõ ràng, nhất quán và hiệu quả.
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Một không gian tập trung cho sinh viên và cán bộ quản lý.
          </p>
        </div>
        <p className="text-sm text-slate-500">Hệ thống quản lý trường học</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
