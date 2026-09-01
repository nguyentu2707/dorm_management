import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ComingSoonBadge } from "../common/StudentDashboardComponents";

export interface SidebarItem {
  label: string;
  icon: LucideIcon;
  to?: string;
  end?: boolean;
  disabled?: boolean;
  title?: string;
  badge?: number;
}

export function SidebarNavGroup({
  title,
  items,
}: {
  title: string;
  items: SidebarItem[];
}) {
  return (
    <div className="mb-5 min-w-max lg:min-w-0">
      <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <div className="space-y-1">
        {items.map(({ label, icon: Icon, to, end, disabled, title, badge }) =>
          disabled || !to ? (
            <div
              key={label}
              title="Tính năng đang phát triển"
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500"
              aria-label={title}
            >
              <Icon size={17} />
              <span>{label}</span>
              <span className="ml-auto">
                <ComingSoonBadge />
              </span>
            </div>
          ) : (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
              {!!badge && (
                <span className="ml-auto min-w-5 rounded-full bg-red-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </NavLink>
          ),
        )}
      </div>
    </div>
  );
}
