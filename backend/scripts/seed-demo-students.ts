import { disconnectDatabase } from "../src/config/database.js";
import { connectDatabase } from "../src/config/database.js";
import { DemoSeedRepository } from "../src/repositories/implementations/demo-seed.repository.js";
import { UserRepository } from "../src/repositories/implementations/user.repository.js";
import { StudentRepository } from "../src/repositories/implementations/student.repository.js";
import { ContractRepository } from "../src/repositories/implementations/contract.repository.js";
import { CheckoutRequestRepository } from "../src/repositories/implementations/checkout-request.repository.js";
import { BedRepository } from "../src/repositories/implementations/bed.repository.js";
import { RoomRepository } from "../src/repositories/implementations/room.repository.js";
import { BuildingRepository } from "../src/repositories/implementations/building.repository.js";
import { RoomPreferenceRepository } from "../src/repositories/implementations/room-preference.repository.js";
import { ClassScheduleRepository } from "../src/repositories/implementations/class-schedule.repository.js";
import { AuthService } from "../src/services/auth.service.js";
import { ContractService } from "../src/services/contract.service.js";
import { BcryptPasswordHasher } from "../src/services/password-hasher.service.js";
import { JwtTokenService } from "../src/services/token.service.js";
import { PostgresTransactionManager } from "../src/services/transaction-manager.js";
import { StudentRegistryRepository } from "../src/repositories/implementations/student-registry.repository.js";
import { RefreshSessionRepository } from "../src/repositories/implementations/refresh-session.repository.js";
import type { ScheduleEntry } from "../src/models/class-schedule.model.js";

const profiles: Record<string, ScheduleEntry[]> = {
  MORNING: [
    { dayOfWeek: "MONDAY", startPeriod: 1, endPeriod: 4 },
    { dayOfWeek: "TUESDAY", startPeriod: 1, endPeriod: 4 },
    { dayOfWeek: "WEDNESDAY", startPeriod: 1, endPeriod: 3 },
    { dayOfWeek: "THURSDAY", startPeriod: 1, endPeriod: 4 },
    { dayOfWeek: "FRIDAY", startPeriod: 1, endPeriod: 3 },
  ],
  AFTERNOON: [
    { dayOfWeek: "MONDAY", startPeriod: 6, endPeriod: 9 },
    { dayOfWeek: "TUESDAY", startPeriod: 6, endPeriod: 10 },
    { dayOfWeek: "WEDNESDAY", startPeriod: 6, endPeriod: 9 },
    { dayOfWeek: "THURSDAY", startPeriod: 6, endPeriod: 10 },
    { dayOfWeek: "FRIDAY", startPeriod: 6, endPeriod: 9 },
  ],
  MIXED: [
    { dayOfWeek: "MONDAY", startPeriod: 1, endPeriod: 3 },
    { dayOfWeek: "TUESDAY", startPeriod: 6, endPeriod: 8 },
    { dayOfWeek: "WEDNESDAY", startPeriod: 2, endPeriod: 5 },
    { dayOfWeek: "THURSDAY", startPeriod: 7, endPeriod: 9 },
    { dayOfWeek: "FRIDAY", startPeriod: 1, endPeriod: 4 },
  ],
};

async function ensureStudent(
  auth: AuthService,
  users: UserRepository,
  students: StudentRepository,
  registry: StudentRegistryRepository,
  sessions: RefreshSessionRepository,
  index: number,
  gender: "MALE" | "FEMALE",
) {
  const suffix = String(index).padStart(3, "0"),
    prefix = gender === "MALE" ? "demom" : "demof",
    username = `${prefix}${suffix}`,
    mssv = `${gender === "MALE" ? "DM" : "DF"}${suffix}`;
  let user = await users.findByUsername(username);
  let created = false;
  if (!user) {
    if (!(await registry.findByStudentCode(mssv)))
      await registry.create({
        studentCode: mssv,
        fullName: `Sinh viên Demo ${gender === "MALE" ? "Nam" : "Nữ"} ${suffix}`,
        email: `${prefix}.student${suffix}@dormitory.local`,
        gender,
      });
    await auth.register({
      username,
      password: "Demo@123",
      mssv,
      email: `${prefix}.student${suffix}@dormitory.local`,
    });
    user = await users.findByUsername(username);
    if (user) await sessions.revokeAllByUserId(user.id);
    created = true;
  }
  const student = await students.findByMssv(mssv);
  if (!user || !student) throw new Error(`Cannot ensure ${username}`);
  if (student.gender !== gender) await students.updateProfile(student.id, { gender });
  return { user, student: (await students.findByMssv(mssv))!, created };
}
async function ensureRecommendationStudent(
  auth: AuthService,
  users: UserRepository,
  students: StudentRepository,
  registry: StudentRegistryRepository,
  sessions: RefreshSessionRepository,
  kind: "morning" | "medium",
  mssv: string,
) {
  const username = `recommend${kind}`;
  let user = await users.findByUsername(username);
  if (!user) {
    const email = `recommend.${kind}@dormitory.local`;
    if (!(await registry.findByStudentCode(mssv)))
      await registry.create({
        studentCode: mssv,
        fullName: `Sinh viên Gợi ý ${kind}`,
        email,
        gender: kind === "morning" ? "MALE" : "FEMALE",
      });
    await auth.register({
      username,
      password: "Demo@123",
      mssv,
      email,
    });
    user = await users.findByUsername(username);
    if (user) await sessions.revokeAllByUserId(user.id);
  }
  const student = await students.findByMssv(mssv);
  if (!user || !student) throw new Error(`Cannot ensure ${username}`);
  if (!student.gender) await students.updateProfile(student.id, { gender: kind === "morning" ? "MALE" : "FEMALE" });
  return { user, student: (await students.findByMssv(mssv))! };
}

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seeds are disabled in production");
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seed is disabled in production");
  await connectDatabase();
  const diagnostics = new DemoSeedRepository(),
    users = new UserRepository(),
    students = new StudentRepository(),
    registry = new StudentRegistryRepository(),
    sessions = new RefreshSessionRepository();
  const contracts = new ContractRepository(),
    preferences = new RoomPreferenceRepository(),
    schedules = new ClassScheduleRepository();
  const tx = new PostgresTransactionManager();
  const auth = new AuthService(
    users,
    students,
    sessions,
    registry,
    new JwtTokenService(),
    new BcryptPasswordHasher(),
    tx,
  );
  const contractService = new ContractService(
    contracts,
    students,
    new BedRepository(),
    new RoomRepository(),
    tx,
    new CheckoutRequestRepository(),
    new BuildingRepository(),
  );
  const before = await diagnostics.diagnostics();
  const stableBeds = await diagnostics.bedsStable();
  const eligibleBeds = stableBeds.filter(
    (bed) => bed.buildingStatus === "ACTIVE" && ["AVAILABLE", "FULL"].includes(bed.roomStatus),
  );
  const occupiedEligible = eligibleBeds.filter((bed) => bed.status === "OCCUPIED").length;
  const target = Math.round(eligibleBeds.length * 0.55),
    needed = Math.max(0, target - occupiedEligible);
  console.log("===== Dormitory Capacity =====");
  console.log({
    Buildings: before.buildings,
    Rooms: before.rooms,
    "Beds total": before.bedsTotal,
    "Beds occupied": before.bedsOccupied,
    "Beds empty": before.bedsEmpty,
    "Current occupancy": before.bedsTotal
      ? `${((before.bedsOccupied / before.bedsTotal) * 100).toFixed(1)}%`
      : "0%",
    "Usable beds": eligibleBeds.length,
    "Target occupancy": "55%",
    "Additional residents needed": needed,
  });
  const admin = await users.findByUsername(
    process.env.ADMIN_USERNAME ?? "admin",
  );
  if (!admin || admin.role !== "ADMIN") throw new Error("Run seed:admin first");
  const byGender = (gender: "MALE" | "FEMALE") => eligibleBeds.filter((bed) => bed.allowedGender === gender);
  const selectedByGender = (["MALE", "FEMALE"] as const).map((gender) => {
    const zone = byGender(gender), occupied = zone.filter((bed) => bed.status === "OCCUPIED").length;
    const deficit = Math.max(0, Math.round(zone.length * 0.55) - occupied);
    return zone.filter((bed) => bed.status === "EMPTY").slice(0, deficit);
  });
  const emptyBeds = Array.from({ length: Math.max(...selectedByGender.map((items) => items.length), 0) }, (_, index) => selectedByGender.flatMap((items) => items[index] ? [items[index]!] : [])).flat().slice(0, needed);
  const residentStudents: Array<{ id: string; index: number }> = [];
  let accounts = 0,
    activeCreated = 0;
  for (
    let i = 1;
    activeCreated < emptyBeds.length && i <= before.bedsTotal + needed + 10;
    i++
  ) {
    const bed = emptyBeds[activeCreated];
    if (!bed) break;
    const gender = bed.allowedGender === "FEMALE" ? "FEMALE" : "MALE";
    const account = await ensureStudent(auth, users, students, registry, sessions, i, gender);
    if (account.created) accounts++;
    const open = await contracts.findPendingOrActiveByStudentId(
      account.student.id,
    );
    if (open) {
      residentStudents.push({ id: account.student.id, index: i });
      continue;
    }
    await contractService.adminCreateContract(admin.id, {
      studentId: account.student.id,
      bedId: bed.id,
    });
    residentStudents.push({ id: account.student.id, index: i });
    activeCreated++;
  }
  const scheduleTarget = Math.round(residentStudents.length * 0.65),
    preferenceTarget = Math.round(residentStudents.length * 0.5);
  for (let i = 0; i < scheduleTarget; i++)
    await schedules.upsert(
      residentStudents[i]!.id,
      profiles[["MORNING", "AFTERNOON", "MIXED"][i % 3]!]!,
    );
  for (let i = 0; i < preferenceTarget; i++)
    await preferences.upsert(residentStudents[i]!.id, {
      pricePreference: ["LOW", "MEDIUM", "ANY"][i % 3] as
        "LOW" | "MEDIUM" | "ANY",
      wantsHotWater: i % 2 === 0,
      occupancyPreference: ["MORE_EMPTY", "MORE_OCCUPIED", "ANY"][i % 3] as
        "MORE_EMPTY" | "MORE_OCCUPIED" | "ANY",
    });
  const morning = await ensureRecommendationStudent(
    auth,
    users,
    students,
    registry,
    sessions,
    "morning",
    "REC001",
  );
  const medium = await ensureRecommendationStudent(
    auth,
    users,
    students,
    registry,
    sessions,
    "medium",
    "REC002",
  );
  await schedules.upsert(morning.student.id, profiles.MORNING!);
  await preferences.upsert(morning.student.id, {
    pricePreference: "LOW",
    occupancyPreference: "ANY",
  });
  await schedules.upsert(medium.student.id, profiles.AFTERNOON!);
  await preferences.upsert(medium.student.id, {
    pricePreference: "MEDIUM",
    wantsHotWater: true,
    occupancyPreference: "ANY",
  });
  const after = await diagnostics.diagnostics(),
    consistency = await diagnostics.consistency();
  console.log("===== Demo Seed Summary =====");
  console.log({
    "Total Beds": after.bedsTotal,
    "Occupied before seed": before.bedsOccupied,
    "Target occupied (~55% usable capacity)": target,
    "Demo resident accounts created/reused": residentStudents.length,
    "ACTIVE Contracts created": activeCreated,
    "Occupied after seed": after.bedsOccupied,
    "Empty after seed": after.bedsEmpty,
    "Final occupancy": after.bedsTotal
      ? `${((after.bedsOccupied / after.bedsTotal) * 100).toFixed(1)}%`
      : "0%",
    "Residents with schedule": scheduleTarget,
    "Residents without schedule": residentStudents.length - scheduleTarget,
    "Students with RoomPreference": preferenceTarget,
    "Recommendation test accounts": 2,
    consistency,
  });
  if (
    consistency.activeOnNonOccupiedBeds ||
    consistency.bedsWithMultipleActiveContracts ||
    consistency.fullRoomsWithEmptyBeds
  )
    console.warn(
      "WARNING: pre-existing or seeded data consistency issues detected",
      consistency,
    );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
