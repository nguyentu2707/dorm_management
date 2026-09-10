import { useCallback, useEffect, useState } from "react";
import type { Paginated, StudentInvoice } from "../../types/api";
import { paymentApi, type Payment } from "./payment.api";
import { normalizeApiError } from "../../services/api-client";
import { Pagination } from "../../components/ui/Pagination";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  Landmark,
  Send,
  WalletCards,
} from "lucide-react";
import { InvoiceBadge, PaymentBadge } from "./PaymentBadge";
const money = (n: number) => n.toLocaleString("vi-VN") + "đ";
export function InvoicePayments({
  invoice,
  onChanged,
}: {
  invoice: StudentInvoice;
  onChanged: () => Promise<void>;
}) {
  const [history, setHistory] = useState<Paginated<Payment> | null>(null),
    [page, setPage] = useState(1);
  const [amount, setAmount] = useState(String(invoice.remainingAmount)),
    [reference, setReference] = useState(""),
    [note, setNote] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setHistory(
        await paymentApi.list(false, {
          invoiceId: invoice.id,
          page,
          limit: 10,
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [invoice.id, page]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setAmount(String(invoice.remainingAmount));
  }, [invoice.remainingAmount]);
  async function act(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      setMessage(success);
      setReference("");
      setNote("");
      await onChanged();
      await load();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }
  const eligible =
    invoice.status !== "CANCELLED" &&
    invoice.remainingAmount > 0 &&
    invoice.pendingAmount === 0;
  return (
    <section className="space-y-5 border-t border-slate-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tình trạng thanh toán
          </p>
          <div className="mt-2">
            <InvoiceBadge status={invoice.status} />
          </div>
        </div>
        <WalletCards className="text-brand-600" aria-hidden="true" />
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Đã thanh toán
          </dt>
          <dd className="mt-1 text-lg font-bold text-emerald-900">
            {money(invoice.paidAmount)}
          </dd>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Còn lại
          </dt>
          <dd className="mt-1 text-lg font-bold text-blue-900">
            {invoice.status === "CANCELLED"
              ? "Không còn phải trả"
              : money(invoice.remainingAmount)}
          </dd>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Chờ xác nhận
          </dt>
          <dd className="mt-1 text-lg font-bold text-amber-900">
            {money(invoice.pendingAmount)}
          </dd>
        </div>
      </dl>
      {error && (
        <p role="alert" className="notice-error flex items-center gap-2">
          <AlertCircle size={17} /> {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice-success flex items-center gap-2">
          <CheckCircle2 size={17} /> {message}
        </p>
      )}
      {invoice.pendingAmount > 0 && (
        <p className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Clock3 className="mt-0.5 shrink-0" size={18} />
          <span>
            Đang chờ xác nhận thanh toán. Số tiền còn lại chỉ giảm sau khi quản
            lý xác nhận.
          </span>
        </p>
      )}
      {eligible && (
        <form
          className="space-y-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void act(
              () =>
                paymentApi.submit(invoice.id, {
                  amount: Number(amount),
                  referenceCode: reference || undefined,
                  note: note || undefined,
                }),
              "Đã gửi yêu cầu xác nhận thanh toán.",
            );
          }}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
              <Landmark size={20} />
            </span>
            <div>
              <h3 className="font-bold text-slate-900">
                Khai báo chuyển khoản
              </h3>
              <p className="text-sm text-slate-600">
                Sau khi chuyển khoản theo thông tin do quản lý cung cấp, gửi
                thông tin để được xác nhận.
              </p>
            </div>
          </div>
          <label className="label">
            Số tiền thanh toán (VND)
            <input
              className="field"
              type="number"
              min="1"
              max={invoice.remainingAmount}
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="label">
            Mã tham chiếu chuyển khoản
            <input
              className="field"
              placeholder="Ví dụ: FT260900123"
              maxLength={120}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="label">
            Ghi chú
            <textarea
              className="field min-h-24 resize-y"
              placeholder="Thông tin giúp quản lý đối chiếu nhanh hơn"
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
            />
          </label>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Thông tin thanh toán sẽ được gửi tới quản lý để xác nhận.
          </p>
          <button
            className="btn-primary w-full sm:w-auto"
            disabled={busy || loading}
          >
            <Send size={16} />
            {busy ? "Đang gửi..." : "Gửi xác nhận thanh toán"}
          </button>
        </form>
      )}
      <div className="flex items-center gap-2 border-t border-slate-200 pt-5">
        <History size={18} className="text-slate-500" />
        <h3 className="font-bold text-slate-900">Lịch sử thanh toán</h3>
      </div>
      {loading ? (
        <p>Đang tải...</p>
      ) : !history?.items.length ? (
        <p className="text-sm text-slate-500">Chưa có thanh toán.</p>
      ) : (
        history.items.map((p) => (
          <article
            key={p.id}
            className="space-y-2 rounded-2xl border border-slate-200 p-4 text-sm transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex justify-between gap-2">
              <strong>{money(p.amount)}</strong>
              <PaymentBadge status={p.status} />
            </div>
            <p>
              <CreditCard className="mr-1 inline" size={14} />{" "}
              {new Date(p.submittedAt).toLocaleString("vi-VN")} · Chuyển khoản
            </p>
            {p.referenceCode && <p>Mã tham chiếu: {p.referenceCode}</p>}
            {p.note && <p>Ghi chú: {p.note}</p>}
            {p.processedBy && (
              <p>
                Xử lý bởi {p.processedBy.fullName}
                {p.processedAt &&
                  ` · ${new Date(p.processedAt).toLocaleString("vi-VN")}`}
              </p>
            )}
            {(p.rejectReason || p.cancelReason || p.voidReason) && (
              <p>Lý do: {p.voidReason || p.rejectReason || p.cancelReason}</p>
            )}
            {p.status === "PENDING" && (
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() =>
                  void act(
                    () => paymentApi.cancel(p.id),
                    "Đã hủy yêu cầu xác nhận.",
                  )
                }
              >
                Hủy yêu cầu
              </button>
            )}
          </article>
        ))
      )}
      {history && <Pagination meta={history.pagination} onChange={setPage} />}
    </section>
  );
}
