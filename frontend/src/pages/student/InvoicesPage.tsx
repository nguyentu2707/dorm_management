import { useCallback, useEffect, useState } from "react";
import { InvoicePayments } from "../../features/payments/InvoicePayments";
import {
  InvoiceBadge,
  formatBillingPeriod,
} from "../../features/payments/PaymentBadge";
import {
  Building2,
  CalendarDays,
  Eye,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { studentInvoiceApi } from "../../features/billing/api/billing.api";
import { normalizeApiError } from "../../services/api-client";
import type { Paginated, StudentInvoice } from "../../types/api";

const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
export function StudentInvoicesPage() {
  const [result, setResult] = useState<Paginated<StudentInvoice> | null>(null);
  const [selected, setSelected] = useState<StudentInvoice | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await studentInvoiceApi.list({ page, limit: 20 }));
    } catch (cause) {
      setError(normalizeApiError(cause).message);
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    void load();
  }, [load]);
  async function open(id: string) {
    setError("");
    try {
      setSelected(await studentInvoiceApi.get(id));
    } catch (cause) {
      setError(normalizeApiError(cause).message);
    }
  }
  return (
    <>
      <PageHeader
        title="Hóa đơn"
        description="Theo dõi chi phí, số tiền đã thanh toán và các yêu cầu đang chờ xác nhận"
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !result?.items.length ? (
        <div className="card">
          <EmptyState message="Bạn chưa có hóa đơn nào" />
        </div>
      ) : (
        <div className="table-shell">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <ReceiptText size={20} />
              </span>
              <div>
                <h2 className="font-bold text-slate-900">Danh sách hóa đơn</h2>
                <p className="text-xs text-slate-500">
                  {result.pagination.total} hóa đơn
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">
            {result.items.map((x) => (
              <button
                key={x.id}
                onClick={() => void open(x.id)}
                className="w-full p-5 text-left transition hover:bg-slate-50"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <strong className="text-slate-900">
                    {formatBillingPeriod(x.billingPeriod)}
                  </strong>
                  <InvoiceBadge status={x.status} />
                </div>
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 size={15} /> {x.room.buildingName} · Phòng{" "}
                  {x.room.roomNumber}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500">Tổng hóa đơn</span>
                    <strong className="mt-1 block text-lg text-slate-900">
                      {money(x.totalAmount)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Còn lại</span>
                    <strong className="mt-1 block text-lg text-brand-700">
                      {money(x.remainingAmount)}
                    </strong>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="table-head border-b border-slate-200">
                  <th className="px-5 py-3.5">Tháng</th>
                  <th>Phòng</th>
                  <th>Ngày cư trú</th>
                  <th className="text-right">Tổng</th>
                  <th className="text-right">Còn lại</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.items.map((x) => (
                  <tr
                    key={x.id}
                    className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {formatBillingPeriod(x.billingPeriod)}
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <Building2 size={15} className="text-slate-400" />
                        {x.room.buildingName} · {x.room.roomNumber}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-slate-400" />
                        {x.residentDays}/{x.daysInMonth} ngày
                      </span>
                    </td>
                    <td className="text-right font-semibold">
                      {money(x.totalAmount)}
                    </td>
                    <td className="text-right font-bold text-brand-700">
                      {x.status === "CANCELLED"
                        ? "—"
                        : money(x.remainingAmount)}
                    </td>
                    <td>
                      <InvoiceBadge status={x.status} />
                    </td>
                    <td>
                      <button
                        className="btn-secondary px-3 py-2"
                        onClick={() => void open(x.id)}
                      >
                        <Eye size={15} /> Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-5">
            <Pagination meta={result.pagination} onChange={setPage} />
          </div>
        </div>
      )}
      <Modal
        open={!!selected}
        title={`Hóa đơn ${selected?.billingPeriod ?? ""}`}
        size="lg"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-300">
                    {formatBillingPeriod(selected.billingPeriod)}
                  </p>
                  <h3 className="mt-1 text-xl font-bold">
                    {selected.room.buildingName} · Phòng{" "}
                    {selected.room.roomNumber}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Cư trú {selected.residentDays}/{selected.daysInMonth} ngày
                  </p>
                </div>
                <WalletCards size={28} className="text-blue-300" />
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Chi tiết các khoản phí
              </div>
              {selected.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 border-t border-slate-100 px-4 py-3 first:border-0"
                >
                  <span>
                    {item.description}
                    <small className="block text-slate-500">
                      {item.calculationNote}
                    </small>
                  </span>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))}
              <p className="border-t border-slate-200 bg-slate-50 px-4 py-4 text-lg font-bold">
                Tổng{" "}
                <span className="float-right">
                  {money(selected.totalAmount)}
                </span>
              </p>
            </div>
            {selected.status === "CANCELLED" && (
              <p className="rounded bg-red-50 p-3 text-sm text-red-700">
                Hóa đơn đã hủy, không còn là khoản phải trả.
              </p>
            )}
            <InvoicePayments
              key={selected.id}
              invoice={selected}
              onChanged={async () => {
                setSelected(await studentInvoiceApi.get(selected.id));
                await load();
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
