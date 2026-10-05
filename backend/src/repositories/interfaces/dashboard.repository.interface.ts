export type DashboardSummaryProjection = {
  facility: {
    totalBuildings: number;
    activeBuildings: number;
    totalRooms: number;
    totalBeds: number;
    totalUsableBeds: number;
    occupiedBeds: number;
    emptyBeds: number;
    activeResidentBeds: number;
  };
  residence: {
    activeContracts: number;
    pendingContracts: number;
    pendingRoomChanges: number;
    pendingCheckouts: number;
  };
  operations: {
    pendingMaintenance: number;
    inProgressMaintenance: number;
    activeStaff: number;
  };
  finance: {
    unpaidInvoices: number;
    partiallyPaidInvoices: number;
    paidInvoices: number;
    billedAmount: number;
    outstandingAmount: number;
    confirmedRevenueAllTime: number;
    confirmedRevenueThisMonth: number;
    overpaidInvoices: number;
  };
  expiringContracts: {
    within7Days: number;
    within30Days: number;
  };
  occupancyByBuilding: Array<{
    buildingId: string;
    buildingName: string;
    allowedGender: "MALE" | "FEMALE" | "MIXED";
    totalBeds: number;
    totalUsableBeds: number;
    occupiedBeds: number;
    emptyBeds: number;
  }>;
};

export type DashboardTrendsProjection = {
  revenue: Array<{ period: string; amount: number }>;
  utilities: Array<{
    period: string;
    electricityUsage: number;
    waterUsage: number;
  }>;
  maintenanceByStatus: Array<{ status: string; count: number }>;
};

export interface IDashboardRepository {
  summary(): Promise<DashboardSummaryProjection>;
  trends(months: number): Promise<DashboardTrendsProjection>;
}
