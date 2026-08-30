import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { roomApi } from "../../features/rooms/api/room.api";
import { normalizeApiError } from "../../services/api-client";
import type { Bed, Equipment, Room, Status } from "../../types/api";
export function RoomDetailPage() {
  const { id = "" } = useParams(),
    [room, setRoom] = useState<Room | null>(null),
    [beds, setBeds] = useState<Bed[]>([]),
    [equipment, setEquipment] = useState<Equipment[]>([]),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [r, b, e] = await Promise.all([
        roomApi.get(id),
        roomApi.beds(id),
        roomApi.equipment(id),
      ]);
      setRoom(r);
      setBeds(b);
      setEquipment(e.items);
    } catch (err) {
      setError(normalizeApiError(err).message);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!room) return <LoadingState />;
  return (
    <>
      <PageHeader
        title={`Phòng ${room.roomNumber}`}
        description={`Tầng ${room.floor}`}
      />
      <div className="mb-5 card flex flex-wrap items-center gap-4">
        <StatusBadge status={room.status} />
        <select
          className="field max-w-56"
          value={room.status}
          onChange={async (e) => {
            await roomApi.status(room.id, e.target.value as Status);
            await load();
          }}
        >
          {["AVAILABLE", "FULL", "MAINTENANCE", "LOCKED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 text-lg font-bold">Giường ({beds.length})</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {beds.map((b) => (
              <div className="rounded-lg border p-3" key={b.id}>
                <strong>Giường {b.bedNumber}</strong>
                <div className="mt-2">
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <h2 className="mb-4 text-lg font-bold">
            Thiết bị ({equipment.length})
          </h2>
          <div className="space-y-3">
            {equipment.map((e) => (
              <div
                className="flex justify-between rounded-lg border p-3"
                key={e.id}
              >
                <span>{e.serialNumber ?? "Không có serial"}</span>
                <StatusBadge status={e.condition} />
              </div>
            ))}
            {!equipment.length && (
              <p className="text-sm text-slate-500">Chưa có thiết bị.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
