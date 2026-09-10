import { useEffect, useState } from "react";
import { EmptyState, LoadingState } from "../ui/States";
import { studentFacilityApi } from "../../features/student-facilities/api/student-facility.api";
import { normalizeApiError } from "../../services/api-client";
import type { Bed, StudentBuilding, StudentRoom } from "../../types/api";

export type RoomBedSelection = {
  building?: StudentBuilding;
  room?: StudentRoom;
  bed?: Bed;
};

export function RoomBedSelector({
  excludeRoomId,
  onChange,
}: {
  excludeRoomId?: string;
  onChange: (selection: RoomBedSelection) => void;
}) {
  const [buildings, setBuildings] = useState<StudentBuilding[]>([]);
  const [rooms, setRooms] = useState<StudentRoom[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [buildingId, setBuildingId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [bedId, setBedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    studentFacilityApi
      .buildings()
      .then(setBuildings)
      .catch((requestError) => setError(normalizeApiError(requestError).message))
      .finally(() => setLoading(false));
  }, []);

  function emit(nextBuildingId: string, nextRoomId: string, nextBedId: string) {
    onChange({
      building: buildings.find((item) => item.id === nextBuildingId),
      room: rooms.find((item) => item.id === nextRoomId),
      bed: beds.find((item) => item.id === nextBedId),
    });
  }

  async function selectBuilding(id: string) {
    setBuildingId(id);
    setRoomId("");
    setBedId("");
    setBeds([]);
    setError("");
    emit(id, "", "");
    setLoading(true);
    try {
      const available = id ? await studentFacilityApi.rooms(id) : [];
      setRooms(available.filter((room) => room.id !== excludeRoomId));
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }

  async function selectRoom(id: string) {
    setRoomId(id);
    setBedId("");
    setError("");
    emit(buildingId, id, "");
    setLoading(true);
    try {
      setBeds(id ? await studentFacilityApi.emptyBeds(id) : []);
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }

  function selectBed(id: string) {
    setBedId(id);
    onChange({
      building: buildings.find((item) => item.id === buildingId),
      room: rooms.find((item) => item.id === roomId),
      bed: beds.find((item) => item.id === id),
    });
  }

  return (
    <div className="space-y-4">
      <label>
        <span className="label">Tòa nhà</span>
        <select className="field" value={buildingId} onChange={(event) => void selectBuilding(event.target.value)} required>
          <option value="">Chọn tòa nhà</option>
          {buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
        </select>
      </label>
      <label>
        <span className="label">Phòng còn chỗ</span>
        <select className="field" value={roomId} onChange={(event) => void selectRoom(event.target.value)} disabled={!buildingId || loading} required>
          <option value="">Chọn phòng</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.roomNumber} · Tầng {room.floor} · {room.roomType.pricePerMonth.toLocaleString("vi-VN")}đ/tháng · Còn {room.emptyBedCount}/{room.totalBedCount} giường
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Giường trống</span>
        <select className="field" value={bedId} onChange={(event) => selectBed(event.target.value)} disabled={!roomId || loading} required>
          <option value="">Chọn giường</option>
          {beds.map((bed) => <option key={bed.id} value={bed.id}>Giường {bed.bedNumber}</option>)}
        </select>
      </label>
      {loading && <LoadingState />}
      {buildingId && !loading && rooms.length === 0 && <EmptyState message="Tòa nhà không còn phòng phù hợp" />}
      {roomId && !loading && beds.length === 0 && <EmptyState message="Phòng không còn giường trống" />}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
