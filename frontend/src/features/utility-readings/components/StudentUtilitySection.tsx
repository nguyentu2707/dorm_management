import { useEffect, useState } from "react";
import { utilityReadingApi } from "../api/utility-reading.api";
import { normalizeApiError } from "../../../services/api-client";
import type { UtilityReading } from "../../../types/api";
const money = (x: number) => `${x.toLocaleString("vi-VN")}đ`;
export function StudentUtilitySection() {
  const [items, setItems] = useState<UtilityReading[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    utilityReadingApi
      .mine()
      .then((x) => setItems(x.items))
      .catch((e) => setError(normalizeApiError(e).message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <section className="card mt-6">
      <h2 className="text-lg font-bold">Chỉ số điện nước của phòng</h2>
      <p className="mt-1 text-sm text-slate-500">
        Số liệu và chi phí chung của phòng, chưa phải số tiền cá nhân cần thanh
        toán.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Đang tải...</p>
      ) : error ? (
        <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
          Không thể tải chỉ số: {error}
        </p>
      ) : !items.length ? (
        <p className="mt-4 text-sm text-slate-500">Chưa có chỉ số điện nước.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((x) => (
            <article className="rounded-xl bg-slate-50 p-4" key={x.id}>
              <h3 className="font-bold">
                Tháng {x.billingPeriod.slice(5)}/{x.billingPeriod.slice(0, 4)}
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <strong>Điện</strong>
                  <p>
                    {x.electricity.previous} → {x.electricity.current}
                  </p>
                  <p>{x.electricity.usage} kWh</p>
                  <p className="text-sm text-slate-500">
                    Tổng chi phí phòng: {money(x.electricity.amount)}
                  </p>
                </div>
                <div>
                  <strong>Nước</strong>
                  <p>
                    {x.water.previous} → {x.water.current}
                  </p>
                  <p>{x.water.usage} m³</p>
                  <p className="text-sm text-slate-500">
                    Tổng chi phí phòng: {money(x.water.amount)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
