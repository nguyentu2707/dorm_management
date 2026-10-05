import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Banknote,
  BedDouble,
  FileClock,
  FileText,
  RefreshCw,
  Users,
  Wrench,
} from "lucide-react";
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
import { dashboardApi } from "../../features/dashboard/api/dashboard.api";
import { normalizeApiError } from "../../services/api-client";
import type {
  DashboardSummary,
  DashboardTrends,
  MaintenanceStatus,
} from "../../types/api";

type Section<T> = { loading: boolean; data?: T; error?: string };
const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const genderLabels = { MALE: "Khu Nam", FEMALE: "Khu Nữ", MIXED: "Khu hỗn hợp" };
const maintenanceLabels: Record<MaintenanceStatus, string> = {
  PENDING: "Chờ xử lý",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  CANCELLED: "Đã hủy",
};

function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="block rounded-2xl focus-visible:ring-4 focus-visible:ring-brand-100" to={to}>
      {children}
    </Link>
  );
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span className="truncate text-slate-600">{label}</span>
        <strong className="text-slate-900">{value.toLocaleString("vi-VN")}</strong>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-label={`${label}: ${value}`}>
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<Section<DashboardSummary>>({ loading: true });
  const [trends, setTrends] = useState<Section<DashboardTrends>>({ loading: true });

  const load = useCallback(async () => {
    setSummary({ loading: true });
    setTrends({ loading: true });
    const [summaryResult, trendResult] = await Promise.allSettled([
      dashboardApi.summary(),
      dashboardApi.trends(6),
    ]);
    setSummary(
      summaryResult.status === "fulfilled"
        ? { loading: false, data: summaryResult.value }
        : { loading: false, error: normalizeApiError(summaryResult.reason).message },
    );
    setTrends(
      trendResult.status === "fulfilled"
        ? { loading: false, data: trendResult.value }
        : { loading: false, error: normalizeApiError(trendResult.reason).message },
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Tổng quan quản trị"
        description="Sức chứa, vận hành và tài chính từ dữ liệu hiện tại"
        action={
          <button className="btn-secondary" disabled={summary.loading || trends.loading} onClick={() => void load()}>
            <RefreshCw size={16} className={summary.loading || trends.loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        }
      />

      {summary.loading ? (
        <LoadingState />
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={() => void load()} />
      ) : summary.data ? (
        <DashboardSummaryView data={summary.data} />
      ) : null}

      <div className="mt-6">
        {trends.loading ? (
          <LoadingState />
        ) : trends.error ? (
          <ErrorState message={trends.error} onRetry={() => void load()} />
        ) : trends.data ? (
          <DashboardTrendsView data={trends.data} />
        ) : null}
      </div>
    </>
  );
}

function DashboardSummaryView({ data }: { data: DashboardSummary }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tỷ lệ lấp đầy" value={`${data.facility.occupancyRate}%`} icon={BedDouble} />
        <StatCard label="Sinh viên đang ở" value={data.residence.activeContracts} icon={Users} />
        <CardLink to="/admin/contracts?status=PENDING">
          <StatCard label="Hợp đồng chờ duyệt" value={data.residence.pendingContracts} icon={FileText} />
        </CardLink>
        <StatCard label="Doanh thu xác nhận tháng" value={money.format(data.finance.confirmedRevenueThisMonth)} icon={Banknote} />
        <StatCard label="Giường trống khai thác" value={data.facility.emptyBeds} icon={BedDouble} />
        <CardLink to="/admin/billing">
          <StatCard label="Còn phải thu" value={money.format(data.finance.outstandingAmount)} icon={Banknote} />
        </CardLink>
        <CardLink to="/admin/maintenance">
          <StatCard label="Bảo trì đang mở" value={data.operations.pendingMaintenance + data.operations.inProgressMaintenance} icon={Wrench} />
        </CardLink>
        <CardLink to="/admin/contracts?status=ACTIVE&sortBy=endDate&sortOrder=asc">
          <StatCard label="Hợp đồng hết hạn trong 30 ngày" value={data.expiringContracts.within30Days} icon={FileClock} />
        </CardLink>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <InfoPanel title="Lấp đầy theo tòa nhà">
          {data.occupancyByBuilding.length ? (
            <div className="space-y-5">
              {data.occupancyByBuilding.map((building) => (
                <Link className="block rounded-xl border p-4 hover:border-brand-300" key={building.buildingId} to={`/admin/buildings/${building.buildingId}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong>{building.buildingName}</strong>
                      <span className="ml-2 text-xs text-slate-500">{genderLabels[building.allowedGender]}</span>
                    </div>
                    <span className="text-sm font-semibold">{building.occupiedBeds}/{building.totalUsableBeds} · {building.occupancyRate}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`${building.buildingName}: ${building.occupancyRate}%`}>
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${building.occupancyRate}%` }} />
                  </div>
                  {building.totalBeds !== building.totalUsableBeds && (
                    <p className="mt-2 text-xs text-amber-700">{building.totalBeds - building.totalUsableBeds} giường tạm ngoài sức chứa khai thác</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="Chưa có tòa nhà." />
          )}
        </InfoPanel>

        <InfoPanel title="Hàng đợi vận hành">
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["Chuyển phòng chờ duyệt", data.residence.pendingRoomChanges],
              ["Trả phòng chờ duyệt", data.residence.pendingCheckouts],
              ["Bảo trì chờ xử lý", data.operations.pendingMaintenance],
              ["Bảo trì đang xử lý", data.operations.inProgressMaintenance],
              ["Hết hạn trong 7 ngày", data.expiringContracts.within7Days],
              ["Nhân viên hoạt động", data.operations.activeStaff],
            ].map(([label, value]) => (
              <div className="rounded-xl bg-slate-50 p-4" key={label}>
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="mt-1 text-xl font-bold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 border-t pt-4 text-sm text-slate-600">
            Hóa đơn: <strong>{data.finance.unpaidInvoices}</strong> chưa trả · <strong>{data.finance.partiallyPaidInvoices}</strong> trả một phần · <strong>{data.finance.paidInvoices}</strong> đã trả
          </div>
        </InfoPanel>
      </div>
    </>
  );
}

function DashboardTrendsView({ data }: { data: DashboardTrends }) {
  const revenueMax = Math.max(0, ...data.revenue.map((item) => item.amount));
  const utilityMax = Math.max(0, ...data.utilities.flatMap((item) => [item.electricityUsage, item.waterUsage]));
  const maintenanceMax = Math.max(0, ...data.maintenanceByStatus.map((item) => item.count));
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <InfoPanel title="Doanh thu xác nhận · 6 tháng">
        {data.revenue.length ? (
          <div className="space-y-4">{data.revenue.map((item) => <Bar key={item.period} label={`${item.period} · ${money.format(item.amount)}`} value={item.amount} max={revenueMax} />)}</div>
        ) : <EmptyState message="Chưa có thanh toán được xác nhận trong kỳ." />}
      </InfoPanel>
      <InfoPanel title="Điện nước · 6 kỳ">
        {data.utilities.length ? (
          <div className="space-y-5">{data.utilities.map((item) => (
            <div key={item.period} className="space-y-2">
              <strong className="text-sm">{item.period}</strong>
              <Bar label="Điện (kWh)" value={item.electricityUsage} max={utilityMax} />
              <Bar label="Nước (m³)" value={item.waterUsage} max={utilityMax} />
            </div>
          ))}</div>
        ) : <EmptyState message="Chưa có chỉ số điện nước trong kỳ." />}
      </InfoPanel>
      <InfoPanel title="Trạng thái bảo trì">
        {data.maintenanceByStatus.length ? (
          <div className="space-y-4">{data.maintenanceByStatus.map((item) => <Bar key={item.status} label={maintenanceLabels[item.status]} value={item.count} max={maintenanceMax} />)}</div>
        ) : <EmptyState message="Chưa có yêu cầu bảo trì." />}
      </InfoPanel>
    </div>
  );
}
