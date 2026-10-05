import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { recommendationApi } from "../../features/recommendations/api/recommendation.api";
import { normalizeApiError } from "../../services/api-client";
import type { DayOfWeek, ScheduleEntry } from "../../types/api";

const days: Array<{ value: DayOfWeek; label: string }> = [
  { value: "MONDAY", label: "Thứ 2" },
  { value: "TUESDAY", label: "Thứ 3" },
  { value: "WEDNESDAY", label: "Thứ 4" },
  { value: "THURSDAY", label: "Thứ 5" },
  { value: "FRIDAY", label: "Thứ 6" },
  { value: "SATURDAY", label: "Thứ 7" },
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
      if (!active && start !== null) {
        entries.push({
          dayOfWeek: day.value,
          startPeriod: start,
          endPeriod: period - 1,
        });
        start = null;
      }
    }
  }
  return entries;
}

export function StudentSchedulePage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    void recommendationApi
      .schedule()
      .then((schedule) => {
        const next = new Set<string>();
        schedule?.entries.forEach((entry) => {
          for (let period = entry.startPeriod; period <= entry.endPeriod; period++)
            next.add(key(entry.dayOfWeek, period));
        });
        setSelected(next);
      })
      .catch((cause) => setError(normalizeApiError(cause).message));
  }, []);

  const entries = useMemo(() => toEntries(selected), [selected]);
  async function mutate(work: () => Promise<unknown>, success: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      setMessage(success);
    } catch (cause) {
      setError(normalizeApiError(cause).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Lịch học"
        description="Tùy chọn: lịch giúp so sánh với sinh viên đang ở trong phòng."
      />
      <div className="card overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[110px_repeat(10,minmax(52px,1fr))] gap-1 text-center text-sm">
          <div />
          {Array.from({ length: 10 }, (_, index) => (
            <strong key={index} className="p-2">{index + 1}</strong>
          ))}
          {days.flatMap((day) => [
            <strong key={day.value} className="p-2 text-left">{day.label}</strong>,
            ...Array.from({ length: 10 }, (_, index) => {
              const cell = key(day.value, index + 1);
              const active = selected.has(cell);
              return (
                <button
                  type="button"
                  aria-label={`${day.label} tiết ${index + 1}`}
                  aria-pressed={active}
                  key={cell}
                  className={`h-10 rounded ${active ? "bg-indigo-600 text-white" : "bg-slate-100 hover:bg-indigo-100"}`}
                  onClick={() =>
                    setSelected((current) => {
                      const next = new Set(current);
                      active ? next.delete(cell) : next.add(cell);
                      return next;
                    })
                  }
                >
                  {active ? "■" : ""}
                </button>
              );
            }),
          ])}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() => void mutate(() => recommendationApi.saveSchedule(entries), "Đã lưu lịch học.")}
          >
            {busy ? "Đang xử lý..." : "Lưu lịch"}
          </button>
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() =>
              void mutate(async () => {
                await recommendationApi.deleteSchedule();
                setSelected(new Set());
              }, "Đã xóa lịch học.")
            }
          >
            Xóa lịch
          </button>
        </div>
        {message && <p className="notice-success mt-3" role="status">{message}</p>}
        {error && <p className="notice-error mt-3" role="alert">{error}</p>}
      </div>
    </>
  );
}
