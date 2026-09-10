import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { adminMaintenanceApi } from "../../features/maintenance/api/maintenance.api";
import { normalizeApiError } from "../../services/api-client";
import type {
  MaintenanceDamageCause,
  MaintenanceRequest,
  MaintenanceResolutionMethod,
  Paginated,
} from "../../types/api";

type MaintenanceStaff = { id: string; fullName: string; username: string };

const categoryLabels: Record<MaintenanceRequest["category"], string> = {
  ELECTRICAL: "Điện",
  PLUMBING: "Nước",
  FURNITURE: "Nội thất",
  APPLIANCE: "Thiết bị",
  OTHER: "Khác",
};

const methodLabels: Record<MaintenanceResolutionMethod, string> = {
  REPAIR: "Sửa chữa",
  REPLACE: "Thay mới",
};

const causeLabels: Record<MaintenanceDamageCause, string> = {
  WEAR_AND_TEAR: "Hao mòn theo thời gian",
  STUDENT_CAUSED: "Do sinh viên làm hỏng",
  OTHER: "Nguyên nhân khác",
};

const money = (value?: number) =>
  value === undefined
    ? "—"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(value);

export function AdminMaintenancePage() {
  const [data, setData] = useState<Paginated<MaintenanceRequest> | null>(null);
  const [page, setPage] = useState(1);
  const [staff, setStaff] = useState<MaintenanceStaff[]>([]);
  const [assigning, setAssigning] = useState<MaintenanceRequest | null>(null);
  const [resolving, setResolving] = useState<MaintenanceRequest | null>(null);
  const [staffId, setStaffId] = useState("");
  const [damageCause, setDamageCause] =
    useState<MaintenanceDamageCause>("WEAR_AND_TEAR");
  const [message, setMessage] = useState("");

  const load = () =>
    adminMaintenanceApi
      .list({ page, limit: 20 })
      .then(setData)
      .catch((error) => setMessage(normalizeApiError(error).message));

  useEffect(() => {
    void load();
  }, [page]);

  useEffect(() => {
    void adminMaintenanceApi
      .staff()
      .then(setStaff)
      .catch((error) => setMessage(normalizeApiError(error).message));
  }, []);

  async function cancel(request: MaintenanceRequest) {
    const reason = window.prompt("Lý do hủy yêu cầu");
    if (reason === null) return;
    try {
      await adminMaintenanceApi.cancel(request.id, reason || undefined);
      await load();
    } catch (error) {
      setMessage(normalizeApiError(error).message);
    }
  }

  return (
    <>
      <PageHeader
        title="Xử lý báo hỏng"
        description="Theo dõi toàn bộ quá trình từ tiếp nhận, phân công đến sửa chữa hoặc thay mới."
      />

      {message && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {data?.items.map((request) => (
          <article className="card" key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <strong>{categoryLabels[request.category]}</strong>
                <p className="mt-1 text-sm text-slate-700">
                  {request.description}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Mã đơn: {request.id}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <ProcessStep
                active
                done={request.status !== "PENDING"}
                label="1. Tiếp nhận"
              />
              <ProcessStep
                active={["IN_PROGRESS", "RESOLVED"].includes(request.status)}
                done={request.status === "RESOLVED"}
                label="2. Đang xử lý"
              />
              <ProcessStep
                active={request.status === "RESOLVED"}
                done={request.status === "RESOLVED"}
                label="3. Hoàn tất"
              />
            </div>

            {request.status === "RESOLVED" && request.resolutionMethod && (
              <div className="mt-4 grid gap-2 rounded-lg bg-emerald-50 p-4 text-sm md:grid-cols-2">
                <p>
                  <span className="font-medium">Phương pháp:</span>{" "}
                  {methodLabels[request.resolutionMethod]}
                </p>
                <p>
                  <span className="font-medium">Nguyên nhân:</span>{" "}
                  {request.damageCause && causeLabels[request.damageCause]}
                </p>
                {request.damageCauseDetail && (
                  <p className="md:col-span-2">
                    <span className="font-medium">Chi tiết nguyên nhân:</span>{" "}
                    {request.damageCauseDetail}
                  </p>
                )}
                <p className="md:col-span-2">
                  <span className="font-medium">Lý do xử lý:</span>{" "}
                  {request.resolutionReason}
                </p>
                <p>
                  <span className="font-medium">Số tiền:</span>{" "}
                  {money(request.resolutionCost)}
                </p>
                {request.resolutionNote && (
                  <p>
                    <span className="font-medium">Ghi chú:</span>{" "}
                    {request.resolutionNote}
                  </p>
                )}
              </div>
            )}

            {["PENDING", "IN_PROGRESS"].includes(request.status) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setStaffId(request.assignedStaffId ?? "");
                    setAssigning(request);
                  }}
                >
                  {request.status === "IN_PROGRESS"
                    ? "Phân công lại"
                    : "Phân công xử lý"}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setDamageCause("WEAR_AND_TEAR");
                    setResolving(request);
                  }}
                >
                  Hoàn tất xử lý
                </button>
                <button
                  className="btn-danger"
                  onClick={() => void cancel(request)}
                >
                  Hủy đơn
                </button>
              </div>
            )}
          </article>
        ))}

        {data?.items.length === 0 && (
          <div className="card text-center text-slate-500">
            Chưa có yêu cầu báo hỏng.
          </div>
        )}
        {data && <Pagination meta={data.pagination} onChange={setPage} />}
      </div>

      {assigning && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            className="card w-full max-w-md"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await adminMaintenanceApi.assign(assigning.id, staffId);
                setAssigning(null);
                await load();
              } catch (error) {
                setMessage(normalizeApiError(error).message);
              }
            }}
          >
            <h2 className="mb-4 text-lg font-semibold">Phân công xử lý</h2>
            <select
              className="field"
              required
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
            >
              <option value="">Chọn nhân viên bảo trì</option>
              {staff.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName} ({item.username})
                </option>
              ))}
            </select>
            {!staff.length && (
              <p className="mt-2 text-sm text-amber-700">
                Chưa có nhân viên bảo trì đang hoạt động.
              </p>
            )}
            <ModalActions
              close={() => setAssigning(null)}
              submitLabel="Xác nhận"
              disabled={!staffId}
            />
          </form>
        </div>
      )}

      {resolving && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4">
          <form
            className="card my-6 w-full max-w-xl space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              try {
                await adminMaintenanceApi.resolve(resolving.id, {
                  resolutionMethod: String(
                    form.get("resolutionMethod"),
                  ) as MaintenanceResolutionMethod,
                  damageCause,
                  damageCauseDetail:
                    String(form.get("damageCauseDetail") ?? "").trim() ||
                    undefined,
                  resolutionReason: String(form.get("resolutionReason")),
                  resolutionCost: Number(form.get("resolutionCost")),
                  resolutionNote:
                    String(form.get("resolutionNote") ?? "").trim() ||
                    undefined,
                });
                setResolving(null);
                await load();
              } catch (error) {
                setMessage(normalizeApiError(error).message);
              }
            }}
          >
            <div>
              <h2 className="text-lg font-semibold">Hoàn tất xử lý báo hỏng</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ghi nhận kết quả để lưu vào hồ sơ của đơn.
              </p>
            </div>

            <label className="block text-sm font-medium">
              Phương pháp xử lý
              <select className="field mt-1" name="resolutionMethod" required>
                <option value="REPAIR">Sửa chữa</option>
                <option value="REPLACE">Thay mới</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Nguyên nhân hỏng
              <select
                className="field mt-1"
                name="damageCause"
                required
                value={damageCause}
                onChange={(event) =>
                  setDamageCause(event.target.value as MaintenanceDamageCause)
                }
              >
                <option value="WEAR_AND_TEAR">Hao mòn theo thời gian</option>
                <option value="STUDENT_CAUSED">Do sinh viên làm hỏng</option>
                <option value="OTHER">Nguyên nhân khác</option>
              </select>
            </label>

            {damageCause === "OTHER" && (
              <label className="block text-sm font-medium">
                Chi tiết nguyên nhân khác
                <textarea
                  className="field mt-1"
                  name="damageCauseDetail"
                  maxLength={1000}
                  required
                />
              </label>
            )}

            <label className="block text-sm font-medium">
              Lý do chọn phương pháp xử lý
              <textarea
                className="field mt-1"
                name="resolutionReason"
                maxLength={2000}
                required
              />
            </label>

            <label className="block text-sm font-medium">
              Số tiền (VNĐ)
              <input
                className="field mt-1"
                name="resolutionCost"
                type="number"
                min="0"
                max="1000000000"
                step="1000"
                defaultValue="0"
                required
              />
            </label>

            <label className="block text-sm font-medium">
              Ghi chú thêm
              <textarea
                className="field mt-1"
                name="resolutionNote"
                maxLength={2000}
              />
            </label>

            <ModalActions
              close={() => setResolving(null)}
              submitLabel="Lưu và hoàn tất"
            />
          </form>
        </div>
      )}
    </>
  );
}

function ProcessStep({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        active
          ? done
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-400"
      }`}
    >
      {label}
    </div>
  );
}

function ModalActions({
  close,
  submitLabel,
  disabled = false,
}: {
  close: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button className="btn-secondary" type="button" onClick={close}>
        Đóng
      </button>
      <button className="btn-primary" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );
}
