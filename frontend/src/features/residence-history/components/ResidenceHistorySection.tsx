import { useEffect, useState } from "react";
import { residenceHistoryApi } from "../api/residence-history.api";
import { normalizeApiError } from "../../../services/api-client";
import { formatDate } from "../../../utils/date";
import type { ResidenceHistoryItem } from "../../../types/api";
export function ResidenceHistorySection({ studentId }: { studentId?: string }) {
  const [items, setItems] = useState<ResidenceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const request = studentId
      ? residenceHistoryApi.student(studentId)
      : residenceHistoryApi.mine();
    request
      .then((data) => {
        if (active) setItems(data.items);
      })
      .catch((e) => {
        if (active) setError(normalizeApiError(e).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId]);
  return (
    <section className="card mt-6">
      <h2 className="text-lg font-bold">Lịch sử lưu trú</h2>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Đang tải lịch sử...</p>
      ) : error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Không thể tải lịch sử: {error}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Chưa có giai đoạn lưu trú.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {items.map((item) => (
            <article
              className="relative border-l-2 border-slate-200 pl-5"
              key={item.contractId}
            >
              <span
                className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${item.isCurrent ? "bg-emerald-500" : "bg-slate-400"}`}
              />
              <p
                className={`text-sm font-semibold ${item.isCurrent ? "text-emerald-700" : "text-slate-600"}`}
              >
                {item.isCurrent
                  ? "Hiện tại"
                  : item.status === "CANCELLED"
                    ? "Đã hủy sau khi kích hoạt"
                    : "Đã kết thúc"}
              </p>
              <h3 className="mt-1 font-bold">
                {item.building.name ?? "Không còn dữ liệu tòa nhà"} -{" "}
                {item.room.roomNumber ?? "Không còn dữ liệu phòng"}
              </h3>
              <p className="text-sm text-slate-600">
                Giường {item.bed.bedNumber ?? "Không còn dữ liệu"}
              </p>
              <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Bắt đầu hợp đồng</dt>
                  <dd>{formatDate(item.segmentStartDate)}</dd>
                </div>
                {item.isCurrent ? (
                  <div>
                    <dt className="text-slate-500">Hạn hợp đồng</dt>
                    <dd>{formatDate(item.plannedEndDate)}</dd>
                  </div>
                ) : (
                  <div>
                    <dt className="text-slate-500">Kết thúc thực tế</dt>
                    <dd>
                      {item.actualEndDate
                        ? formatDate(item.actualEndDate)
                        : "Không có dữ liệu"}
                    </dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
