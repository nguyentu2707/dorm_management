import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { studentMaintenanceApi } from "../../features/maintenance/api/maintenance.api";
import { normalizeApiError } from "../../services/api-client";
import type {
  Equipment,
  MaintenanceCategory,
  MaintenanceDamageCause,
  MaintenanceRequest,
  MaintenanceResolutionMethod,
} from "../../types/api";

const categoryLabels: Record<MaintenanceCategory, string> = {
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

export function StudentMaintenancePage() {
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    Promise.all([
      studentMaintenanceApi.mine(),
      studentMaintenanceApi.equipment(),
    ])
      .then(([requests, roomEquipment]) => {
        setItems(requests);
        setEquipment(roomEquipment.items);
        setBlocked(false);
        setMessage("");
      })
      .catch((error) => {
        const normalized = normalizeApiError(error);
        setBlocked(normalized.code === "NO_ACTIVE_CONTRACT");
        setMessage(normalized.message);
      });

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmitting(true);
    setMessage("");
    try {
      await studentMaintenanceApi.create({
        category: String(form.get("category")) as MaintenanceCategory,
        description: String(form.get("description")),
        equipmentItemId: String(form.get("equipmentItemId")) || undefined,
      });
      formElement.reset();
      await load();
      setMessage("Đã gửi yêu cầu báo hỏng thành công.");
    } catch (error) {
      setMessage(normalizeApiError(error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    try {
      await studentMaintenanceApi.cancel(id);
      await load();
    } catch (error) {
      setMessage(normalizeApiError(error).message);
    }
  }

  return (
    <>
      <PageHeader
        title="Báo hỏng thiết bị"
        description="Báo sự cố và theo dõi quá trình xử lý thiết bị trong phòng."
      />

      {message && (
        <div className="mb-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-700">
          {message}
        </div>
      )}

      {blocked ? (
        <div className="card text-amber-700">
          Bạn cần có hợp đồng đang hiệu lực để báo sự cố trong phòng.
        </div>
      ) : (
        <form className="card mb-6 grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <select className="field" name="category" required>
            <option value="">Chọn loại sự cố</option>
            {(Object.keys(categoryLabels) as MaintenanceCategory[]).map(
              (category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ),
            )}
          </select>
          <select className="field" name="equipmentItemId">
            <option value="">Sự cố chung của phòng</option>
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.serialNumber ?? item.id}
              </option>
            ))}
          </select>
          <textarea
            className="field md:col-span-2"
            name="description"
            required
            maxLength={2000}
            placeholder="Mô tả chi tiết sự cố"
          />
          <button className="btn-primary" disabled={submitting}>
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {items.map((request) => (
          <article className="card" key={request.id}>
            <div className="flex justify-between gap-3">
              <strong>{categoryLabels[request.category]}</strong>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-2 text-sm">{request.description}</p>

            {request.status === "RESOLVED" && request.resolutionMethod && (
              <div className="mt-3 space-y-1 rounded-lg bg-green-50 p-3 text-sm">
                <p>
                  <span className="font-medium">Phương pháp:</span>{" "}
                  {methodLabels[request.resolutionMethod]}
                </p>
                <p>
                  <span className="font-medium">Nguyên nhân:</span>{" "}
                  {request.damageCause && causeLabels[request.damageCause]}
                  {request.damageCauseDetail
                    ? ` – ${request.damageCauseDetail}`
                    : ""}
                </p>
                <p>
                  <span className="font-medium">Lý do xử lý:</span>{" "}
                  {request.resolutionReason}
                </p>
                <p>
                  <span className="font-medium">Chi phí:</span>{" "}
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

            {request.status === "PENDING" && (
              <button
                className="btn-secondary mt-3"
                onClick={() => void cancel(request.id)}
              >
                Hủy yêu cầu
              </button>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
