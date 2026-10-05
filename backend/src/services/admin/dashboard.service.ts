import { AppError } from "../../errors/AppError.js";
import type { IDashboardRepository } from "../../repositories/interfaces/dashboard.repository.interface.js";

const rate = (occupied: number, total: number) =>
  total === 0 ? 0 : Math.min(100, Math.round((occupied / total) * 1000) / 10);

export class AdminDashboardService {
  constructor(private repository: IDashboardRepository) {}

  async summary() {
    const result = await this.repository.summary();
    if (result.finance.overpaidInvoices > 0)
      throw new AppError(
        500,
        "DASHBOARD_NEGATIVE_OUTSTANDING",
        "Dữ liệu thanh toán vượt quá tổng hóa đơn",
      );
    if (
      result.facility.occupiedBeds > result.facility.totalUsableBeds ||
      result.facility.occupiedBeds !== result.facility.activeResidentBeds
    )
      throw new AppError(
        500,
        "DASHBOARD_OCCUPANCY_INCONSISTENT",
        "Dữ liệu sức chứa không nhất quán",
      );
    const { activeResidentBeds: _activeResidentBeds, ...facility } = result.facility;
    const { overpaidInvoices: _overpaidInvoices, ...finance } = result.finance;
    return {
      ...result,
      facility: {
        ...facility,
        occupancyRate: rate(result.facility.occupiedBeds, result.facility.totalUsableBeds),
      },
      finance,
      occupancyByBuilding: result.occupancyByBuilding.map((building) => ({
        ...building,
        occupancyRate: rate(building.occupiedBeds, building.totalUsableBeds),
      })),
    };
  }

  trends(months: number) {
    return this.repository.trends(months);
  }
}
