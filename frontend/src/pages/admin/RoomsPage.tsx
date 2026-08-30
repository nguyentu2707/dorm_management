import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, Plus, Trash2 } from "lucide-react";
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
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [deleting, setDeleting] = useState<Room | null>(null);
  const buildingId = params.get("buildingId") ?? "",
    page = Number(params.get("page") ?? 1);
  useEffect(() => {
    Promise.all([buildingApi.list(), roomTypeApi.list()])
      .then(([b, t]) => {
        setBuildings(b);
        setTypes(t);
        if (!buildingId && b[0]) setParams({ buildingId: b[0].id });
      })
      .catch((e) => setError(normalizeApiError(e).message));
  }, [buildingId, setParams]);
  async function load() {
    if (!buildingId) return;
    setLoading(true);
    try {
      setResult(
        await roomApi.list(buildingId, {
          page,
          limit: 20,
          search: params.get("search") ?? undefined,
          status: params.get("status") ?? undefined,
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [buildingId, page, params]);
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
    } catch (err) {
      setError(normalizeApiError(err).message);
    }
  }
  async function remove() {
    if (!deleting) return;
    try {
      await roomApi.remove(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      const err = normalizeApiError(e);
      setError(
        err.code === "ROOM_HAS_OCCUPIED_BEDS"
          ? "Không thể xóa vì phòng còn giường có sinh viên."
          : err.code === "ROOM_HAS_EQUIPMENT"
            ? "Không thể xóa vì phòng còn thiết bị."
            : err.message,
      );
      setDeleting(null);
    }
  }
  return (
    <>
      <PageHeader
        title="Phòng"
        description="Chọn tòa nhà để xem và quản lý phòng"
        action={
          <button
            className="btn-primary"
            disabled={!buildingId}
            onClick={() => setOpen(true)}
          >
            <Plus size={17} />
            Tạo phòng
          </button>
        }
      />
      <div className="card mb-5 grid gap-3 sm:grid-cols-3">
        <select
          className="field"
          value={buildingId}
          onChange={(e) => setParams({ buildingId: e.target.value })}
        >
          <option value="">Chọn tòa nhà</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          className="field"
          placeholder="Tìm số phòng..."
          defaultValue={params.get("search") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              setParams({ buildingId, search: e.currentTarget.value });
          }}
        />
        <select
          className="field"
          value={params.get("status") ?? ""}
          onChange={(e) => setParams({ buildingId, status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          {["AVAILABLE", "FULL", "MAINTENANCE", "LOCKED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !result?.items.length ? (
        <div className="card">
          <EmptyState message="Chưa có phòng trong tòa nhà này" />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="p-3">Số phòng</th>
                <th>Tầng</th>
                <th>Loại phòng</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((room) => (
                <tr className="border-b" key={room.id}>
                  <td className="p-3 font-semibold">{room.roomNumber}</td>
                  <td>{room.floor}</td>
                  <td>
                    {types.find((t) => t.id === room.roomTypeId)?.name ??
                      room.roomTypeId}
                  </td>
                  <td>
                    <StatusBadge status={room.status} />
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link
                        className="btn-secondary"
                        to={`/admin/rooms/${room.id}`}
                      >
                        <Eye size={15} />
                      </Link>
                      <button
                        className="btn-secondary text-red-600"
                        onClick={() => setDeleting(room)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            meta={result.pagination}
            onChange={(p) => setParams({ buildingId, page: String(p) })}
          />
        </div>
      )}
      <Modal open={open} title="Tạo phòng" onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={create}>
          <label>
            <span className="label">Loại phòng</span>
            <select name="roomTypeId" className="field" required>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.capacity} người
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Số phòng</span>
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
        message="Thao tác chỉ thành công khi phòng không có giường đang sử dụng và không có thiết bị."
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}
