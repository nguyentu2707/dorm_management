import type { IDashboardRepository } from "../../repositories/interfaces/dashboard.repository.interface.js";
export class AdminDashboardService {
  constructor(private repository: IDashboardRepository) {}
  async summary() {
    const {
      rooms,
      beds,
      contracts,
      roomChanges,
      checkoutRequests,
      maintenance,
    } = await this.repository.counts();
    const count = (
      rows: Array<{ status: string; count: number }>,
      status: string,
    ) => rows.find((row) => row.status === status)?.count ?? 0;

    return {
      rooms: {
        total: rooms.reduce((sum, row) => sum + row.count, 0),
        available: count(rooms, "AVAILABLE"),
        full: count(rooms, "FULL"),
        maintenance: count(rooms, "MAINTENANCE"),
        locked: count(rooms, "LOCKED"),
      },
      beds: {
        total: beds.reduce((sum, row) => sum + row.count, 0),
        occupied: count(beds, "OCCUPIED"),
        empty: count(beds, "EMPTY"),
      },
      contracts: {
        pending: count(contracts, "PENDING"),
        active: count(contracts, "ACTIVE"),
      },
      roomChangeRequests: { pending: roomChanges },
      checkoutRequests: { pending: checkoutRequests },
      maintenanceRequests: {
        pending: count(maintenance, "PENDING"),
        inProgress: count(maintenance, "IN_PROGRESS"),
      },
      studentRequests: {
        pendingTotal:
          count(contracts, "PENDING") +
          roomChanges +
          checkoutRequests +
          count(maintenance, "PENDING"),
      },
    };
  }
}
