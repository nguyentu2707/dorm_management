import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { adminMaintenanceApi } from "../../features/maintenance/api/maintenance.api";
import type { MaintenanceRequest, Paginated } from "../../types/api";

type MaintenanceStaff = { id: string; fullName: string; username: string };

export function AdminMaintenancePage() {
  const [data, setData] = useState<Paginated<MaintenanceRequest> | null>(null);
  const [page, setPage] = useState(1);
  const [staff, setStaff] = useState<MaintenanceStaff[]>([]);
  const [assigning, setAssigning] = useState<MaintenanceRequest | null>(null);
  const [staffId, setStaffId] = useState("");
  const load = () => adminMaintenanceApi.list({ page, limit: 20 }).then(setData);

  useEffect(() => { void load(); }, [page]);
  useEffect(() => { void adminMaintenanceApi.staff().then(setStaff); }, []);

  async function action(request: MaintenanceRequest, type: string) {
    if (type === "assign") {
      setStaffId(request.assignedStaffId ?? "");
      setAssigning(request);
      return;
    }
    if (type === "resolve") {
      const note = prompt("Ghi chú xử lý");
      if (note) await adminMaintenanceApi.resolve(request.id, note);
    } else {
      await adminMaintenanceApi.cancel(request.id, prompt("Lý do hủy") ?? undefined);
    }
    await load();
  }

  return (
    <>
      <PageHeader title="Bảo trì" description="Theo dõi và xử lý báo hỏng." />
      <div className="space-y-3">
        {data?.items.map((request) => (
          <div className="card" key={request.id}>
            <div className="flex justify-between">
              <div><strong>{request.category}</strong><p>{request.description}</p></div>
              <StatusBadge status={request.status} />
            </div>
            {["PENDING", "IN_PROGRESS"].includes(request.status) && (
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary" onClick={() => action(request, "assign")}>{request.status === "IN_PROGRESS" ? "Phân công lại" : "Phân công"}</button>
                <button className="btn-primary" onClick={() => action(request, "resolve")}>Hoàn tất</button>
                <button className="btn-danger" onClick={() => action(request, "cancel")}>Hủy</button>
              </div>
            )}
          </div>
        ))}
        {data && <Pagination meta={data.pagination} onChange={setPage} />}
      </div>
      {assigning && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form className="card w-full max-w-md" onSubmit={async (event) => {
            event.preventDefault();
            await adminMaintenanceApi.assign(assigning.id, staffId);
            setAssigning(null);
            await load();
          }}>
            <h2 className="mb-4 text-lg font-semibold">Phân công bảo trì</h2>
            <select className="field" required value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">Chọn nhân viên bảo trì</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.fullName} ({item.username})</option>)}
            </select>
            {!staff.length && <p className="mt-2 text-sm text-amber-700">Chưa có nhân viên bảo trì đang hoạt động.</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={() => setAssigning(null)}>Đóng</button>
              <button className="btn-primary" disabled={!staffId}>Xác nhận</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
