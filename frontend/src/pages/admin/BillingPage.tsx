import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { ErrorState, LoadingState } from "../../components/ui/States";
import { billingApi } from "../../features/billing/api/billing.api";
import { buildingApi } from "../../features/buildings/api/building.api";
import { roomApi } from "../../features/rooms/api/room.api";
import { utilityReadingApi } from "../../features/utility-readings/api/utility-reading.api";
import { normalizeApiError } from "../../services/api-client";
import type {
  Building,
  MonthlyBilling,
  MonthlyBillingPreview,
  Room,
} from "../../types/api";

const money = (value = 0) => `${value.toLocaleString("vi-VN")}đ`;
const currentPeriod = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((x) => x.type === "year")?.value}-${parts.find((x) => x.type === "month")?.value}`;
};

export function AdminBillingPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [buildingId, setBuildingId] = useState("");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [billings, setBillings] = useState<MonthlyBilling[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [billing, setBilling] = useState<MonthlyBilling | null>(null);
  const [preview, setPreview] = useState<MonthlyBillingPreview | null>(null);
  const [firstReading, setFirstReading] = useState(false);
  const [form, setForm] = useState({
    electricityPrevious: 0,
    electricityCurrent: 0,
    waterPrevious: 0,
    waterCurrent: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"finalize" | "cancel" | null>(null);

  useEffect(() => {
    void buildingApi.list().then(setBuildings);
  }, []);
  const load = useCallback(async () => {
    if (!buildingId) {
      setRooms([]);
      setBillings([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [roomResult, billingResult] = await Promise.all([
        roomApi.list(buildingId, { page: 1, limit: 100 }),
        billingApi.list({
          buildingId,
          billingPeriod: period,
          page: 1,
          limit: 100,
        }),
      ]);
      setRooms(roomResult.items);
      setBillings(billingResult.items);
    } catch (cause) {
      setError(normalizeApiError(cause).message);
    } finally {
      setLoading(false);
    }
  }, [buildingId, period]);
  useEffect(() => {
    void load();
  }, [load]);
  const byRoom = useMemo(
    () => new Map(billings.map((item) => [item.room.id, item])),
    [billings],
  );

  async function openRoom(room: Room) {
    setSelectedRoom(room);
    setPreview(null);
    setError("");
    try {
      const existing = byRoom.get(room.id);
      if (existing) {
        const [detail, history] = await Promise.all([
          billingApi.get(existing.id),
          utilityReadingApi.list({ roomId: room.id, page: 1, limit: 1 }),
        ]);
        setBilling(detail);
        setFirstReading(detail.status === "DRAFT" && !history.items.length);
        setForm(detail.draft);
      } else {
        const history = await utilityReadingApi.list({
          roomId: room.id,
          page: 1,
          limit: 1,
        });
        const latest = history.items[0];
        setBilling(null);
        setFirstReading(!latest);
        setForm({
          electricityPrevious: latest?.electricity.current ?? 0,
          electricityCurrent: latest?.electricity.current ?? 0,
          waterPrevious: latest?.water.current ?? 0,
          waterCurrent: latest?.water.current ?? 0,
        });
      }
    } catch (cause) {
      setError(normalizeApiError(cause).message);
    }
  }

  async function saveAndPreview() {
    if (!selectedRoom) return;
    setLoading(true);
    setError("");
    try {
      const saved = await billingApi.saveDraft({
        roomId: selectedRoom.id,
        billingPeriod: period,
        electricityCurrent: form.electricityCurrent,
        waterCurrent: form.waterCurrent,
        ...(firstReading
          ? {
              electricityPrevious: form.electricityPrevious,
              waterPrevious: form.waterPrevious,
            }
          : {}),
      });
      setBilling(saved);
      setPreview(await billingApi.preview(saved.id));
      await load();
    } catch (cause) {
      setError(normalizeApiError(cause).message);
    } finally {
      setLoading(false);
    }
  }

  async function runConfirmed() {
    if (!billing || !confirm) return;
    setLoading(true);
    setError("");
    try {
      const updated =
        confirm === "finalize"
          ? await billingApi.finalize(billing.id)
          : await billingApi.cancel(billing.id, "Hủy bởi quản trị viên");
      setBilling(updated);
      setPreview(null);
      setConfirm(null);
      await load();
    } catch (cause) {
      setError(normalizeApiError(cause).message);
      setConfirm(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Hóa đơn hàng tháng"
        description="Nhập chỉ số → lưu nháp → xem trước → hoàn tất"
      />
      <div className="card mb-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          Kỳ hóa đơn
          <input
            className="field mt-1"
            type="month"
            max={currentPeriod()}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Tòa nhà
          <select
            className="field mt-1"
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
          >
            <option value="">Chọn tòa nhà</option>
            {buildings.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading && !selectedRoom ? (
        <LoadingState />
      ) : error && !selectedRoom ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => {
            const item = byRoom.get(room.id);
            const status = item?.status ?? "CHƯA NHẬP";
            return (
              <button
                key={room.id}
                onClick={() => void openRoom(room)}
                className="card text-left hover:border-brand-400"
              >
                <strong className="text-lg">Phòng {room.roomNumber}</strong>
                <span
                  className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${status === "FINALIZED" ? "bg-emerald-50 text-emerald-700" : status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={!!selectedRoom}
        title={`Phòng ${selectedRoom?.roomNumber ?? ""} · ${period}`}
        onClose={() => setSelectedRoom(null)}
      >
        {billing?.status === "FINALIZED" || billing?.status === "CANCELLED" ? (
          <BillingResult
            billing={billing}
            onCancel={() => setConfirm("cancel")}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Bước 1 — Chỉ số · Bước 2 — Preview · Bước 3 — Finalize
            </p>
            {firstReading && (
              <p className="rounded bg-blue-50 p-3 text-sm text-blue-700">
                Đây là kỳ đầu tiên. Hãy nhập chỉ số điện và nước ban đầu.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Điện kỳ trước"
                disabled={!firstReading}
                value={form.electricityPrevious}
                onChange={(value) =>
                  setForm({ ...form, electricityPrevious: value })
                }
              />
              <NumberField
                label="Điện hiện tại"
                value={form.electricityCurrent}
                onChange={(value) =>
                  setForm({ ...form, electricityCurrent: value })
                }
              />
              <NumberField
                label="Nước kỳ trước"
                disabled={!firstReading}
                value={form.waterPrevious}
                onChange={(value) => setForm({ ...form, waterPrevious: value })}
              />
              <NumberField
                label="Nước hiện tại"
                value={form.waterCurrent}
                onChange={(value) => setForm({ ...form, waterCurrent: value })}
              />
            </div>
            <button
              className="btn-primary w-full"
              disabled={loading}
              onClick={() => void saveAndPreview()}
            >
              Lưu nháp & xem trước
            </button>
            {preview && (
              <Preview
                value={preview}
                onFinalize={() => setConfirm("finalize")}
              />
            )}
          </div>
        )}
        {error && (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </Modal>
      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm === "cancel"
            ? "Hủy toàn bộ hóa đơn của phòng?"
            : "Khóa và hoàn tất kỳ hóa đơn?"
        }
        message={
          confirm === "cancel"
            ? "Việc hủy sẽ hủy toàn bộ hóa đơn sinh viên của phòng. Kỳ đã hủy không thể tạo lại trong phiên bản hiện tại."
            : "Sau khi xác nhận, hóa đơn sẽ bị khóa và không thể tạo lại kỳ này. Hãy kiểm tra chỉ số, cư dân và số tiền trước khi tiếp tục."
        }
        busy={loading}
        onClose={() => setConfirm(null)}
        onConfirm={() => void runConfirmed()}
      />
    </>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        required
        className="field mt-1"
        type="number"
        min="0"
        step="any"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Preview({
  value,
  onFinalize,
}: {
  value: MonthlyBillingPreview;
  onFinalize: () => void;
}) {
  return (
    <div className="space-y-4 border-t pt-4">
      {value.warnings.map((warning) => (
        <p
          key={warning}
          className="rounded bg-amber-50 p-3 text-sm text-amber-700"
        >
          {warning}
        </p>
      ))}
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>
          Điện: {value.electricity.previous} → {value.electricity.current} ·{" "}
          {money(value.electricity.amount)}
        </p>
        <p>
          Nước: {value.water.previous} → {value.water.current} ·{" "}
          {money(value.water.amount)}
        </p>
        <p>WiFi: {money(value.wifiFee)}</p>
        <p>Rác: {money(value.trashFee)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Sinh viên</th>
              <th>Ngày ở</th>
              <th>Phòng</th>
              <th>Điện</th>
              <th>Nước</th>
              <th>WiFi</th>
              <th>Rác</th>
              <th>Tổng</th>
            </tr>
          </thead>
          <tbody>
            {value.residents.map((x) => (
              <tr key={x.contractId} className="border-b">
                <td className="p-2">
                  {x.fullName}
                  <small className="block text-slate-500">{x.mssv}</small>
                </td>
                <td>
                  {x.residentDays}/{value.daysInMonth}
                </td>
                <td>{money(x.roomFee)}</td>
                <td>{money(x.electricityShare)}</td>
                <td>{money(x.waterShare)}</td>
                <td>{money(x.wifiShare)}</td>
                <td>{money(x.trashShare)}</td>
                <td className="font-semibold">{money(x.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-right font-bold">
        Tổng hóa đơn: {money(value.totalInvoiceAmount)}
      </p>
      <button className="btn-primary w-full" onClick={onFinalize}>
        Xác nhận FINALIZE
      </button>
    </div>
  );
}

function BillingResult({
  billing,
  onCancel,
}: {
  billing: MonthlyBilling;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="font-semibold">Trạng thái: {billing.status}</p>
      <p>
        Điện: {billing.electricity?.previous} → {billing.electricity?.current} ·{" "}
        {money(billing.electricity?.amount)}
      </p>
      <p>
        Nước: {billing.water?.previous} → {billing.water?.current} ·{" "}
        {money(billing.water?.amount)}
      </p>
      <p className="font-bold">
        Tổng invoice: {money(billing.totalInvoiceAmount)}
      </p>
      <div>
        {billing.invoices?.map((x) => (
          <p key={x.id} className="border-t py-2">
            {x.student.fullName} ({x.student.mssv}){" "}
            <strong className="float-right">{money(x.totalAmount)}</strong>
          </p>
        ))}
      </div>
      {billing.status === "FINALIZED" && (
        <button className="btn-danger w-full" onClick={onCancel}>
          Hủy kỳ hóa đơn
        </button>
      )}
    </div>
  );
}
