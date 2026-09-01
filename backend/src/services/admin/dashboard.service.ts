import { RoomModel } from "../../models/room.model.js";
import { BedModel } from "../../models/bed.model.js";
import { ContractModel } from "../../models/contract.model.js";
import { RoomChangeRequestModel } from "../../models/room-change-request.model.js";
import { MaintenanceRequestModel } from "../../models/maintenance-request.model.js";

export class AdminDashboardService {
  async summary() {
    const [rooms, beds, contracts, roomChanges, maintenance] =
      await Promise.all([
        RoomModel.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        BedModel.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        ContractModel.aggregate([
          { $match: { status: { $in: ["PENDING", "ACTIVE"] } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        RoomChangeRequestModel.countDocuments({ status: "PENDING" }),
        MaintenanceRequestModel.aggregate([
          { $match: { status: { $in: ["PENDING", "IN_PROGRESS"] } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

    const count = (
      rows: Array<{ _id: string; count: number }>,
      status: string,
    ) => rows.find((row) => row._id === status)?.count ?? 0;

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
      maintenanceRequests: {
        pending: count(maintenance, "PENDING"),
        inProgress: count(maintenance, "IN_PROGRESS"),
      },
    };
  }
}
