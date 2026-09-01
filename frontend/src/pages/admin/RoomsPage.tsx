import { useCallback, useEffect, useState } from "react";
import { Eye, Plus, Search, Trash2, UsersRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { buildingApi } from "../../features/buildings/api/building.api";
import { roomTypeApi } from "../../features/room-types/api/room-type.api";
import { roomApi } from "../../features/rooms/api/room.api";
import { normalizeApiError } from "../../services/api-client";
import type { Building, Paginated, Room, RoomType } from "../../types/api";
export function RoomsPage() {
  const [params, setParams] = useSearchParams(),
    [buildings, setBuildings] = useState<Building[]>([]),
    [types, setTypes] = useState<RoomType[]>([]),
    [result, setResult] = useState<Paginated<Room> | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [deleting, setDeleting] = useState<Room | null>(null);
  const buildingId = params.get("buildingId") ?? "",
    page = Number(params.get("page") ?? 1);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.set("page", "1");
    setParams(next);
  };
  useEffect(() => {
    Promise.all([buildingApi.list(), roomTypeApi.list()])
      .then(([b, t]) => {
        setBuildings(b);
        setTypes(t);
        if (!buildingId && b[0]) update("buildingId", b[0].id);
      })
      .catch((e) => setError(normalizeApiError(e).message));
  }, []);
  const load = useCallback(async () => {
    if (!buildingId) return;
    setLoading(true);
    setError("");
    try {
      setResult(
        await roomApi.list(buildingId, {
          page,
          limit: 12,
          search: params.get("search") || undefined,
          status: params.get("status") || undefined,
          roomTypeId: params.get("roomTypeId") || undefined,
          floor: params.get("floor") || undefined,
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [buildingId, page, params]);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await roomApi.create(buildingId, {
        roomTypeId: String(f.get("roomTypeId")),
        roomNumber: String(f.get("roomNumber")),
        floor: Number(f.get("floor")),
      });
      setOpen(false);
      await load();
    } catch (x) {
      setError(normalizeApiError(x).message);
    }
  }
  async function remove() {
    if (!deleting) return;
    try {
      await roomApi.remove(deleting.id);
      setDeleting(null);
      await load();
    } catch (x) {
      setError(normalizeApiError(x).message);
      setDeleting(null);
    }
  }
  return (
    <>
      <PageHeader
        title="Quản lý phòng"
        description="Theo dõi sức chứa, hạng phòng và trạng thái sử dụng."
        action={
          <button
            className="btn-primary"
            onClick={() => setOpen(true)}
            disabled={!buildingId}
          >
            <Plus size={17} />
            Tạo phòng
          </button>
        }
      />
      <section className="card mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="relative xl:col-span-2">
          <Search
            className="absolute left-3 top-2.5 text-slate-400"
            size={18}
          />
          <input
            className="field pl-10"
            placeholder="Mã phòng..."
            defaultValue={params.get("search") ?? ""}
            onKeyDown={(e) =>
              e.key === "Enter" && update("search", e.currentTarget.value)
            }
          />
        </label>
        <select
          className="field"
          value={buildingId}
          onChange={(e) => update("buildingId", e.target.value)}
        >
          {buildings.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={params.get("floor") ?? ""}
          onChange={(e) => update("floor", e.target.value)}
        >
          <option value="">Tất cả tầng</option>
          {[1, 2, 3, 4, 5].map((x) => (
            <option key={x} value={x}>
              Tầng {x}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={params.get("status") ?? ""}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {["AVAILABLE", "FULL", "MAINTENANCE", "LOCKED"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          className="field"
          value={params.get("roomTypeId") ?? ""}
          onChange={(e) => update("roomTypeId", e.target.value)}
        >
          <option value="">Tất cả hạng phòng</option>
          {types.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <button
          className="btn-secondary"
          onClick={() => setParams(buildingId ? { buildingId } : {})}
        >
          Xóa bộ lọc
        </button>
      </section>
      <p className="mb-4 text-sm text-slate-500">
        Tìm thấy {result?.pagination.total ?? 0} phòng
      </p>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !result?.items.length ? (
        <div className="card">
          <EmptyState message="Không tìm thấy phòng phù hợp" />
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {result.items.map((room) => {
              const type = types.find((x) => x.id === room.roomTypeId),
                o = room.occupancy ?? {
                  total: type?.capacity ?? 0,
                  occupied: 0,
                  empty: type?.capacity ?? 0,
                },
                percent = o.total ? (o.occupied / o.total) * 100 : 0;
              return (
                <article
                  className="card border-t-4 border-t-emerald-500"
                  key={room.id}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{room.roomNumber}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {buildings.find((x) => x.id === room.buildingId)?.name}{" "}
                        · Tầng {room.floor}
                      </p>
                    </div>
                    <StatusBadge status={room.status} />
                  </div>
                  <div className="mt-5 flex items-end justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      <UsersRound size={16} />
                      Sĩ số
                    </span>
                    <strong>
                      {o.occupied}/{o.total} người
                    </strong>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <span className="text-slate-500">Hạng phòng</span>
                      <strong className="block">{type?.name ?? "—"}</strong>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <span className="text-slate-500">Còn trống</span>
                      <strong className="block">{o.empty} giường</strong>
                    </div>
                  </div>
                  <p className="mt-4 font-semibold text-brand-600">
                    {type?.pricePerMonth.toLocaleString("vi-VN") ?? "—"}đ/tháng
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Link
                      className="btn-secondary flex-1"
                      to={`/admin/rooms/${room.id}`}
                    >
                      <Eye size={16} />
                      Chi tiết
                    </Link>
                    <button
                      className="btn-secondary text-red-600"
                      onClick={() => setDeleting(room)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination
            meta={result.pagination}
            onChange={(p) => {
              const next = new URLSearchParams(params);
              next.set("page", String(p));
              setParams(next);
            }}
          />
        </>
      )}
      <Modal open={open} title="Tạo phòng" onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={create}>
          <label>
            <span className="label">Hạng phòng</span>
            <select name="roomTypeId" className="field" required>
              {types.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.capacity} người ·{" "}
                  {x.pricePerMonth.toLocaleString("vi-VN")}đ
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Mã phòng</span>
            <input name="roomNumber" className="field" required />
          </label>
          <label>
            <span className="label">Tầng</span>
            <input
              name="floor"
              type="number"
              min="0"
              className="field"
              required
            />
          </label>
          <button className="btn-primary w-full">
            Tạo phòng và sinh giường
          </button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        title="Xóa phòng"
        message="Chỉ có thể xóa phòng không có sinh viên và thiết bị."
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}
