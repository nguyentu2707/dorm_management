import { X } from "lucide-react";
import type { ReactNode } from "react";
export function Modal({
  open,
  title,
  children,
  onClose,
  size = "md",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "md" | "lg" | "xl";
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl ${size === "xl" ? "sm:max-w-5xl" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 p-5 backdrop-blur">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
export function ConfirmDialog({
  open,
  title,
  message,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>
          Hủy
        </button>
        <button className="btn-danger" disabled={busy} onClick={onConfirm}>
          {busy ? "Đang xử lý..." : "Xác nhận"}
        </button>
      </div>
    </Modal>
  );
}
