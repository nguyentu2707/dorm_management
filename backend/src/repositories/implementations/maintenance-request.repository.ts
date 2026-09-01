import type { FilterQuery } from "mongoose";
import {
  MaintenanceRequestModel,
  type MaintenanceRequest,
} from "../../models/maintenance-request.model.js";
import type { IMaintenanceRequestRepository } from "../interfaces/maintenance-request.repository.interface.js";
export class MaintenanceRequestRepository implements IMaintenanceRequestRepository {
  create(data: Parameters<IMaintenanceRequestRepository["create"]>[0]) {
    return MaintenanceRequestModel.create(data);
  }
  findById(id: string) {
    return MaintenanceRequestModel.findById(id).exec();
  }
  findByStudentId(id: string) {
    return MaintenanceRequestModel.find({ studentId: id })
      .sort({ createdAt: -1 })
      .exec();
  }
  async findAll(q: Parameters<IMaintenanceRequestRepository["findAll"]>[0]) {
    const f: FilterQuery<MaintenanceRequest> = {};
    if (q.status) f.status = q.status;
    if (q.roomId) f.roomId = q.roomId;
    if (q.category) f.category = q.category;
    if (q.assignedStaffId) f.assignedStaffId = q.assignedStaffId;
    if (q.buildingId) {
      const rooms = await import("../../models/room.model.js").then((m) =>
        m.RoomModel.find({ buildingId: q.buildingId }).distinct("_id"),
      );
      f.roomId = { $in: rooms };
    }
    const [items, total] = await Promise.all([
      MaintenanceRequestModel.find(f)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      MaintenanceRequestModel.countDocuments(f),
    ]);
    return {
      items,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }
  update(id: string, data: Record<string, unknown>) {
    return MaintenanceRequestModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).exec();
  }
  async countOperational() {
    const [pending, inProgress] = await Promise.all([
      MaintenanceRequestModel.countDocuments({ status: "PENDING" }),
      MaintenanceRequestModel.countDocuments({ status: "IN_PROGRESS" }),
    ]);
    return { pending, inProgress };
  }
}
