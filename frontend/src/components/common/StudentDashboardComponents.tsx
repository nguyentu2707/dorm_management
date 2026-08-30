import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ComingSoonBadge() {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
      Sắp có
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  isComingSoon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  isComingSoon?: boolean;
}) {
  return (
    <article className="card flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {isComingSoon && <ComingSoonBadge />}
        </div>
        <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
        <Icon size={22} />
      </div>
    </article>
  );
}

export function InfoPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card h-full">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-bold text-slate-900">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
