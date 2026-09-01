import "dotenv/config";
import mongoose from "mongoose";
import { UserModel } from "../dist/models/user.model.js";
import { BcryptPasswordHasher } from "../dist/services/password-hasher.service.js";

async function main() {
  const { MONGO_URI, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_FULL_NAME } =
    process.env;
  if (!MONGO_URI || !ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_FULL_NAME) {
    throw new Error(
      "Thiếu MONGO_URI, ADMIN_USERNAME, ADMIN_PASSWORD hoặc ADMIN_FULL_NAME",
    );
  }
  if (ADMIN_PASSWORD.length < 6)
    throw new Error("ADMIN_PASSWORD phải có ít nhất 6 ký tự");
  await mongoose.connect(MONGO_URI);
  const existing = await UserModel.findOne({ username: ADMIN_USERNAME });
  if (existing) {
    console.warn(`Tài khoản ${ADMIN_USERNAME} đã tồn tại, bỏ qua.`);
    return;
  }
  const passwordHash = await new BcryptPasswordHasher().hash(ADMIN_PASSWORD);
  await UserModel.create({
    username: ADMIN_USERNAME,
    passwordHash,
    fullName: ADMIN_FULL_NAME,
    role: "ADMIN",
    status: "ACTIVE",
  });
  console.log(`Đã tạo tài khoản Admin: ${ADMIN_USERNAME}`);
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Seed Admin thất bại",
    );
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
