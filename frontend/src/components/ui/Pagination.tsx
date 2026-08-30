import type { PaginationMeta } from "../../types/api";
export function Pagination({
  meta,
  onChange,
}: {
  meta: PaginationMeta;
  onChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between text-sm">
      <span>
        Trang {meta.page}/{meta.totalPages} · {meta.total} mục
      </span>
      <div className="flex gap-2">
        <button
          className="btn-secondary"
          disabled={meta.page <= 1}
          onClick={() => onChange(meta.page - 1)}
        >
          Trước
        </button>
        <button
          className="btn-secondary"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onChange(meta.page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  );
}
