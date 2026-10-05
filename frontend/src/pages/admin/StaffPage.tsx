import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { staffApi, type StaffInput } from "../../features/staff/api/staff.api";
import { normalizeApiError } from "../../services/api-client";
import type { Paginated, Staff } from "../../types/api";
const empty: StaffInput = {
  staffCode: "",
  fullName: "",
  phone: "",
  specialty: "",
};
export function AdminStaffPage() {
  const [data, setData] = useState<Paginated<Staff> | null>(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Staff | null | undefined>(undefined),
    [form, setForm] = useState<StaffInput>(empty),
    [busy, setBusy] = useState(false),
    [changing, setChanging] = useState<Staff | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        await staffApi.list({
          page,
          limit: 20,
          search: search || undefined,
          status: status || undefined,
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);
  useEffect(() => {
    void load();
  }, [load]);
  const open = (item: Staff | null) => {
    setEditing(item);
    setForm(
      item
        ? {
            staffCode: item.staffCode,
            fullName: item.fullName,
            phone: item.phone ?? "",
            specialty: item.specialty ?? "",
          }
        : empty,
    );
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      editing
        ? await staffApi.update(editing.id, form)
        : await staffApi.create(form);
      setEditing(undefined);
      await load();
    } catch (x) {
      setError(normalizeApiError(x).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Nhân viên bảo trì"
        description="Danh mục nhân sự nội bộ dùng để phân công xử lý bảo trì."
        action={
          <button className="btn-primary" onClick={() => open(null)}>
            Thêm nhân viên
          </button>
        }
      />
      <div className="mb-4 flex gap-3">
        <input
          className="field max-w-sm"
          placeholder="Tìm mã hoặc họ tên"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="field max-w-48"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>
      </div>
      {loading ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Mã NV</th>
                <th>Họ tên</th>
                <th>Điện thoại</th>
                <th>Chuyên môn</th>
                <th>Trạng thái</th>
                <th>Việc đang mở</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((x) => (
                <tr className="border-b" key={x.id}>
                  <td className="p-3 font-medium">{x.staffCode}</td>
                  <td>{x.fullName}</td>
                  <td>{x.phone ?? "—"}</td>
                  <td>{x.specialty ?? "—"}</td>
                  <td>
                    <span
                      className={
                        x.status === "ACTIVE"
                          ? "text-emerald-700"
                          : "text-slate-500"
                      }
                    >
                      {x.status === "ACTIVE" ? "Hoạt động" : "Ngừng hoạt động"}
                    </span>
                  </td>
                  <td>{x.activeAssignmentCount ?? 0}</td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button className="btn-secondary" onClick={() => open(x)}>
                      Sửa
                    </button>
                    <button
                      className={
                        x.status === "ACTIVE" ? "btn-danger" : "btn-secondary"
                      }
                      onClick={() => setChanging(x)}
                    >
                      {x.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && <Pagination meta={data.pagination} onChange={setPage} />}
        </div>
      )}
      {error && data && <p className="notice-error mt-4">{error}</p>}
      <Modal
        open={editing !== undefined}
        title={editing ? "Sửa nhân viên" : "Thêm nhân viên"}
        onClose={() => setEditing(undefined)}
      >
        <form className="space-y-4" onSubmit={save}>
          {(
            [
              ["staffCode", "Mã nhân viên"],
              ["fullName", "Họ và tên"],
              ["phone", "Điện thoại"],
              ["specialty", "Chuyên môn"],
            ] as const
          ).map(([key, label]) => (
            <label className="block text-sm font-medium" key={key}>
              {label}
              <input
                className="field mt-1"
                required={key === "staffCode" || key === "fullName"}
                value={form[key] ?? ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditing(undefined)}
            >
              Đóng
            </button>
            <button className="btn-primary" disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!changing}
        title="Xác nhận trạng thái"
        message={
          changing?.status === "ACTIVE"
            ? "Nhân viên có công việc chưa hoàn tất sẽ không thể bị vô hiệu hóa."
            : "Kích hoạt để nhân viên có thể nhận phân công mới?"
        }
        busy={busy}
        onClose={() => setChanging(null)}
        onConfirm={async () => {
          if (!changing) return;
          setBusy(true);
          try {
            await staffApi.status(
              changing.id,
              changing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            );
            setChanging(null);
            await load();
          } catch (e) {
            setError(normalizeApiError(e).message);
            setChanging(null);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
