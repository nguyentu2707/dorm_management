import { useEffect, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { buildingApi } from "../../buildings/api/building.api";
import { roomApi } from "../../rooms/api/room.api";
import { adminStudentApi } from "../../students/api/student.api";
import { contractApi } from "../api/contract.api";
import { normalizeApiError } from "../../../services/api-client";
import type { AdminStudent, Bed, Building, Room } from "../../../types/api";

export function AdminContractRegistrationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [studentQuery, setStudentQuery] = useState("");
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [studentId, setStudentId] = useState("");

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState("");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");

  const [beds, setBeds] = useState<Bed[]>([]);
  const [bedId, setBedId] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open)
      void buildingApi
        .list()
        .then(setBuildings)
        .catch((e) => setError(normalizeApiError(e).message));
  }, [open]);

  useEffect(() => {
    if (studentQuery.trim().length < 2) {
      setStudents([]);
      return;
    }
    const timer = window.setTimeout(
      () =>
        void adminStudentApi
          .list({ search: studentQuery, page: 1, limit: 8 })
          .then((result) => setStudents(result.items))
          .catch((e) => setError(normalizeApiError(e).message)),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [studentQuery]);

  async function chooseBuilding(id: string) {
    setBuildingId(id);
    setRoomId("");
    setBedId("");
    setBeds([]);

    if (!id) return setRooms([]);

    try {
      setRooms(
        (await roomApi.list(id, { page: 1, limit: 100, status: "AVAILABLE" }))
          .items,
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    }
  }

  async function chooseRoom(id: string) {
    setRoomId(id);
    setBedId("");

    if (!id) return setBeds([]);

    try {
      setBeds((await roomApi.beds(id)).filter((bed) => bed.status === "EMPTY"));
    } catch (e) {
      setError(normalizeApiError(e).message);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const startDate = String(form.get("startDate") ?? "");
      const endDate = String(form.get("endDate") ?? "");
      await contractApi.adminCreate({
        studentId,
        bedId,
        ...(startDate && endDate ? { startDate, endDate } : {}),
      });
      onClose();
      await onCreated();
    } catch (e) {
      const apiError = normalizeApiError(e);
      setError(
        apiError.code === "STUDENT_ALREADY_HAS_ACTIVE_CONTRACT"
          ? "Sinh viên đã có hợp đồng đang mở."
          : apiError.code === "BED_NOT_AVAILABLE"
            ? "Giường không còn khả dụng."
            : apiError.message,
      );

      if (apiError.code === "BED_NOT_AVAILABLE" && roomId)
        await chooseRoom(roomId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Admin tạo hợp đồng" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <label>
          <span className="label">Sinh viên</span>
          <input
            className="field"
            value={studentQuery}
            onChange={(e) => {
              setStudentQuery(e.target.value);
              setStudentId("");
            }}
            placeholder="Nhập MSSV hoặc họ tên"
            required={!studentId}
          />
        </label>

        {students.length > 0 && !studentId && (
          <div className="max-h-48 overflow-y-auto rounded-lg border p-1">
            {students.map((student) => (
              <button
                type="button"
                key={student.id}
                disabled={student.hasOpenContract}
                onClick={() => {
                  setStudentId(student.id);
                  setStudentQuery(`${student.mssv} · ${student.fullName}`);
                  setStudents([]);
                }}
                className="block w-full rounded-lg p-2 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <strong>
                  {student.mssv} · {student.fullName}
                </strong>
                <span className="block text-xs text-slate-500">
                  {student.currentContractStatus === "PENDING"
                    ? "Đang chờ duyệt hợp đồng khác"
                    : student.currentContractStatus === "ACTIVE"
                      ? "Đã có hợp đồng đang hiệu lực"
                      : (student.className ?? "Có thể tạo hợp đồng")}
                </span>
              </button>
            ))}
          </div>
        )}

        <label>
          <span className="label">Tòa nhà</span>
          <select
            className="field"
            value={buildingId}
            onChange={(e) => void chooseBuilding(e.target.value)}
            required
          >
            <option value="">Chọn tòa nhà</option>
            {buildings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label">Phòng khả dụng</span>
          <select
            className="field"
            value={roomId}
            onChange={(e) => void chooseRoom(e.target.value)}
            disabled={!buildingId}
            required
          >
            <option value="">Chọn phòng</option>
            {rooms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.roomNumber} · Tầng {item.floor} · {item.status}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label">Giường trống</span>
          <select
            className="field"
            value={bedId}
            onChange={(e) => setBedId(e.target.value)}
            disabled={!roomId}
            required
          >
            <option value="">Chọn giường</option>
            {beds.map((item) => (
              <option key={item.id} value={item.id}>
                Giường {item.bedNumber}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Ngày bắt đầu</span>
            <input className="field" name="startDate" type="date" />
          </label>
          <label>
            <span className="label">Ngày kết thúc</span>
            <input className="field" name="endDate" type="date" />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Để trống cả hai ngày để dùng thời hạn mặc định 6 tháng. Nếu tùy chỉnh,
          phải nhập đủ cả hai.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          className="btn-primary w-full"
          disabled={busy || !studentId || !bedId}
        >
          {busy ? "Đang tạo..." : "Tạo hợp đồng có hiệu lực ngay"}
        </button>
      </form>
    </Modal>
  );
}
