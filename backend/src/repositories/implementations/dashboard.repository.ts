import type { IDashboardRepository } from "../interfaces/dashboard.repository.interface.js";
import { rows, count } from "../../database/query.js";
export class PostgresDashboardRepository implements IDashboardRepository {
  async counts() {
    const [rooms, beds, contracts, roomChanges, checkoutRequests, maintenance] =
      await Promise.all([
        rows<{ status: string; count: number }>(
          `SELECT status,count(*) FROM rooms GROUP BY status`,
        ),
        rows<{ status: string; count: number }>(
          `SELECT status,count(*) FROM beds GROUP BY status`,
        ),
        rows<{ status: string; count: number }>(
          `SELECT status,count(*) FROM contracts WHERE status IN ('PENDING','ACTIVE') GROUP BY status`,
        ),
        count(
          `SELECT count(*) FROM room_change_requests WHERE status='PENDING'`,
        ),
        count(`SELECT count(*) FROM checkout_requests WHERE status='PENDING'`),
        rows<{ status: string; count: number }>(
          `SELECT status,count(*) FROM maintenance_requests WHERE status IN ('PENDING','IN_PROGRESS') GROUP BY status`,
        ),
      ]);
    return {
      rooms,
      beds,
      contracts,
      roomChanges,
      checkoutRequests,
      maintenance,
    };
  }
}
