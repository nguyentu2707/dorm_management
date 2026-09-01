import { StaffModel } from "../../models/staff.model.js";
import type { IStaffRepository } from "../interfaces/staff.repository.interface.js";
export class StaffRepository implements IStaffRepository {
  findById(id: string) {
    return StaffModel.findById(id).exec();
  }
  async findMaintenanceStaff() {
    const rows = await StaffModel.aggregate([
      { $match: { position: "MAINTENANCE" } },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $match: { "user.status": "ACTIVE" } },
      { $project: { id: { $toString: "$_id" }, fullName: "$user.fullName", username: "$user.username", _id: 0 } },
      { $sort: { fullName: 1 } },
    ]);
    return rows as Array<{ id: string; fullName: string; username: string }>;
  }
}
