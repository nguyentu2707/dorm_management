import { useEffect, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { EmptyState, LoadingState } from "../../../components/ui/States";
import { studentFacilityApi } from "../../student-facilities/api/student-facility.api";
import { contractApi } from "../api/contract.api";
import { normalizeApiError } from "../../../services/api-client";
import type { Bed, StudentBuilding, StudentRoom } from "../../../types/api";

export function ContractRegistrationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [buildings, setBuildings] = useState<StudentBuilding[]>([]);
  const [rooms, setRooms] = useState<StudentRoom[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [buildingId, setBuildingId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [bedId, setBedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    studentFacilityApi
      .buildings()
      .then(setBuildings)
      .catch((requestError) =>
        setError(normalizeApiError(requestError).message),
      )
      .finally(() => setLoading(false));
  }, [open]);

  async function selectBuilding(id: string) {
    setBuildingId(id);
    setRoomId("");
    setBedId("");
    setBeds([]);
    setLoading(true);
    try {
      setRooms(id ? await studentFacilityApi.rooms(id) : []);
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }

  async function selectRoom(id: string) {
    setRoomId(id);
    setBedId("");
    setLoading(true);
    try {
      setBeds(id ? await studentFacilityApi.emptyBeds(id) : []);
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      await contractApi.create({
        bedId,
        startDate: String(form.get("startDate")),
        endDate: String(form.get("endDate")),
      });
      onClose();
      await onCreated();
    } catch (requestError) {
      const apiError = normalizeApiError(requestError);
      setError(
        apiError.code === "BED_NOT_AVAILABLE"
          ? "Giường vừa được người khác chọn. Danh sách đã được cập nhật."
          : apiError.message,
      );
      if (apiError.code === "BED_NOT_AVAILABLE" && roomId) {
        setBeds(await studentFacilityApi.emptyBeds(roomId));
        setBedId("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Đăng ký chỗ ở" onClose={onClose}>
      <div className="mb-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        {[
          ["1", "Chọn tòa"],
          ["2", "Chọn phòng"],
          ["3", "Chọn giường"],
        ].map(([number, label]) => (
          <div
            className="rounded-lg bg-brand-50 p-2 text-brand-700"
            key={number}
          >
            {number}. {label}
          </div>
        ))}
      </div>
      {loading && <LoadingState />}
      <form className="space-y-4" onSubmit={submit}>
        <label>
          <span className="label">Tòa nhà</span>
          <select
            className="field"
            value={buildingId}
            onChange={(event) => void selectBuilding(event.target.value)}
            required
          >
            <option value="">Chọn tòa nhà</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Phòng còn chỗ</span>
          <select
            className="field"
            value={roomId}
            onChange={(event) => void selectRoom(event.target.value)}
            disabled={!buildingId}
            required
          >
            <option value="">Chọn phòng</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                Phòng {room.roomNumber} · Tầng {room.floor} · Còn{" "}
                {room.emptyBedCount}/{room.totalBedCount} giường
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Giường trống</span>
          <select
            className="field"
            value={bedId}
            onChange={(event) => setBedId(event.target.value)}
            disabled={!roomId}
            required
          >
            <option value="">Chọn giường</option>
            {beds.map((bed) => (
              <option key={bed.id} value={bed.id}>
                Giường {bed.bedNumber}
              </option>
            ))}
          </select>
        </label>
        {roomId && !loading && beds.length === 0 && (
          <EmptyState message="Phòng hiện không còn giường trống" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Ngày bắt đầu</span>
            <input className="field" type="date" name="startDate" required />
          </label>
          <label>
            <span className="label">Ngày kết thúc</span>
            <input className="field" type="date" name="endDate" required />
          </label>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={!bedId || submitting}>
          {submitting ? "Đang gửi..." : "Xác nhận đăng ký"}
        </button>
      </form>
    </Modal>
  );
}
