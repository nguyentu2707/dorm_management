import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { Modal } from "../../components/ui/Modal";
import {
  adminNotificationApi,
  type NotificationInput,
} from "../../features/notifications/api/notification.api";
import { buildingApi } from "../../features/buildings/api/building.api";
import { adminStudentApi } from "../../features/students/api/student.api";
import type {
  AdminNotification,
  AdminStudent,
  Building,
  NotificationDetail,
  Paginated,
} from "../../types/api";
import { formatDate } from "../../utils/date";
import { normalizeApiError } from "../../services/api-client";
const initial: NotificationInput = {
  title: "",
  content: "",
  targetScope: "ALL",
};
export function AdminNotificationsPage() {
  const [form, setForm] = useState(initial),
    [data, setData] = useState<Paginated<AdminNotification> | null>(null),
    [buildings, setBuildings] = useState<Building[]>([]),
    [students, setStudents] = useState<AdminStudent[]>([]),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [detail, setDetail] = useState<NotificationDetail | null>(null);
  const load = useCallback(
    () =>
      adminNotificationApi
        .list({ page, limit: 10 })
        .then(setData)
        .catch((e) => setMessage(normalizeApiError(e).message)),
    [page],
  );
  useEffect(() => {
    load();
    buildingApi.list().then(setBuildings);
    adminStudentApi
      .list({ page: 1, limit: 100 })
      .then((x) => setStudents(x.items));
  }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await adminNotificationApi.create(form);
      setMessage(`Đã gửi tới ${result.recipientCount} sinh viên.`);
      setForm(initial);
      setPage(1);
      load();
    } catch (err) {
      setMessage(normalizeApiError(err).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    try {
      setDetail(await adminNotificationApi.detail(id));
    } catch (err) {
      setMessage(normalizeApiError(err).message);
    }
  }
  return (
    <>
      <PageHeader
        title="Thông báo"
        description="Tạo và theo dõi thông báo gửi tới sinh viên."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <form className="card space-y-4" onSubmit={submit}>
          <h2 className="text-lg font-bold">Tạo thông báo</h2>
          {message && (
            <p className="rounded-lg bg-slate-100 p-3 text-sm">{message}</p>
          )}
          <label>
            <span className="label">Tiêu đề</span>
            <input
              className="field"
              maxLength={200}
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Nội dung</span>
            <textarea
              className="field min-h-36"
              maxLength={2000}
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Đối tượng</span>
            <select
              className="field"
              value={form.targetScope}
              onChange={(e) =>
                setForm({
                  title: form.title,
                  content: form.content,
                  targetScope: e.target
                    .value as NotificationInput["targetScope"],
                })
              }
            >
              <option value="ALL">Tất cả sinh viên</option>
              <option value="BUILDING">Theo tòa nhà</option>
              <option value="SPECIFIC_STUDENT">Một sinh viên</option>
            </select>
          </label>
          {form.targetScope === "BUILDING" && (
            <select
              required
              className="field"
              value={form.targetBuildingId ?? ""}
              onChange={(e) =>
                setForm({ ...form, targetBuildingId: e.target.value })
              }
            >
              <option value="">Chọn tòa nhà</option>
              {buildings.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
          {form.targetScope === "SPECIFIC_STUDENT" && (
            <select
              required
              className="field"
              value={form.targetStudentId ?? ""}
              onChange={(e) =>
                setForm({ ...form, targetStudentId: e.target.value })
              }
            >
              <option value="">Chọn sinh viên</option>
              {students.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.mssv} · {x.fullName}
                </option>
              ))}
            </select>
          )}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Đang gửi..." : "Gửi thông báo"}
          </button>
        </form>
        <section className="card overflow-x-auto">
          <h2 className="mb-4 text-lg font-bold">Lịch sử thông báo</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3">Tiêu đề</th>
                <th>Đối tượng</th>
                <th>Ngày tạo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((x) => (
                <tr className="border-b" key={x.id}>
                  <td className="py-3 font-medium">{x.title}</td>
                  <td>{x.targetScope}</td>
                  <td>{formatDate(x.createdAt)}</td>
                  <td>
                    <button
                      className="text-brand-600"
                      onClick={() => open(x.id)}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && <Pagination meta={data.pagination} onChange={setPage} />}
        </section>
      </div>
      <Modal
        open={!!detail}
        title={detail?.notification.title ?? "Chi tiết"}
        onClose={() => setDetail(null)}
      >
        <p className="whitespace-pre-wrap">{detail?.notification.content}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded bg-slate-100 p-3">
            Người nhận
            <br />
            <b>{detail?.recipientCount}</b>
          </div>
          <div className="rounded bg-green-50 p-3">
            Đã đọc
            <br />
            <b>{detail?.readCount}</b>
          </div>
          <div className="rounded bg-amber-50 p-3">
            Chưa đọc
            <br />
            <b>{detail?.unreadCount}</b>
          </div>
        </div>
      </Modal>
    </>
  );
}
