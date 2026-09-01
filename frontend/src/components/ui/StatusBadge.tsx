import type { Status } from "../../types/api";
const labels: Record<Status, string> = {
  PENDING: "Chờ duyệt",
  ACTIVE: "Đang hiệu lực",
  ENDED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
  REJECTED: "Bị từ chối",
  APPROVED: "Đã duyệt",
  AVAILABLE: "Còn chỗ",
  FULL: "Đã đầy",
  MAINTENANCE: "Bảo trì",
  LOCKED: "Đã khóa",
  EMPTY: "Trống",
  OCCUPIED: "Đang sử dụng",
  NEW: "Mới",
  GOOD: "Tốt",
  DAMAGED: "Hư hỏng",
  BROKEN: "Không hoạt động",
  LOST: "Thất lạc",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
};
const colors: Partial<Record<Status, string>> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  EMPTY: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  FULL: "bg-blue-100 text-blue-700",
  ENDED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-slate-100 text-slate-700",
  REJECTED: "bg-red-100 text-red-700",
  MAINTENANCE: "bg-orange-100 text-orange-700",
  LOCKED: "bg-red-100 text-red-700",
  BROKEN: "bg-red-100 text-red-700",
  LOST: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
};
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[status] ?? "bg-sky-100 text-sky-700"}`}
    >
      {labels[status]}
    </span>
  );
}
