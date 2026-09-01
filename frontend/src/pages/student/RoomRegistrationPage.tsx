import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import {
  RoomRecommendationPanel,
} from "../../features/contracts/components/RoomRecommendationPanel";
import { recommendationApi } from "../../features/recommendations/api/recommendation.api";
import { studentFacilityApi } from "../../features/student-facilities/api/student-facility.api";
import { contractApi } from "../../features/contracts/api/contract.api";
import { normalizeApiError } from "../../services/api-client";
import type {
  Bed,
  Contract,
  StudentBuilding,
  StudentRoom,
  RecommendationResponse,
  RoomPreference,
  RoomRecommendation,
} from "../../types/api";
function addMonths(date: Date, n: number) {
  const d = new Date(date),
    day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(
    Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()),
  );
  return d;
}
export function StudentRoomRegistrationPage() {
  const nav = useNavigate(),
    [contracts, setContracts] = useState<Contract[] | null>(null),
    [buildings, setBuildings] = useState<StudentBuilding[]>([]),
    [rooms, setRooms] = useState<StudentRoom[]>([]),
    [beds, setBeds] = useState<Bed[]>([]),
    [buildingId, setBuildingId] = useState(""),
    [roomId, setRoomId] = useState(""),
    [bedId, setBedId] = useState(""),
    [busy, setBusy] = useState(false),
    [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null),
    [recommendationLoading, setRecommendationLoading] = useState(true),
    [preference, setPreference] = useState<Partial<RoomPreference>>({ pricePreference: "ANY", wantsHotWater: null, occupancyPreference: "ANY" }),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([contractApi.mine(), studentFacilityApi.buildings(), recommendationApi.preference()])
      .then(([c, b, p]) => {
        setContracts(c);
        setBuildings(b);
        if (p) setPreference(p);
      })
      .catch((e) => setError(normalizeApiError(e).message));
    recommendationApi.list().then(setRecommendations).catch((e) => {
      const issue = normalizeApiError(e);
      if (issue.code === "STUDENT_ALREADY_HAS_OPEN_CONTRACT") return;
      setError(issue.message);
    }).finally(() => setRecommendationLoading(false));
  }, []);
  const open = contracts?.some(
    (x) => x.status === "PENDING" || x.status === "ACTIVE",
  );
  const room = rooms.find((x) => x.id === roomId),
    bed = beds.find((x) => x.id === bedId),
    building = buildings.find((x) => x.id === buildingId),
    period = useMemo(() => {
      const start = new Date();
      return { start, end: addMonths(start, 6) };
    }, []);
  async function chooseBuilding(id: string) {
    setBuildingId(id);
    setRoomId("");
    setBedId("");
    setBeds([]);
    setRooms(id ? await studentFacilityApi.rooms(id) : []);
  }
  async function chooseRoom(id: string) {
    setRoomId(id);
    setBedId("");
    setBeds(id ? await studentFacilityApi.emptyBeds(id) : []);
  }
  async function recommended(x: RoomRecommendation) {
    await chooseBuilding(x.room.building.id);
    setRoomId(x.room.id);
    setBedId("");
    setBeds(await studentFacilityApi.emptyBeds(x.room.id));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await contractApi.create({ bedId });
      nav("/student/room", { replace: true });
    } catch (e) {
      const x = normalizeApiError(e);
      setError(
        x.code === "BED_NOT_AVAILABLE"
          ? "Giường này vừa được đăng ký bởi sinh viên khác."
          : x.message,
      );
      if (x.code === "BED_NOT_AVAILABLE" && roomId) {
        const fresh = await studentFacilityApi.emptyBeds(roomId);
        setBeds(fresh);
        setBedId("");
        if (!fresh.length) setRooms(await studentFacilityApi.rooms(buildingId));
      }
    } finally {
      setBusy(false);
    }
  }
  if (open) return <Navigate to="/student/room" replace />;
  return (
    <>
      <PageHeader
        title="Đăng ký phòng"
        description="Chọn phòng phù hợp với nhu cầu của bạn."
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <RoomRecommendationPanel
          data={recommendations}
          loading={recommendationLoading}
          preference={preference}
          onPreferenceChange={setPreference}
          onSavePreference={async () => {
            await recommendationApi.savePreference({
              pricePreference: preference.pricePreference,
              wantsHotWater: preference.wantsHotWater,
              occupancyPreference: preference.occupancyPreference,
            });
            setRecommendations(await recommendationApi.list());
          }}
          onSelect={recommended}
        />
        <form className="card space-y-4" onSubmit={submit}>
          <h2 className="text-lg font-bold">Tự chọn phòng</h2>
          <select
            className="field"
            required
            value={buildingId}
            onChange={(e) => void chooseBuilding(e.target.value)}
          >
            <option value="">Chọn tòa nhà</option>
            {buildings.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            className="field"
            required
            disabled={!buildingId}
            value={roomId}
            onChange={(e) => void chooseRoom(e.target.value)}
          >
            <option value="">Chọn phòng</option>
            {rooms.map((x) => (
              <option key={x.id} value={x.id}>
                {x.roomNumber} · Tầng {x.floor} · {x.emptyBedCount}/
                {x.totalBedCount} giường ·{" "}
                {x.roomType.pricePerMonth.toLocaleString("vi-VN")}đ
              </option>
            ))}
          </select>
          <select
            className="field"
            required
            disabled={!roomId}
            value={bedId}
            onChange={(e) => setBedId(e.target.value)}
          >
            <option value="">Chọn giường</option>
            {beds.map((x) => (
              <option key={x.id} value={x.id}>
                Giường {x.bedNumber}
              </option>
            ))}
          </select>
          {bed && room && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <strong>Xác nhận đăng ký</strong>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <dt>Tòa</dt>
                <dd>{building?.name}</dd>
                <dt>Phòng</dt>
                <dd>{room.roomNumber}</dd>
                <dt>Giường</dt>
                <dd>{bed.bedNumber}</dd>
                <dt>Loại phòng</dt>
                <dd>{room.roomType.name}</dd>
                <dt>Thời hạn</dt>
                <dd>
                  {period.start.toLocaleDateString("vi-VN")} →{" "}
                  {period.end.toLocaleDateString("vi-VN")}
                </dd>
              </dl>
            </div>
          )}
          {error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button className="btn-primary w-full" disabled={!bedId || busy}>
            {busy ? "Đang gửi..." : "Xác nhận đăng ký"}
          </button>
        </form>
      </div>
    </>
  );
}
