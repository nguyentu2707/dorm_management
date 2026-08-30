import type { UserDocument } from "../models/user.model.js";
export class UserMapper {
  static toResponse(u: UserDocument) {
    return {
      id: u._id.toString(),
      username: u.username,
      role: u.role,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      status: u.status,
    };
  }
}
