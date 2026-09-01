import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import { DemoSeedRepository } from "../src/repositories/implementations/demo-seed.repository.js";
import { UserRepository } from "../src/repositories/implementations/user.repository.js";
import { StudentRepository } from "../src/repositories/implementations/student.repository.js";
import { ContractRepository } from "../src/repositories/implementations/contract.repository.js";
import { BedRepository } from "../src/repositories/implementations/bed.repository.js";
import { RoomRepository } from "../src/repositories/implementations/room.repository.js";
import { RoomPreferenceRepository } from "../src/repositories/implementations/room-preference.repository.js";
import { ClassScheduleRepository } from "../src/repositories/implementations/class-schedule.repository.js";
import { AuthService } from "../src/services/auth.service.js";
import { ContractService } from "../src/services/contract.service.js";
import { BcryptPasswordHasher } from "../src/services/password-hasher.service.js";
import { JwtTokenService } from "../src/services/token.service.js";
import { MongoTransactionManager } from "../src/services/transaction-manager.js";
import type { ScheduleEntry } from "../src/models/class-schedule.model.js";

const profiles: Record<string, ScheduleEntry[]> = {
  MORNING: [
    { dayOfWeek: "MONDAY", startPeriod: 1, endPeriod: 4 }, { dayOfWeek: "TUESDAY", startPeriod: 1, endPeriod: 4 },
    { dayOfWeek: "WEDNESDAY", startPeriod: 1, endPeriod: 3 }, { dayOfWeek: "THURSDAY", startPeriod: 1, endPeriod: 4 },
    { dayOfWeek: "FRIDAY", startPeriod: 1, endPeriod: 3 },
  ],
  AFTERNOON: [
    { dayOfWeek: "MONDAY", startPeriod: 6, endPeriod: 9 }, { dayOfWeek: "TUESDAY", startPeriod: 6, endPeriod: 10 },
    { dayOfWeek: "WEDNESDAY", startPeriod: 6, endPeriod: 9 }, { dayOfWeek: "THURSDAY", startPeriod: 6, endPeriod: 10 },
    { dayOfWeek: "FRIDAY", startPeriod: 6, endPeriod: 9 },
  ],
  MIXED: [
    { dayOfWeek: "MONDAY", startPeriod: 1, endPeriod: 3 }, { dayOfWeek: "TUESDAY", startPeriod: 6, endPeriod: 8 },
    { dayOfWeek: "WEDNESDAY", startPeriod: 2, endPeriod: 5 }, { dayOfWeek: "THURSDAY", startPeriod: 7, endPeriod: 9 },
    { dayOfWeek: "FRIDAY", startPeriod: 1, endPeriod: 4 },
  ],
};

async function ensureStudent(auth: AuthService, users: UserRepository, students: StudentRepository, index: number, prefix = "demo") {
  const suffix = String(index).padStart(3, "0"), username = `${prefix}${suffix}`, mssv = `${prefix === "demo" ? "DEMO" : "REC"}${suffix}`;
  let user = await users.findByUsername(username);
  let created = false;
  if (!user) {
    await auth.register({ username, password: "Demo@123", fullName: `${prefix === "demo" ? "Sinh viên Demo" : "Sinh viên Gợi ý"} ${suffix}`, mssv, email: `${prefix}.student${suffix}@dormitory.local` });
    user = await users.findByUsername(username);
    created = true;
  }
  const student = await students.findByMssv(mssv);
  if (!user || !student) throw new Error(`Cannot ensure ${username}`);
  return { user, student, created };
}
async function ensureRecommendationStudent(auth: AuthService, users: UserRepository, students: StudentRepository, kind: "morning" | "medium", mssv: string) {
  const username = `recommend${kind}`;
  let user = await users.findByUsername(username);
  if (!user) {
    await auth.register({ username, password: "Demo@123", fullName: `Sinh viên Gợi ý ${kind}`, mssv, email: `recommend.${kind}@dormitory.local` });
    user = await users.findByUsername(username);
  }
  const student = await students.findByMssv(mssv);
  if (!user || !student) throw new Error(`Cannot ensure ${username}`);
  return { user, student };
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled in production");
  await connectDatabase();
  const diagnostics = new DemoSeedRepository(), users = new UserRepository(), students = new StudentRepository();
  const contracts = new ContractRepository(), preferences = new RoomPreferenceRepository(), schedules = new ClassScheduleRepository();
  const tx = new MongoTransactionManager();
  const auth = new AuthService(users, students, new JwtTokenService(), new BcryptPasswordHasher(), tx);
  const contractService = new ContractService(contracts, students, new BedRepository(), new RoomRepository(), tx);
  const before = await diagnostics.diagnostics();
  const target = Math.round(before.bedsTotal * 0.85), needed = Math.max(0, target - before.bedsOccupied);
  console.log("===== Dormitory Capacity =====");
  console.log({ Buildings: before.buildings, Rooms: before.rooms, "Beds total": before.bedsTotal, "Beds occupied": before.bedsOccupied, "Beds empty": before.bedsEmpty, "Current occupancy": before.bedsTotal ? `${(before.bedsOccupied / before.bedsTotal * 100).toFixed(1)}%` : "0%", "Target occupancy": "85%", "Additional residents needed": needed });
  const admin = await users.findByUsername(process.env.ADMIN_USERNAME ?? "admin");
  if (!admin || admin.role !== "ADMIN") throw new Error("Run seed:admin first");
  const emptyBeds = (await diagnostics.bedsStable()).filter((bed) => bed.status === "EMPTY");
  const residentStudents: Array<{ id: string; index: number }> = [];
  let accounts = 0, activeCreated = 0;
  for (let i = 1; activeCreated < needed && i <= before.bedsTotal + needed + 10; i++) {
    const account = await ensureStudent(auth, users, students, i);
    if (account.created) accounts++;
    const open = await contracts.findPendingOrActiveByStudentId(account.student.id);
    if (open) {
      residentStudents.push({ id: account.student.id, index: i });
      continue;
    }
    const bed = emptyBeds[activeCreated];
    if (!bed) break;
    await contractService.adminCreateContract(admin.id, { studentId: account.student.id, bedId: bed.id });
    residentStudents.push({ id: account.student.id, index: i });
    activeCreated++;
  }
  const scheduleTarget = Math.round(residentStudents.length * 0.65), preferenceTarget = Math.round(residentStudents.length * 0.5);
  for (let i = 0; i < scheduleTarget; i++) await schedules.upsert(residentStudents[i]!.id, profiles[["MORNING", "AFTERNOON", "MIXED"][i % 3]!]!);
  for (let i = 0; i < preferenceTarget; i++) await preferences.upsert(residentStudents[i]!.id, {
    pricePreference: ["LOW", "MEDIUM", "ANY"][i % 3] as "LOW" | "MEDIUM" | "ANY",
    wantsHotWater: i % 2 === 0,
    occupancyPreference: ["MORE_EMPTY", "MORE_OCCUPIED", "ANY"][i % 3] as "MORE_EMPTY" | "MORE_OCCUPIED" | "ANY",
  });
  const morning = await ensureRecommendationStudent(auth, users, students, "morning", "REC001");
  const medium = await ensureRecommendationStudent(auth, users, students, "medium", "REC002");
  await schedules.upsert(morning.student.id, profiles.MORNING!);
  await preferences.upsert(morning.student.id, { pricePreference: "LOW", occupancyPreference: "ANY" });
  await schedules.upsert(medium.student.id, profiles.AFTERNOON!);
  await preferences.upsert(medium.student.id, { pricePreference: "MEDIUM", wantsHotWater: true, occupancyPreference: "ANY" });
  const after = await diagnostics.diagnostics(), consistency = await diagnostics.consistency();
  console.log("===== Demo Seed Summary =====");
  console.log({ "Total Beds": after.bedsTotal, "Occupied before seed": before.bedsOccupied, "Target occupied (~85%)": target, "Demo resident accounts created/reused": residentStudents.length, "ACTIVE Contracts created": activeCreated, "Occupied after seed": after.bedsOccupied, "Empty after seed": after.bedsEmpty, "Final occupancy": after.bedsTotal ? `${(after.bedsOccupied / after.bedsTotal * 100).toFixed(1)}%` : "0%", "Residents with schedule": scheduleTarget, "Residents without schedule": residentStudents.length - scheduleTarget, "Students with RoomPreference": preferenceTarget, "Recommendation test accounts": 2, consistency });
  if (consistency.activeOnNonOccupiedBeds || consistency.bedsWithMultipleActiveContracts || consistency.fullRoomsWithEmptyBeds) console.warn("WARNING: pre-existing or seeded data consistency issues detected", consistency);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
