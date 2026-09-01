import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { Modal } from "../../components/ui/Modal";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { studentNotificationApi } from "../../features/notifications/api/notification.api";
import type { Paginated, StudentNotification } from "../../types/api";
import { formatDate } from "../../utils/date";
import { normalizeApiError } from "../../services/api-client";

export function StudentNotificationsPage() {
  const [data, setData] = useState<Paginated<StudentNotification> | null>(null),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<StudentNotification | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    studentNotificationApi
      .list({
        page,
        limit: 10,
        isRead: filter === "all" ? undefined : filter === "read",
      })
      .then(setData)
      .catch((e) => setError(normalizeApiError(e).message))
      .finally(() => setLoading(false));
  }, [page, filter]);
  useEffect(load, [load]);
  async function open(item: StudentNotification) {
    setSelected(item);
    if (!item.isRead) {
      try {
        const read = await studentNotificationApi.markRead(item.notificationId);
        setSelected(read);
        window.dispatchEvent(new Event("notification-read"));
        load();
      } catch (e) {
        setError(normalizeApiError(e).message);
      }
    }
  }
  return (
    <>
      <PageHeader
        title="Thông báo"
        description="Các thông báo chính thức từ Ban quản lý ký túc xá."
      />
      <div className="mb-4 flex gap-2">
        {[
          ["all", "Tất cả"],
          ["unread", "Chưa đọc"],
          ["read", "Đã đọc"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "btn-primary" : "btn-secondary"}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-3">
          {data?.items.length ? (
            data.items.map((item) => (
              <button
                key={item.notificationId}
                onClick={() => open(item)}
                className={`card block w-full text-left transition hover:border-brand-400 ${!item.isRead ? "border-brand-300 bg-brand-50/50" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Bell
                    size={18}
                    className={
                      item.isRead ? "text-slate-400" : "text-brand-600"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2">
                      <strong>{item.title}</strong>
                      {!item.isRead && (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">
                          Mới
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {item.content}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="card text-center text-slate-500">
              Không có thông báo.
            </div>
          )}{" "}
          {data && <Pagination meta={data.pagination} onChange={setPage} />}
        </div>
      )}
      <Modal
        open={!!selected}
        title={selected?.title ?? "Thông báo"}
        onClose={() => setSelected(null)}
      >
        <p className="whitespace-pre-wrap text-slate-700">
          {selected?.content}
        </p>
        <p className="mt-5 text-xs text-slate-400">
          {selected && formatDate(selected.createdAt)}
        </p>
      </Modal>
    </>
  );
}
