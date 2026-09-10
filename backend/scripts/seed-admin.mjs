import "dotenv/config";
import {
  connectDatabase,
  disconnectDatabase,
} from "../dist/config/database.js";
import { UserRepository } from "../dist/repositories/implementations/user.repository.js";
import { BcryptPasswordHasher } from "../dist/services/password-hasher.service.js";
try {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seeds are disabled in production");
  const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_FULL_NAME } = process.env;
  if (
    !ADMIN_USERNAME ||
    !ADMIN_PASSWORD ||
    ADMIN_PASSWORD.length < 6 ||
    !ADMIN_FULL_NAME
  )
    throw new Error("Admin seed configuration is missing");
  await connectDatabase();
  const users = new UserRepository();
  const existing = await users.findByUsername(ADMIN_USERNAME);
  if (existing && existing.role !== "ADMIN")
    throw new Error("Seed username belongs to a non-admin account");
  if (!existing)
    await users.create({
      username: ADMIN_USERNAME,
      passwordHash: await new BcryptPasswordHasher().hash(ADMIN_PASSWORD),
      role: "ADMIN",
      fullName: ADMIN_FULL_NAME,
    });
  console.log("Admin seed complete");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
