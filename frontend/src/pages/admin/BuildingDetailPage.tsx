import { useEffect, useState } from "react";
import { ArrowLeft, BedDouble, Building2, ChevronRight, DoorOpen, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { buildingApi } from "../../features/buildings/api/building.api";
import { normalizeApiError } from "../../services/api-client";
import type { BuildingOverview } from "../../types/api";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";

const genderLabel = { MALE: "Khu Nam", FEMALE: "Khu Nữ", MIXED: "Khu hỗn hợp" } as const;
const statusLabel = { ACTIVE: "Đang hoạt động", INACTIVE: "Ngừng hoạt động", MAINTENANCE: "Bảo trì" } as const;

export function BuildingDetailPage() {
  const { buildingId = "" } = useParams();
  const [data, setData] = useState<BuildingOverview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setError("");
    buildingApi.overview(buildingId).then(setData).catch((e) => setError(normalizeApiError(e).message));
  }, [buildingId]);
  if (error) return <ErrorState message={error} onRetry={() => location.reload()} />;
  if (!data) return <LoadingState />;
  const { building, summary, floors } = data;
  return (
    <>
      <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500">
        <Link className="hover:text-indigo-600" to="/admin/buildings">Tòa nhà</Link><ChevronRight size={15}/><span className="font-medium text-slate-800">{building.name}</span>
      </nav>
      <section className="mb-6 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4"><div className="rounded-2xl bg-white/10 p-4"><Building2 size={34}/></div><div><h1 className="text-2xl font-bold">{building.name}</h1><p className="mt-1 text-indigo-100">{genderLabel[building.allowedGender]} · {statusLabel[building.status]}</p></div></div>
        <Link className="inline-flex items-center gap-2 text-sm text-indigo-100 hover:text-white" to="/admin/buildings"><ArrowLeft size={16}/>Danh sách tòa nhà</Link>
      </section>
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[["Số tầng", summary.floorCount], ["Phòng", summary.roomCount], ["Tổng giường", summary.totalBeds], ["Đang ở", summary.occupiedBeds], ["Lấp đầy", `${summary.occupancyPercent}%`]].map(([label,value]) => <div className="card" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>)}
      </section>
      {!floors.length ? <EmptyState message="Tòa nhà chưa có phòng" /> : (
        <section className="overflow-hidden rounded-[2rem] border-8 border-slate-700 bg-slate-200 shadow-xl">
          <div className="border-b-8 border-slate-700 bg-slate-800 px-6 py-4 text-center text-white"><strong className="text-lg">{building.name}</strong><p className="text-sm text-slate-300">Sơ đồ quản lý theo tầng</p></div>
          {floors.map((floor) => <div className="grid border-b-4 border-slate-500 bg-white last:border-b-0 lg:grid-cols-[180px_1fr]" key={floor.floor}>
            <Link className="flex flex-col justify-center border-b bg-slate-100 p-4 hover:bg-indigo-50 lg:border-b-0 lg:border-r" to={`/admin/buildings/${buildingId}/floors/${floor.floor}/rooms`}>
              <strong className="text-lg text-slate-900">Tầng {floor.floor}</strong><span className="mt-1 text-xs text-slate-500">{floor.occupiedBeds}/{floor.totalBeds} giường · {floor.roomCount} phòng</span>
            </Link>
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
              {floor.rooms.map((room) => <Link className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50" to={`/admin/rooms/${room.id}`} key={room.id}>
                <div className="flex items-start justify-between gap-2"><strong>{room.roomNumber}</strong><DoorOpen size={17} className="text-indigo-500"/></div>
                <p className="mt-1 truncate text-xs text-slate-500" title={room.roomTypeName}>{room.roomTypeName}</p>
                <div className="mt-2 flex items-center justify-between text-xs"><span className="flex items-center gap-1"><UsersRound size={13}/>{room.occupiedBeds}/{room.totalBeds}</span><span className={room.status === "FULL" ? "text-rose-600" : room.status === "AVAILABLE" ? "text-emerald-600" : "text-amber-600"}>{room.status}</span></div>
              </Link>)}
            </div>
          </div>)}
          <div className="flex items-center justify-center gap-2 border-t-8 border-slate-700 bg-slate-300 py-3 text-sm font-medium text-slate-700"><BedDouble size={17}/>Tổng {summary.emptyBeds} giường còn trống</div>
        </section>
      )}
    </>
  );
}
