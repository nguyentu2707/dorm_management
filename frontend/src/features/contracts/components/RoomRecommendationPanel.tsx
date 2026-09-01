import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { RecommendationResponse, RoomPreference, RoomRecommendation } from "../../../types/api";

const levelLabel = { BASIC: "Gợi ý cơ bản", PARTIAL: "Cá nhân hóa một phần", PERSONALIZED: "Cá nhân hóa cao" } as const;
export function RoomRecommendationPanel({ data, loading, preference, onPreferenceChange, onSavePreference, onSelect }: {
  data: RecommendationResponse | null;
  loading: boolean;
  preference: Partial<RoomPreference>;
  onPreferenceChange: (value: Partial<RoomPreference>) => void;
  onSavePreference: () => void;
  onSelect: (item: RoomRecommendation) => void;
}) {
  return (
    <section className="card h-fit bg-gradient-to-br from-indigo-50 to-white">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-600 p-2 text-white"><Sparkles /></span><div><h2 className="font-bold">Gợi ý phòng phù hợp</h2><p className="text-xs text-slate-500">Xếp hạng minh bạch từ nhu cầu và dữ liệu phòng</p></div></div>
      <details className="mt-4 rounded-xl border bg-white p-3">
        <summary className="cursor-pointer font-medium">Tùy chỉnh nhu cầu</summary>
        <div className="mt-3 space-y-3">
          <label><span className="label">Mức giá</span><select className="field" value={preference.pricePreference ?? "ANY"} onChange={(e) => onPreferenceChange({ ...preference, pricePreference: e.target.value as RoomPreference["pricePreference"] })}><option value="LOW">Giá rẻ</option><option value="MEDIUM">Trung bình</option><option value="ANY">Không quan trọng</option></select></label>
          <label><span className="label">Nóng lạnh</span><select className="field" value={preference.wantsHotWater === true ? "YES" : preference.wantsHotWater === false ? "NO" : "ANY"} onChange={(e) => onPreferenceChange({ ...preference, wantsHotWater: e.target.value === "YES" ? true : e.target.value === "NO" ? false : null })}><option value="YES">Có</option><option value="NO">Không cần</option><option value="ANY">Không quan trọng</option></select></label>
          <label><span className="label">Mức độ đầy</span><select className="field" value={preference.occupancyPreference ?? "ANY"} onChange={(e) => onPreferenceChange({ ...preference, occupancyPreference: e.target.value as RoomPreference["occupancyPreference"] })}><option value="MORE_EMPTY">Còn nhiều chỗ</option><option value="MORE_OCCUPIED">Đã có nhiều người</option><option value="ANY">Không quan trọng</option></select></label>
          <button type="button" className="btn-secondary w-full" onClick={onSavePreference}>Lưu nhu cầu</button>
        </div>
      </details>
      {!data?.hasSchedule && <div className="mt-4 rounded-lg bg-white p-3 text-sm text-slate-600">Thêm lịch học để hệ thống có thể cá nhân hóa gợi ý tốt hơn. <Link className="font-medium text-indigo-600" to="/student/schedule">Thêm lịch học</Link></div>}
      {loading ? <p className="mt-5 text-sm text-slate-500">Đang tính gợi ý...</p> : data?.items.length ? <div className="mt-5 space-y-3">{data.items.map((item) => (
        <button type="button" key={item.room.id} className="w-full rounded-xl border bg-white p-4 text-left hover:border-indigo-400" onClick={() => onSelect(item)}>
          <div className="flex items-start justify-between gap-2"><strong>{item.room.building.name} · {item.room.roomNumber}</strong><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">{item.compatibilityScore}%</span></div>
          <p className="mt-1 text-xs font-medium text-slate-600">{levelLabel[item.personalizationLevel]}</p>
          <p className="text-sm text-slate-500">Còn {item.availableBedCount} giường · {item.room.pricePerMonth.toLocaleString("vi-VN")}đ/tháng</p>
          <ul className="mt-2 list-disc pl-4 text-xs text-slate-500">{item.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </button>
      ))}</div> : <p className="mt-5 text-sm text-slate-500">Hiện chưa có phòng khả dụng.</p>}
    </section>
  );
}
