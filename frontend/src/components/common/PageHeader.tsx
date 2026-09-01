import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      {/* Title & Description */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>

        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>

      {/* Actions (Buttons, Filters, etc.) */}
      {action}
    </div>
  );
}
