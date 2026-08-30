import { UserModel } from "../../models/user.model.js";
import type {
  IUserRepository,
  CreateUserData,
  UpdateUserProfileData,
} from "../interfaces/user.repository.interface.js";
import type { ClientSession } from "mongoose";
export class UserRepository implements IUserRepository {
  findById(id: string) {
    return UserModel.findById(id).exec();
  }
  findByUsername(username: string) {
    return UserModel.findOne({ username }).exec();
  }
  async create(d: CreateUserData, s?: ClientSession) {
    const [x] = await UserModel.create([d], { session: s });
    return x!;
  }

  updateProfile(id: string, data: UpdateUserProfileData, s?: ClientSession) {
    return UserModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      session: s,
    }).exec();
  }

  async deleteById(id: string, s?: ClientSession) {
    await UserModel.findByIdAndDelete(id, { session: s });
  }
}
