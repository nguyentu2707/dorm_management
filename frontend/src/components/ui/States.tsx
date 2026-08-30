import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
export function LoadingState() {
  return (
    <div className="flex min-h-48 items-center justify-center gap-2 text-slate-500">
      <LoaderCircle className="animate-spin" />
      Đang tải...
    </div>
  );
}
export function EmptyState({
  message = "Chưa có dữ liệu",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-slate-500">
      <Inbox size={34} />
      <p>{message}</p>
    </div>
  );
}
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
      <div className="flex items-center gap-2">
        <AlertCircle />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button className="btn-secondary mt-3" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export function InlineError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-sm text-red-600">{message}</p>
  ) : null;
}
