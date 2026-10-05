import { Building2, ShieldCheck } from "lucide-react";
import { Outlet } from "react-router-dom";
export function AuthLayout() {
  return (
    <main className="auth-shell">
      <div className="auth-grid" aria-hidden="true" />
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-orb auth-orb-two" aria-hidden="true" />
      <div className="auth-orb auth-orb-three" aria-hidden="true" />

      <header className="auth-brand">
        <span className="auth-brand-icon">
          <Building2 size={22} />
        </span>
        <span>
          <strong>Dormitory</strong>
          <small>Student living, simplified</small>
        </span>
      </header>

      <section className="auth-stage">
        <div className="auth-card">
          <div className="auth-card-glow" aria-hidden="true" />
          <div className="relative z-10">
            <Outlet />
          </div>
        </div>
      </section>

      <footer className="auth-footer">
        <ShieldCheck size={15} /> Kết nối an toàn với hệ thống ký túc xá
      </footer>
    </main>
  );
}
