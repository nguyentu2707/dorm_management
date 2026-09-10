import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import {
  paymentApi,
  paymentLabels,
  type Payment,
  type PaymentStatus,
} from "../../features/payments/payment.api";
import type { Paginated } from "../../types/api";
import { normalizeApiError } from "../../services/api-client";
import {
  AlertCircle,
  Eye,
  Filter,
  Landmark,
  RefreshCw,
  SearchCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  PaymentBadge,
  InvoiceBadge,
  formatBillingPeriod,
} from "../../features/payments/PaymentBadge";
const money = (n: number) => n.toLocaleString("vi-VN") + "đ";
export function AdminPaymentsPage() {
  const [result, setResult] = useState<Paginated<Payment> | null>(null),
    [page, setPage] = useState(1),
    [status, setStatus] = useState<PaymentStatus | "">("PENDING"),
    [period, setPeriod] = useState("");
  const [selected, setSelected] = useState<Payment | null>(null),
    [action, setAction] = useState<"confirm" | "reject" | "void" | null>(null),
    [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(
        await paymentApi.list(true, {
          page,
          limit: 20,
          status: status || undefined,
          billingPeriod: period || undefined,
        }),
      );
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setLoading(false);
    }
  }, [page, status, period]);
  useEffect(() => {
    void load();
  }, [load]);
  async function open(p: Payment) {
    setError("");
    try {
      setSelected(await paymentApi.get(p.id));
      setAction(null);
      setReason("");
    } catch (e) {
      setError(normalizeApiError(e).message);
    }
  }
  async function process() {
    if (!selected || !action) return;
    setBusy(true);
    setError("");
    try {
      const p = await paymentApi.process(
        selected.id,
        action,
        action === "confirm" ? undefined : reason,
      );
      setSelected(p);
      setAction(null);
      setMessage("Đã cập nhật thanh toán.");
      await load();
    } catch (e) {
      setError(normalizeApiError(e).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Thanh toán"
        description="Đối chiếu chuyển khoản, xác nhận số tiền thực nhận và theo dõi lịch sử xử lý"
        action={
          result ? (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm">
              {result.pagination.total} kết quả
            </span>
          ) : undefined
        }
      />
      <div className="card mb-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-2 self-start text-sm font-bold text-slate-800 sm:mr-2 sm:self-center">
          <Filter size={18} className="text-brand-600" /> Bộ lọc
        </div>
        <label className="label min-w-52 flex-1 sm:max-w-xs">
          Trạng thái
          <select
            className="field mt-1"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PaymentStatus | "");
              setPage(1);
              setMessage("");
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(paymentLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="label min-w-52 flex-1 sm:max-w-xs">
          Kỳ hóa đơn
          <input
            className="field mt-1"
            type="month"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setPage(1);
              setMessage("");
            }}
          />
        </label>
        <button
          className="btn-secondary sm:mb-0"
          onClick={() => {
            setError("");
            void load();
          }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Tải
          lại
        </button>
      </div>
      {error && !selected && (
        <p role="alert" className="notice-error mb-4 flex items-center gap-2">
          <AlertCircle size={17} /> {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice-success mb-4">
          {message}
        </p>
      )}
      <div className="table-shell">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-slate-500">
            <RefreshCw size={18} className="animate-spin" /> Đang tải thanh
            toán...
          </div>
        ) : !result?.items.length ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-5 text-center text-slate-500">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
              <SearchCheck size={28} />
            </span>
            <div>
              <strong className="block text-slate-700">
                Không có thanh toán phù hợp
              </strong>
              <span className="text-sm">
                Hãy thay đổi bộ lọc hoặc tải lại danh sách.
              </span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-sm">
              <thead>
                <tr className="table-head border-b border-slate-200">
                  {[
                    "Sinh viên",
                    "Kỳ / Phòng",
                    "Tổng hóa đơn",
                    "Thanh toán",
                    "Phương thức / Mã tham chiếu",
                    "Trạng thái",
                    "Thời gian gửi",
                    "",
                  ].map((h, i) => (
                    <th className="px-4 py-3.5" key={i}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-2 font-semibold text-slate-900">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                          <UserRound size={15} />
                        </span>
                        {p.student.fullName}
                      </span>
                      <small className="ml-10 block text-slate-500">
                        {p.student.mssv}
                      </small>
                    </td>
                    <td>
                      <span className="font-medium text-slate-800">
                        {formatBillingPeriod(p.invoice.billingPeriod)}
                      </span>
                      <small className="block text-slate-500">
                        {p.room.buildingName} · {p.room.roomNumber}
                      </small>
                    </td>
                    <td className="font-medium">
                      {money(p.invoice.totalAmount)}
                    </td>
                    <td className="font-bold text-brand-700">
                      {money(p.amount)}
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <Landmark size={14} className="text-slate-400" />
                        Chuyển khoản
                      </span>
                      <small
                        className="block max-w-40 truncate text-slate-500"
                        title={p.referenceCode}
                      >
                        {p.referenceCode || "Chưa cung cấp"}
                      </small>
                    </td>
                    <td>
                      <PaymentBadge status={p.status} />
                    </td>
                    <td>{new Date(p.submittedAt).toLocaleString("vi-VN")}</td>
                    <td>
                      <button
                        className="btn-secondary px-3 py-2"
                        onClick={() => void open(p)}
                      >
                        <Eye size={15} /> Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && (
          <div className="px-5 pb-5">
            <Pagination meta={result.pagination} onChange={setPage} />
          </div>
        )}
      </div>
      <Modal
        open={!!selected}
        title="Chi tiết thanh toán"
        size="lg"
        onClose={() => {
          if (!busy) {
            setSelected(null);
            setError("");
          }
        }}
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-700 p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-200">
                    {formatBillingPeriod(selected.invoice.billingPeriod)}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">
                    {selected.student.fullName}
                  </h3>
                  <p className="mt-1 text-slate-300">
                    {selected.student.mssv} · {selected.room.buildingName} ·
                    Phòng {selected.room.roomNumber}
                  </p>
                </div>
                <WalletCards size={30} className="text-blue-200" />
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <span className="text-xs text-slate-300">
                    Số tiền khai báo
                  </span>
                  <strong className="mt-1 block text-2xl">
                    {money(selected.amount)}
                  </strong>
                </div>
                <PaymentBadge status={selected.status} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-xs text-slate-500">Tổng hóa đơn</span>
                <strong className="mt-1 block">
                  {money(selected.invoice.totalAmount)}
                </strong>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800">
                <span className="text-xs">Đã xác nhận</span>
                <strong className="mt-1 block">
                  {money(selected.invoice.paidAmount)}
                </strong>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-800">
                <span className="text-xs">Còn lại</span>
                <strong className="mt-1 block">
                  {selected.invoice.status === "CANCELLED"
                    ? "Không còn phải trả"
                    : money(selected.invoice.remainingAmount)}
                </strong>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Trạng thái hóa đơn</span>
              <InvoiceBadge status={selected.invoice.status} />
            </div>
            {(selected.referenceCode || selected.note) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Thông tin đối chiếu
                </p>
                <p className="mt-2">
                  Mã tham chiếu:{" "}
                  <strong>{selected.referenceCode || "Chưa cung cấp"}</strong>
                </p>
                {selected.note && (
                  <p className="mt-1 text-slate-600">
                    Ghi chú: {selected.note}
                  </p>
                )}
              </div>
            )}
            {selected.processedBy && (
              <p className="rounded-xl bg-slate-50 p-3 text-slate-600">
                Xử lý bởi {selected.processedBy.fullName} ·{" "}
                {selected.processedAt &&
                  new Date(selected.processedAt).toLocaleString("vi-VN")}
              </p>
            )}
            {selected.voidedBy && (
              <p className="rounded-xl bg-violet-50 p-3 text-violet-800">
                Vô hiệu hóa bởi {selected.voidedBy.fullName} ·{" "}
                {selected.voidedAt &&
                  new Date(selected.voidedAt).toLocaleString("vi-VN")}
              </p>
            )}
            {(selected.voidReason ||
              selected.rejectReason ||
              selected.cancelReason) && (
              <p className="notice-error">
                Lý do:{" "}
                {selected.voidReason ||
                  selected.rejectReason ||
                  selected.cancelReason}
              </p>
            )}
            {error && (
              <p role="alert" className="notice-error">
                {error}
              </p>
            )}
            {!action && (
              <div className="flex flex-wrap gap-2">
                {selected.status === "PENDING" && (
                  <>
                    <button
                      className="btn-primary"
                      onClick={() => setAction("confirm")}
                    >
                      Xác nhận đã nhận tiền
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => setAction("reject")}
                    >
                      Từ chối
                    </button>
                  </>
                )}
                {selected.status === "CONFIRMED" && (
                  <button
                    className="btn-danger"
                    onClick={() => setAction("void")}
                  >
                    Vô hiệu hóa bản ghi
                  </button>
                )}
              </div>
            )}
            {action && (
              <form
                className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void process();
                }}
              >
                <p>
                  {action === "confirm"
                    ? "Chỉ xác nhận sau khi đã đối chiếu tiền thực nhận trong tài khoản ngân hàng."
                    : action === "void"
                      ? "Vô hiệu hóa bản ghi ghi nhận sai. Thao tác này không hoàn tiền qua ngân hàng."
                      : "Nhập lý do từ chối để sinh viên kiểm tra lại."}
                </p>
                {action !== "confirm" && (
                  <label className="label">
                    Lý do
                    <textarea
                      className="field min-h-24 resize-y"
                      placeholder="Nêu rõ lý do để lưu vào lịch sử xử lý"
                      required
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    className="btn-danger"
                    disabled={busy || (action !== "confirm" && !reason.trim())}
                  >
                    {busy ? "Đang xử lý..." : "Xác nhận thao tác"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => setAction(null)}
                  >
                    Quay lại
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
