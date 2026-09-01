import { useEffect, useState } from "react";
import { BedDouble, Building2, FileText, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import {
  InfoPanel,
  StatCard,
} from "../../components/common/StudentDashboardComponents";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { dashboardApi } from "../../features/dashboard/api/dashboard.api";
import { contractApi } from "../../features/contracts/api/contract.api";
import { roomChangeApi } from "../../features/room-change-requests/api/room-change.api";
import { normalizeApiError } from "../../services/api-client";
import type {
  Contract,
  DashboardSummary,
  RoomChangeRequest,
} from "../../types/api";

type Section<T> = { loading: boolean; data?: T; error?: string };

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<Section<DashboardSummary>>({
    loading: true,
  });
  const [contracts, setContracts] = useState<Section<Contract[]>>({
    loading: true,
  });
  const [requests, setRequests] = useState<Section<RoomChangeRequest[]>>({
    loading: true,
  });

  async function load() {
    setSummary({ loading: true });
    setContracts({ loading: true });
    setRequests({ loading: true });

    const results = await Promise.allSettled([
      dashboardApi.summary(),
      contractApi.adminList({
        status: "PENDING",
        page: 1,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      roomChangeApi.adminList({ status: "PENDING", page: 1, limit: 5 }),
    ]);

    const [summaryResult, contractResult, requestResult] = results;

    setSummary(
      summaryResult.status === "fulfilled"
        ? { loading: false, data: summaryResult.value }
        : {
            loading: false,
            error: normalizeApiError(summaryResult.reason).message,
          },
    );

    setContracts(
      contractResult.status === "fulfilled"
        ? { loading: false, data: contractResult.value.items }
        : {
            loading: false,
            error: normalizeApiError(contractResult.reason).message,
          },
    );

    setRequests(
      requestResult.status === "fulfilled"
        ? { loading: false, data: requestResult.value.items }
        : {
            loading: false,
            error: normalizeApiError(requestResult.reason).message,
          },
    );
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader
        title="Tổng quan quản trị"
        description="Theo dõi sức chứa và các yêu cầu cần xử lý"
      />
      {summary.loading ? (
        <LoadingState />
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={load} />
      ) : (
        summary.data && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tổng số phòng / còn trống"
              value={`${summary.data.rooms.total} / ${summary.data.rooms.available}`}
              icon={Building2}
            />
            <StatCard
              label="Tổng số giường / đang ở"
              value={`${summary.data.beds.total} / ${summary.data.beds.occupied}`}
              icon={BedDouble}
            />
            <StatCard
              label="Hợp đồng chờ duyệt"
              value={summary.data.contracts.pending}
              icon={FileText}
            />
            <StatCard
              label="Chuyển phòng chờ duyệt"
              value={summary.data.roomChangeRequests.pending}
              icon={RefreshCw}
            />
          </div>
        )
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <InfoPanel
          title="Hợp đồng chờ duyệt"
          action={
            <Link
              className="text-sm text-brand-600"
              to="/admin/contracts?status=PENDING"
            >
              Xem tất cả
            </Link>
          }
        >
          {contracts.loading ? (
            <LoadingState />
          ) : contracts.error ? (
            <ErrorState message={contracts.error} onRetry={load} />
          ) : contracts.data?.length ? (
            <div className="space-y-3">
              {contracts.data.map((item) => (
                <Link
                  className="flex items-center justify-between rounded-lg border p-3 hover:border-brand-400"
                  key={item.id}
                  to={`/admin/contracts/${item.id}`}
                >
                  <span className="text-sm">
                    {item.student?.fullName ?? "Sinh viên"} · {item.student?.mssv ?? "—"}
                  </span>
                  <StatusBadge status={item.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="Không có yêu cầu cần xử lý." />
          )}
        </InfoPanel>

        <InfoPanel
          title="Yêu cầu chuyển phòng chờ duyệt"
          action={
            <Link
              className="text-sm text-brand-600"
              to="/admin/room-change-requests?status=PENDING"
            >
              Xem tất cả
            </Link>
          }
        >
          {requests.loading ? (
            <LoadingState />
          ) : requests.error ? (
            <ErrorState message={requests.error} onRetry={load} />
          ) : requests.data?.length ? (
            <div className="space-y-3">
              {requests.data.map((item) => (
                <Link
                  className="flex items-center justify-between rounded-lg border p-3 hover:border-brand-400"
                  key={item.id}
                  to="/admin/room-change-requests"
                >
                  <span className="text-sm">
                    {item.student?.fullName ?? "Sinh viên"} · {item.student?.mssv ?? "—"}
                  </span>
                  <StatusBadge status={item.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="Không có yêu cầu cần xử lý." />
          )}
        </InfoPanel>
      </div>
    </>
  );
}
