import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Edit2,
  Hammer,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { buildingApi } from "../../features/buildings/api/building.api";
import { roomTypeApi } from "../../features/room-types/api/room-type.api";
import { categoryApi } from "../../features/equipment/api/equipment.api";
import { normalizeApiError } from "../../services/api-client";
import type { Building, EquipmentCategory, RoomType } from "../../types/api";
type Resource = Building | RoomType | EquipmentCategory;
interface Config {
  title: string;
  description: string;
  columns: Array<{
    key: string;
    label: string;
    render?: (row: Resource) => string;
  }>;
  fields: Array<{
    key: string;
    label: string;
    type?: string;
    required?: boolean;
  }>;
  list: () => Promise<Resource[]>;
  create: (data: never) => Promise<Resource>;
  update: (id: string, data: never) => Promise<Resource>;
  remove: (id: string) => Promise<unknown>;
  deleteErrors: Record<string, string>;
}
function ResourcePage({ config }: { config: Config }) {
  const [items, setItems] = useState<Resource[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Resource | null | undefined>(undefined),
    [deleting, setDeleting] = useState<Resource | null>(null),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await config.list());
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [config]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const data: Record<string, unknown> = {};
    config.fields.forEach((f) => {
      const value = raw[f.key];
      if (value !== "")
        data[f.key] = f.type === "number" ? Number(value) : value;
    });
    try {
      if (editing) await config.update(editing.id, data as never);
      else await config.create(data as never);
      setEditing(undefined);
      await load();
    } catch (e) {
      setFormError(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await config.remove(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      const err = normalizeApiError(e);
      setError(
        err.code && config.deleteErrors[err.code]
          ? config.deleteErrors[err.code]
          : err.message,
      );
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        action={
          <button className="btn-primary" onClick={() => setEditing(null)}>
            <Plus size={17} />
            Thêm mới
          </button>
        }
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                {config.columns.map((c) => (
                  <th className="px-3 py-3" key={c.key}>
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr className="border-b last:border-0" key={row.id}>
                  {config.columns.map((c) => (
                    <td className="px-3 py-3" key={c.key}>
                      {c.render?.(row) ?? String(row[c.key] ?? "—")}
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn-secondary"
                        onClick={() => setEditing(row)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="btn-secondary text-red-600"
                        onClick={() => setDeleting(row)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={editing !== undefined}
        title={editing ? "Chỉnh sửa" : "Thêm mới"}
        onClose={() => setEditing(undefined)}
      >
        <form className="space-y-4" onSubmit={submit}>
          {config.fields.map((f) => (
            <label key={f.key}>
              <span className="label">{f.label}</span>
              {f.key === "description" ? (
                <textarea
                  className="field"
                  name={f.key}
                  defaultValue={String(editing?.[f.key] ?? "")}
                />
              ) : (
                <input
                  className="field"
                  name={f.key}
                  type={f.type ?? "text"}
                  required={f.required}
                  min={f.type === "number" ? 0 : undefined}
                  defaultValue={String(editing?.[f.key] ?? "")}
                />
              )}
            </label>
          ))}
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditing(undefined)}
            >
              Hủy
            </button>
            <button className="btn-primary" disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa “${deleting?.name}”?`}
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}
export function BuildingsPage() {
  const [items, setItems] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    buildingApi
      .list()
      .then(setItems)
      .catch((e) => setError(normalizeApiError(e).message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const buildings = ["Tòa A", "Tòa B", "Tòa C"].map(
    (name) => items.find((item) => item.name === name) ?? { id: name, name },
  );
  return (
    <>
      <PageHeader
        title="Tòa nhà"
        description="Theo dõi trạng thái vận hành các khu nhà trong ký túc xá"
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {buildings.map((building) => {
            const active = building.name !== "Tòa C";
            return (
              <article
                className={`card border-t-4 ${active ? "border-t-emerald-500" : "border-t-amber-500"}`}
                key={building.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`rounded-xl p-3 ${active ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                  >
                    {active ? <Building2 size={28} /> : <Hammer size={28} />}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {active ? "Đang hoạt động" : "Đang hoàn thiện"}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-bold">{building.name}</h2>
                <p className="mt-2 min-h-10 text-sm text-slate-500">
                  {active
                    ? "Khu nhà đang tiếp nhận và phục vụ sinh viên."
                    : "Khu nhà đang trong giai đoạn hoàn thiện, chưa tiếp nhận sinh viên."}
                </p>
                <div className="mt-5 flex items-center gap-2 border-t pt-4 text-sm text-slate-500">
                  <ShieldCheck size={17} /> Thông tin hệ thống cố định
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
export function RoomTypesPage() {
  return (
    <ResourcePage
      config={{
        title: "Loại phòng",
        description: "Sức chứa và đơn giá theo tháng",
        columns: [
          { key: "name", label: "Tên" },
          { key: "capacity", label: "Sức chứa" },
          {
            key: "pricePerMonth",
            label: "Giá/tháng",
            render: (r) =>
              Number(r.pricePerMonth).toLocaleString("vi-VN") + " ₫",
          },
        ],
        fields: [
          { key: "name", label: "Tên", required: true },
          {
            key: "capacity",
            label: "Sức chứa",
            type: "number",
            required: true,
          },
          {
            key: "pricePerMonth",
            label: "Giá mỗi tháng",
            type: "number",
            required: true,
          },
          { key: "description", label: "Mô tả" },
        ],
        list: roomTypeApi.list,
        create: roomTypeApi.create as never,
        update: roomTypeApi.update as never,
        remove: roomTypeApi.remove,
        deleteErrors: {
          ROOM_TYPE_IS_USED: "Không thể xóa loại phòng đang được sử dụng.",
          ROOM_TYPE_CAPACITY_LOCKED:
            "Không thể đổi sức chứa vì đã có phòng sử dụng.",
        },
      }}
    />
  );
}
export function EquipmentCategoriesPage() {
  return (
    <ResourcePage
      config={{
        title: "Loại thiết bị",
        description: "Danh mục tài sản và đơn vị tính",
        columns: [
          { key: "name", label: "Tên" },
          { key: "unit", label: "Đơn vị" },
          { key: "defaultLifespanMonths", label: "Tuổi thọ (tháng)" },
        ],
        fields: [
          { key: "name", label: "Tên", required: true },
          { key: "unit", label: "Đơn vị", required: true },
          {
            key: "defaultLifespanMonths",
            label: "Tuổi thọ mặc định",
            type: "number",
          },
        ],
        list: categoryApi.list,
        create: categoryApi.create as never,
        update: categoryApi.update as never,
        remove: categoryApi.remove,
        deleteErrors: {
          EQUIPMENT_CATEGORY_IS_USED:
            "Không thể xóa loại thiết bị đang được sử dụng.",
        },
      }}
    />
  );
}
