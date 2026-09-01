import { StudentModel } from "../../models/student.model.js";
import type {
  IStudentRepository,
  UpdateStudentProfileData,
  StudentSearchQuery,
  AdminStudentRecord,
} from "../interfaces/student.repository.interface.js";
import type { ClientSession, Types } from "mongoose";
export class StudentRepository implements IStudentRepository {
  async isActive(id: string, s?: ClientSession) {
    const mongoose = await import("mongoose");
    if (!mongoose.isValidObjectId(id)) return false;
    const rows = await StudentModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: { "user.status": "ACTIVE" } },
      { $limit: 1 },
    ]).session(s ?? null);
    return rows.length > 0;
  }
  async findActiveIds(s?: ClientSession) {
    const rows = await StudentModel.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: { "user.status": "ACTIVE" } },
      { $group: { _id: "$_id" } },
      { $project: { _id: 1 } },
    ]).session(s ?? null);
    return rows.map((row) => row._id as Types.ObjectId);
  }
  private adminPipeline(match: Record<string, unknown> = {}) {
    return [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "contracts",
          let: { studentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$studentId", "$$studentId"] },
                    { $in: ["$status", ["PENDING", "ACTIVE"]] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 as const } },
            { $limit: 1 },
          ],
          as: "openContract",
        },
      },
      { $set: { openContract: { $first: "$openContract" } } },
      {
        $project: {
          _id: 0,
          id: { $toString: "$_id" },
          userId: { $toString: "$userId" },
          mssv: 1,
          fullName: "$user.fullName",
          email: "$user.email",
          phone: "$user.phone",
          className: 1,
          faculty: 1,
          gender: 1,
          dob: 1,
          cccd: 1,
          permanentAddress: 1,
          emergencyContactName: 1,
          emergencyContactPhone: 1,
          hasOpenContract: { $ne: [{ $type: "$openContract" }, "missing"] },
          currentContractStatus: { $ifNull: ["$openContract.status", null] },
          currentContractId: {
            $cond: [
              { $ifNull: ["$openContract._id", false] },
              { $toString: "$openContract._id" },
              null,
            ],
          },
        },
      },
    ];
  }

  async search(q: StudentSearchQuery) {
    const base: Record<string, unknown> = {};
    if (q.faculty) base.faculty = q.faculty;
    if (q.gender) base.gender = q.gender;
    const pipeline = this.adminPipeline(base);
    if (q.search) {
      const escaped = q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pipeline.push({
        $match: {
          $or: [
            { mssv: { $regex: escaped, $options: "i" } },
            { fullName: { $regex: escaped, $options: "i" } },
            { email: { $regex: escaped, $options: "i" } },
          ],
        },
      } as never);
    }
    const [result] = await StudentModel.aggregate([
      ...pipeline,
      {
        $facet: {
          items: [
            { $sort: { mssv: 1 } },
            { $skip: (q.page - 1) * q.limit },
            { $limit: q.limit },
          ],
          meta: [{ $count: "total" }],
        },
      },
    ]);
    const items = (result?.items ?? []) as AdminStudentRecord[];
    const total = result?.meta?.[0]?.total ?? 0;
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

  async findAdminDetail(id: string) {
    const mongoose = await import("mongoose");
    if (!mongoose.isValidObjectId(id)) return null;
    const [item] = await StudentModel.aggregate(
      this.adminPipeline({ _id: new mongoose.Types.ObjectId(id) }),
    );
    return (item as AdminStudentRecord | undefined) ?? null;
  }
  findById(id: string, s?: ClientSession) {
    return StudentModel.findById(id)
      .session(s ?? null)
      .exec();
  }
  findByUserId(userId: string, s?: ClientSession) {
    return StudentModel.findOne({ userId })
      .session(s ?? null)
      .exec();
  }
  findByMssv(m: string) {
    return StudentModel.findOne({ mssv: m }).exec();
  }
  async create(d: { userId: Types.ObjectId; mssv: string }, s?: ClientSession) {
    const [x] = await StudentModel.create([d], { session: s });
    return x!;
  }

  updateProfile(id: string, data: UpdateStudentProfileData, s?: ClientSession) {
    return StudentModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      session: s,
    }).exec();
  }
}
