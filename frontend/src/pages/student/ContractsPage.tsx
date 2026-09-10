import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { ConfirmDialog } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { contractApi } from "../../features/contracts/api/contract.api";
import { ContractRegistrationModal } from "../../features/contracts/components/ContractRegistrationModal";
import { normalizeApiError } from "../../services/api-client";
import { formatDate } from "../../utils/date";
import type { Contract } from "../../types/api";

export function StudentContractsPage() {
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [cancel, setCancel] = useState<Contract | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await contractApi.mine());
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Hợp đồng của tôi"
        description="Theo dõi đăng ký ở và lịch sử hợp đồng"
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            Đăng ký ở
          </button>
        }
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState message="Bạn chưa có hợp đồng" />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((contract) => (
            <article className="card" key={contract.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="mb-2">
                    <StatusBadge status={contract.status} />
                  </div>
                  <p className="font-semibold">
                    {contract.room
                      ? `${contract.room.buildingName} - ${contract.room.roomNumber} · Giường ${contract.bed?.bedNumber ?? "—"}`
                      : "Thông tin phòng không còn khả dụng"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(contract.startDate)} –{" "}
                    {formatDate(contract.endDate)}
                  </p>
                </div>
                {contract.status === "PENDING" && (
                  <button
                    className="btn-secondary text-red-600"
                    onClick={() => setCancel(contract)}
                  >
                    Hủy đăng ký
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <ContractRegistrationModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={load}
      />
      <ConfirmDialog
        open={Boolean(cancel)}
        title="Hủy đăng ký"
        message="Bạn có chắc muốn hủy hợp đồng đang chờ duyệt?"
        onClose={() => setCancel(null)}
        onConfirm={async () => {
          if (cancel) await contractApi.cancel(cancel.id);
          setCancel(null);
          await load();
        }}
      />
    </>
  );
}
