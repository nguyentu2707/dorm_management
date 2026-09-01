import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { recommendationApi } from "../../features/recommendations/api/recommendation.api";
import { normalizeApiError } from "../../services/api-client";
import type { DayOfWeek, ScheduleEntry } from "../../types/api";

const days: Array<{ value: DayOfWeek; label: string }> = [
  { value: "MONDAY", label: "Thứ 2" }, { value: "TUESDAY", label: "Thứ 3" },
  { value: "WEDNESDAY", label: "Thứ 4" }, { value: "THURSDAY", label: "Thứ 5" },
  { value: "FRIDAY", label: "Thứ 6" }, { value: "SATURDAY", label: "Thứ 7" },
  { value: "SUNDAY", label: "Chủ nhật" },
];
const key = (day: DayOfWeek, period: number) => `${day}:${period}`;
function toEntries(selected: Set<string>): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];
  for (const day of days) {
    let start: number | null = null;
    for (let period = 1; period <= 11; period++) {
      const active = period <= 10 && selected.has(key(day.value, period));
      if (active && start === null) start = period;
      if (!active && start !== null) { entries.push({ dayOfWeek: day.value, startPeriod: start, endPeriod: period - 1 }); start = null; }
    }
  }
  return entries;
}
export function StudentSchedulePage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { void recommendationApi.schedule().then((schedule) => {
    const next = new Set<string>();
    schedule?.entries.forEach((entry) => { for (let p = entry.startPeriod; p <= entry.endPeriod; p++) next.add(key(entry.dayOfWeek, p)); });
    setSelected(next);
  }).catch((e) => setError(normalizeApiError(e).message)); }, []);
  const entries = useMemo(() => toEntries(selected), [selected]);
  return <>
    <PageHeader title="Lịch học" description="Tùy chọn: lịch giúp so sánh với sinh viên đang ở trong phòng." />
    <div className="card overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-[110px_repeat(10,minmax(52px,1fr))] gap-1 text-center text-sm">
        <div />{Array.from({ length: 10 }, (_, i) => <strong key={i} className="p-2">{i + 1}</strong>)}
        {days.flatMap((day) => [<strong key={day.value} className="p-2 text-left">{day.label}</strong>, ...Array.from({ length: 10 }, (_, i) => {
          const cell = key(day.value, i + 1), active = selected.has(cell);
          return <button type="button" aria-label={`${day.label} tiết ${i + 1}`} key={cell} className={`h-10 rounded ${active ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-indigo-100"}`} onClick={() => setSelected((current) => { const next = new Set(current); active ? next.delete(cell) : next.add(cell); return next; })}>{active ? "■" : ""}</button>;
        })])}
      </div>
      <div className="mt-5 flex gap-2">
        <button className="btn-primary" onClick={async () => { await recommendationApi.saveSchedule(entries); setMessage("Đã lưu lịch học."); }}>Lưu lịch</button>
        <button className="btn-secondary" onClick={async () => { await recommendationApi.deleteSchedule(); setSelected(new Set()); setMessage("Đã xóa lịch học."); }}>Xóa lịch</button>
      </div>
      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  </>;
}
