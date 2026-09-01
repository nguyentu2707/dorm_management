import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { studentMaintenanceApi } from "../../features/maintenance/api/maintenance.api";
import type {
  Equipment,
  MaintenanceCategory,
  MaintenanceRequest,
} from "../../types/api";
import { normalizeApiError } from "../../services/api-client";
import { StatusBadge } from "../../components/ui/StatusBadge";
export function StudentMaintenancePage() {
  const [items, setItems] = useState<MaintenanceRequest[]>([]),
    [equipment, setEquipment] = useState<Equipment[]>([]),
    [blocked, setBlocked] = useState(false),
    [message, setMessage] = useState("");
  const load = () =>
    Promise.all([
      studentMaintenanceApi.mine(),
      studentMaintenanceApi.equipment(),
    ])
      .then(([a, b]) => {
        setItems(a);
        setEquipment(b.items);
        setBlocked(false);
      })
      .catch((e) => {
        const x = normalizeApiError(e);
        setBlocked(x.code === "NO_ACTIVE_CONTRACT");
        setMessage(x.message);
      });
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await studentMaintenanceApi.create({
        category: String(f.get("category")) as MaintenanceCategory,
        description: String(f.get("description")),
        equipmentItemId: String(f.get("equipmentItemId")) || undefined,
      });
      e.currentTarget.reset();
      await load();
    } catch (x) {
      setMessage(normalizeApiError(x).message);
    }
  }
  return (
    <>
      <PageHeader
        title="Báo hỏng thiết bị"
        description="Báo sự cố trong phòng đang ở."
      />
      {blocked ? (
        <div className="card text-amber-700">
          Bạn cần có hợp đồng đang hiệu lực để báo sự cố trong phòng.
        </div>
      ) : (
        <form className="card mb-6 grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <select className="field" name="category" required>
            <option value="">Chọn loại sự cố</option>
            {["ELECTRICAL", "PLUMBING", "FURNITURE", "APPLIANCE", "OTHER"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
          <select className="field" name="equipmentItemId">
            <option value="">Sự cố chung của phòng</option>
            {equipment.map((x) => (
              <option key={x.id} value={x.id}>
                {x.serialNumber ?? x.id}
              </option>
            ))}
          </select>
          <textarea
            className="field md:col-span-2"
            name="description"
            required
            placeholder="Mô tả sự cố"
          />
          <button className="btn-primary">Gửi yêu cầu</button>
          {message && <p>{message}</p>}
        </form>
      )}
      <div className="space-y-3">
        {items.map((x) => (
          <div className="card" key={x.id}>
            <div className="flex justify-between">
              <strong>{x.category}</strong>
              <StatusBadge status={x.status} />
            </div>
            <p className="mt-2 text-sm">{x.description}</p>
            {x.resolutionNote && (
              <p className="mt-2 rounded bg-green-50 p-2">{x.resolutionNote}</p>
            )}
            {x.status === "PENDING" && (
              <button
                className="btn-secondary mt-3"
                onClick={() => studentMaintenanceApi.cancel(x.id).then(load)}
              >
                Hủy
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
