import {
  ArrowLeft,
  BedDouble,
  Boxes,
  DoorOpen,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { buildingApi } from "../../features/buildings/api/building.api";
import {
  categoryApi,
  equipmentApi,
} from "../../features/equipment/api/equipment.api";
import { roomTypeApi } from "../../features/room-types/api/room-type.api";
import { roomApi } from "../../features/rooms/api/room.api";
import { normalizeApiError } from "../../services/api-client";
import type {
  Bed,
  Building,
  Equipment,
  EquipmentCategory,
  Room,
  RoomType,
  Status,
} from "../../types/api";

export function RoomDetailPage() {
  const { id = "" } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const currentRoom = await roomApi.get(id);
      const [allBuildings, allTypes, roomBeds, roomEquipment, allCategories] =
        await Promise.all([
          buildingApi.list(),
          roomTypeApi.list(),
          roomApi.beds(id),
          roomApi.equipment(id),
          categoryApi.list(),
        ]);
      setRoom(currentRoom);
      setBuilding(
        allBuildings.find((item) => item.id === currentRoom.buildingId) ?? null,
      );
      setRoomType(
        allTypes.find((item) => item.id === currentRoom.roomTypeId) ?? null,
      );
      setBeds(roomBeds);
      setEquipment(roomEquipment.items);
      setCategories(allCategories);
    } catch (err) {
      setError(normalizeApiError(err).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);
  const groups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          items: equipment.filter((item) => item.categoryId === category.id),
        }))
        .filter((group) => group.items.length),
    [categories, equipment],
  );

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!room) return <LoadingState />;
  const occupied = beds.filter((bed) => bed.status === "OCCUPIED").length;
  const percent = beds.length ? Math.round((occupied / beds.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Chi tiết phòng"
        description={`Dashboard / Quản lý phòng / ${room.roomNumber}`}
      />
      <section className="card mb-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-4 text-blue-600">
              <DoorOpen size={30} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">Phòng {room.roomNumber}</h1>
                <StatusBadge status={room.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {building?.name ?? "Tòa nhà"} · Lầu {room.floor} ·{" "}
                {roomType?.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="field w-auto"
              value={room.status}
              onChange={async (event) => {
                await roomApi.status(room.id, event.target.value as Status);
                await load();
              }}
            >
              {["AVAILABLE", "FULL", "MAINTENANCE", "LOCKED"].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <Link className="btn-secondary" to="/admin/rooms">
              <ArrowLeft size={16} /> Quay lại
            </Link>
          </div>
        </div>
        <div className="mt-6 flex items-end justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <UsersRound size={16} /> Sĩ số hiện tại
          </span>
          <strong>
            {occupied} / {beds.length} giường
          </strong>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
        <section className="card">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
            <BedDouble className="text-blue-600" size={21} /> Sơ đồ giường
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {beds.map((bed) => (
              <div
                className="rounded-xl border border-slate-200 p-4 text-center"
                key={bed.id}
              >
                <BedDouble className="mx-auto mb-2 text-slate-400" size={26} />
                <strong className="block">Giường {bed.bedNumber}</strong>
                <div className="mt-2">
                  <StatusBadge status={bed.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Boxes className="text-amber-500" size={21} /> Thiết bị phòng
          </h2>
          <div className="divide-y">
            {groups.map(({ category, items }) => (
              <div className="py-3 first:pt-0" key={category.id}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <strong className="block text-sm">{category.name}</strong>
                    <span className="text-xs text-slate-500">
                      {items.length} {category.unit}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">
                    {items.filter((item) => item.condition === "GOOD").length}/
                    {items.length} tốt
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div className="flex items-center gap-2" key={item.id}>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                        {item.serialNumber ?? "Không có serial"}
                      </span>
                      <select
                        aria-label={`Tình trạng ${item.serialNumber ?? category.name}`}
                        className="rounded-lg border px-2 py-1 text-xs"
                        value={item.condition}
                        onChange={async (event) => {
                          await equipmentApi.condition(
                            item.id,
                            event.target.value as Status,
                          );
                          await load();
                        }}
                      >
                        {["GOOD", "BROKEN", "MAINTENANCE", "LOST"].map(
                          (condition) => (
                            <option key={condition}>{condition}</option>
                          ),
                        )}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!equipment.length && (
              <p className="py-5 text-sm text-slate-500">Chưa có thiết bị.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
