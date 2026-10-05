import test from "node:test";
import assert from "node:assert/strict";
import { AdminDashboardService } from "../dist/services/admin/dashboard.service.js";

const empty = {
  facility: { totalBuildings: 0, activeBuildings: 0, totalRooms: 0, totalBeds: 0, totalUsableBeds: 0, occupiedBeds: 0, emptyBeds: 0, activeResidentBeds: 0 },
  residence: { activeContracts: 0, pendingContracts: 0, pendingRoomChanges: 0, pendingCheckouts: 0 },
  operations: { pendingMaintenance: 0, inProgressMaintenance: 0, activeStaff: 0 },
  finance: { unpaidInvoices: 0, partiallyPaidInvoices: 0, paidInvoices: 0, billedAmount: 0, outstandingAmount: 0, confirmedRevenueAllTime: 0, confirmedRevenueThisMonth: 0, overpaidInvoices: 0 },
  expiringContracts: { within7Days: 0, within30Days: 0 },
  occupancyByBuilding: [],
};

test("dashboard empty projection has a finite zero occupancy rate", async () => {
  const service = new AdminDashboardService({
    summary: async () => empty,
    trends: async () => ({ revenue: [], utilities: [], maintenanceByStatus: [] }),
  });
  assert.equal((await service.summary()).facility.occupancyRate, 0);
});

test("dashboard exposes negative outstanding as an integrity error", async () => {
  const service = new AdminDashboardService({
    summary: async () => ({ ...empty, finance: { ...empty.finance, outstandingAmount: -1, overpaidInvoices: 1 } }),
    trends: async () => ({ revenue: [], utilities: [], maintenanceByStatus: [] }),
  });
  await assert.rejects(
    () => service.summary(),
    (error) => error.code === "DASHBOARD_NEGATIVE_OUTSTANDING",
  );
});
