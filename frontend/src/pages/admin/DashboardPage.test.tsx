import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSummary, DashboardTrends } from "../../types/api";
import { AdminDashboardPage } from "./DashboardPage";

const mocks = vi.hoisted(() => ({ summary: vi.fn(), trends: vi.fn() }));
vi.mock("../../features/dashboard/api/dashboard.api", () => ({
  dashboardApi: mocks,
}));

const emptySummary: DashboardSummary = {
  facility: { totalBuildings: 0, activeBuildings: 0, totalRooms: 0, totalBeds: 0, totalUsableBeds: 0, occupiedBeds: 0, emptyBeds: 0, occupancyRate: 0 },
  residence: { activeContracts: 0, pendingContracts: 0, pendingRoomChanges: 0, pendingCheckouts: 0 },
  operations: { pendingMaintenance: 0, inProgressMaintenance: 0, activeStaff: 0 },
  finance: { unpaidInvoices: 0, partiallyPaidInvoices: 0, paidInvoices: 0, billedAmount: 0, outstandingAmount: 0, confirmedRevenueAllTime: 0, confirmedRevenueThisMonth: 0 },
  expiringContracts: { within7Days: 0, within30Days: 0 },
  occupancyByBuilding: [],
};
const emptyTrends: DashboardTrends = { revenue: [], utilities: [], maintenanceByStatus: [] };
const renderPage = () => render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

describe("admin dashboard states", () => {
  beforeEach(() => {
    mocks.summary.mockReset();
    mocks.trends.mockReset();
  });

  it("shows loading while requests are pending", () => {
    mocks.summary.mockReturnValue(new Promise(() => undefined));
    mocks.trends.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getAllByText("Đang tải...").length).toBeGreaterThan(0);
  });

  it("renders real empty states without NaN", async () => {
    mocks.summary.mockResolvedValue(emptySummary);
    mocks.trends.mockResolvedValue(emptyTrends);
    renderPage();
    expect(await screen.findByText("0%")).toBeInTheDocument();
    expect(screen.getByText("Chưa có tòa nhà.")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("renders API errors instead of fabricated zero values", async () => {
    mocks.summary.mockRejectedValue({ message: "Không tải được dashboard" });
    mocks.trends.mockRejectedValue({ message: "Không tải được xu hướng" });
    renderPage();
    expect(await screen.findByText("Không tải được dashboard")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});
