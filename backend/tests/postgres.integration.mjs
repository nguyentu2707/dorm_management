import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrate } from "../scripts/migrate.mjs";
import { requireTestDatabase } from "../scripts/test-database-url.mjs";

const url = process.env.TEST_DATABASE_URL;
// Recheck the suffix and explicit pool source before migrations or reset.
requireTestDatabase(url);
assert.equal(process.env.DATABASE_URL_SOURCE, "TEST_DATABASE_URL");
process.env.JWT_SECRET = "integration-access-secret-only";
process.env.JWT_REFRESH_SECRET = "integration-refresh-secret-only";
const { pool } = await import("../dist/database/pool.js");
// Defense in depth: verify the actual Pool before ANY migration/reset, not just env.
assert.ok(
  pool.options.connectionString === url,
  "Pool must target TEST_DATABASE_URL",
);
const selectedDatabase = decodeURIComponent(new URL(url).pathname.slice(1));
assert.equal(
  (await pool.query("SELECT current_database() AS name")).rows[0].name,
  selectedDatabase,
);
assert.ok(selectedDatabase.endsWith("_test"));
const { paymentScenarios } = await import("./payment.scenarios.mjs");
const { query } = await import("../dist/database/query.js");
const { PostgresDashboardRepository } =
  await import("../dist/repositories/implementations/dashboard.repository.js");
const { AdminDashboardService } =
  await import("../dist/services/admin/dashboard.service.js");
const { PostgresTransactionManager } =
  await import("../dist/services/transaction-manager.js");
const { translatePostgresError } =
  await import("../dist/database/postgres-errors.js");
const repos = {};
for (const [key, file, name] of [
  ["users", "user", "User"],
  ["students", "student", "Student"],
  ["sessions", "refresh-session", "RefreshSession"],
  ["registry", "student-registry", "StudentRegistry"],
  ["buildings", "building", "Building"],
  ["types", "room-type", "RoomType"],
  ["rooms", "room", "Room"],
  ["beds", "bed", "Bed"],
  ["contracts", "contract", "Contract"],
  ["changes", "room-change-request", "RoomChangeRequest"],
  ["checkouts", "checkout-request", "CheckoutRequest"],
  ["billings", "monthly-billing", "MonthlyBilling"],
  ["cursors", "room-billing-cursor", "RoomBillingCursor"],
  ["readings", "utility-reading", "UtilityReading"],
  ["invoices", "invoice", "Invoice"],
  ["equipment", "equipment-item", "EquipmentItem"],
  ["categories", "equipment-category", "EquipmentCategory"],
  ["schedules", "class-schedule", "ClassSchedule"],
  ["preferences", "room-preference", "RoomPreference"],
  ["recommendations", "room-recommendation", "RoomRecommendation"],
  ["notifications", "notification", "Notification"],
  ["recipients", "notification-recipient", "NotificationRecipient"],
  ["maintenance", "maintenance-request", "MaintenanceRequest"],
  ["diagnostics", "demo-seed", "DemoSeed"],
]) {
  const module = await import(
    `../dist/repositories/implementations/${file}.repository.js`
  );
  repos[key] = new module[`${name}Repository`]();
}
const { AuthService } = await import("../dist/services/auth.service.js");
const { JwtTokenService } = await import("../dist/services/token.service.js");
const { BcryptPasswordHasher } =
  await import("../dist/services/password-hasher.service.js");
const { ContractService } =
  await import("../dist/services/contract.service.js");
const { RoomChangeRequestService } =
  await import("../dist/services/room-change-request.service.js");
const { CheckoutRequestService } =
  await import("../dist/services/checkout-request.service.js");
const { MonthlyBillingService } =
  await import("../dist/services/monthly-billing.service.js");
const { MonthlyBillingCalculator } =
  await import("../dist/services/monthly-billing.calculator.js");
const { RoomService } = await import("../dist/services/admin/room.service.js");
const { RoomTypeService } =
  await import("../dist/services/admin/room-type.service.js");
const { BuildingService } =
  await import("../dist/services/admin/building.service.js");
const { app } = await import("../dist/app.js");
const tx = new PostgresTransactionManager(),
  r = repos;
const tokens = new JwtTokenService(),
  hasher = new BcryptPasswordHasher();
const auth = new AuthService(
  r.users,
  r.students,
  r.sessions,
  r.registry,
  tokens,
  hasher,
  tx,
);
const contracts = new ContractService(
  r.contracts,
  r.students,
  r.beds,
  r.rooms,
  tx,
  r.checkouts,
  r.types,
  r.buildings,
);
const changes = new RoomChangeRequestService(
  r.changes,
  r.contracts,
  r.students,
  r.beds,
  r.rooms,
  tx,
  r.checkouts,
  r.types,
  r.buildings,
);
const checkout = new CheckoutRequestService(
  r.checkouts,
  r.contracts,
  r.students,
  r.changes,
  r.beds,
  r.rooms,
  tx,
);
const roomService = new RoomService(
  r.rooms,
  r.buildings,
  r.types,
  r.beds,
  r.equipment,
  tx,
);
const roomTypeService = new RoomTypeService(r.types, r.rooms, tx);
const calculator = new MonthlyBillingCalculator(
  r.rooms,
  r.buildings,
  r.contracts,
  r.readings,
  {
    electricityPerKwh: 3500,
    waterPerM3: 15000,
    wifiPerRoomMonth: 100000,
    trashPerRoomMonth: 20000,
  },
  () => new Date("2026-12-15T00:00:00Z"),
);
const billing = (invoices = r.invoices) =>
  new MonthlyBillingService(
    r.billings,
    r.cursors,
    invoices,
    r.readings,
    r.rooms,
    r.buildings,
    r.students,
    calculator,
    tx,
  );
const code = (expected) => (e) => e.code === expected;
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const userData = (username, email) => ({
  username,
  fullName: username,
  passwordHash: "hash",
  role: "STUDENT",
  email,
});
let building,
  type,
  admin,
  serial = 0;
async function room(capacity = 2) {
  const rt =
    capacity === 2
      ? type
      : await r.types.create({
          name: "type" + serial,
          capacity,
          pricePerMonth: 1000000,
        });
  return roomService.create({
    buildingId: building.id,
    roomTypeId: rt.id,
    roomNumber: "R" + ++serial,
    floor: 1,
  });
}
async function student() {
  const id = ++serial,
    u = await r.users.create(userData("u" + id, "u" + id + "@example.test"));
  return {
    user: u,
    student: await r.students.create({
      userId: u.id,
      mssv: "SV" + id,
      gender: "MALE",
    }),
  };
}
async function resident(target) {
  const account = await student(),
    bed = (await r.beds.findByRoomId(target.id)).find(
      (x) => x.status === "EMPTY",
    );
  const c = await contracts.adminCreateContract(admin.id, {
    studentId: account.student.id,
    bedId: bed.id,
    startDate: new Date("2026-01-01T00:00:00Z"),
    endDate: new Date("2027-01-01T00:00:00Z"),
  });
  return { ...account, contract: c, bed };
}
async function draft(target, period, current = 10) {
  return billing().saveDraft(
    {
      roomId: target.id,
      billingPeriod: period,
      electricityPrevious: 0,
      waterPrevious: 0,
      electricityCurrent: current,
      waterCurrent: current,
    },
    new Date("2026-12-15T00:00:00Z"),
  );
}

test(
  "real PostgreSQL persistence migration",
  { timeout: 120000 },
  async (t) => {
    let server;
    try {
      await migrate(pool);
      // The test pool reads TEST_DATABASE_URL directly; DATABASE_URL is never repurposed.
      assert.equal(process.env.DATABASE_URL_SOURCE, "TEST_DATABASE_URL");
      await pool.query(
        "TRUNCATE audit_logs,refresh_sessions,student_registry,users,students,staff,buildings,room_types,rooms,beds,equipment_categories,equipment_items,contracts,room_change_requests,checkout_requests,maintenance_requests,notifications,notification_recipients,room_preferences,class_schedules,monthly_billings,utility_readings,invoices,invoice_items RESTART IDENTITY CASCADE",
      );
      await t.test("versioned migrations down/up and repeat up", async () => {
        await migrate(pool, "down");
        await migrate(pool, "down");
        await migrate(pool, "down");
        await migrate(pool);
        await migrate(pool);
        const migrationFiles = (await import("node:fs/promises")).readdir(
          new URL("../migrations/", import.meta.url),
        );
        const expectedMigrations = (await migrationFiles).filter((name) =>
          /^\d+_.+\.up\.sql$/.test(name),
        ).length;
        assert.equal(
          Number(
            (await pool.query("SELECT count(*) FROM schema_migrations")).rows[0]
              .count,
          ),
          expectedMigrations,
        );
        const names = (
          await pool.query(
            `SELECT conname FROM pg_constraint WHERE connamespace=current_schema()::regnamespace`,
          )
        ).rows.map((x) => x.conname);
        for (const expected of [
          "uq_users_email",
          "uq_rooms_building_room_number",
          "uq_beds_room_bed_number",
          "ck_room_types_capacity",
          "fk_contracts_bed_room",
          "uq_monthly_billings_room_period",
          "uq_utility_readings_room_period",
          "fk_payments_invoice",
          "fk_refresh_sessions_user",
          "uq_student_registry_student_code",
          "ck_student_registry_claim_state",
          "ck_contracts_room_price_per_month_snapshot",
        ])
          assert.ok(names.includes(expected), `Missing constraint ${expected}`);
        const indexes = (
          await pool.query(
            `SELECT indexname FROM pg_indexes WHERE schemaname=current_schema()`,
          )
        ).rows.map((x) => x.indexname);
        assert.ok(indexes.includes("uq_payments_pending_invoice"));
      });
      admin = await r.users.create({ ...userData("admin"), role: "ADMIN" });
      building = await r.buildings.create({ name: "Test Building" });
      type = await r.types.create({
        name: "Per occupant",
        capacity: 2,
        pricePerMonth: 1200000,
      });
      await t.test(
        "dashboard aggregates occupancy, expiry, finance and trends from PostgreSQL",
        async () => {
          const rollback = new Error("ROLLBACK_DASHBOARD_FIXTURE");
          await assert.rejects(
            () =>
              tx.runInTransaction(async () => {
                const dashboard = new AdminDashboardService(
                  new PostgresDashboardRepository(),
                );
                const target = await room(3);
                const unavailable = await room(1);
                await query(
                  "UPDATE rooms SET status='MAINTENANCE' WHERE id=$1",
                  [unavailable.id],
                );

                const first = await resident(target);
                const second = await resident(target);
                const ended = await resident(target);
                await query(
                  "UPDATE contracts SET end_date=now()+interval '5 days' WHERE id=$1",
                  [first.contract.id],
                );
                await query(
                  "UPDATE contracts SET end_date=now()+interval '20 days' WHERE id=$1",
                  [second.contract.id],
                );
                await query(
                  "UPDATE contracts SET status='ENDED',ended_at=now() WHERE id=$1",
                  [ended.contract.id],
                );
                await query("UPDATE beds SET status='EMPTY' WHERE id=$1", [
                  ended.bed.id,
                ]);
                const pendingStudent = await student();
                await query(
                  `INSERT INTO contracts(student_id,bed_id,room_id,start_date,end_date,status)
                   VALUES($1,$2,$3,now(),now()+interval '90 days','PENDING')`,
                  [pendingStudent.student.id, ended.bed.id, target.id],
                );
                await query(
                  `INSERT INTO room_change_requests(student_id,current_contract_id,target_bed_id,status)
                   VALUES($1,$2,$3,'PENDING')`,
                  [first.student.id, first.contract.id, ended.bed.id],
                );
                await query(
                  `INSERT INTO checkout_requests(student_id,contract_id,room_id,status)
                   VALUES($1,$2,$3,'PENDING')`,
                  [second.student.id, second.contract.id, target.id],
                );
                await query(
                  `INSERT INTO maintenance_requests(student_id,room_id,category,description,status)
                   VALUES($1,$2,'OTHER','Dashboard pending','PENDING'),
                         ($1,$2,'OTHER','Dashboard progress','IN_PROGRESS')`,
                  [first.student.id, target.id],
                );
                await query(
                  "INSERT INTO staff(staff_code,full_name,status) VALUES('DASH-STAFF','Dashboard Staff','ACTIVE')",
                );

                const parts = new Intl.DateTimeFormat("en-US", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  year: "numeric",
                  month: "2-digit",
                }).formatToParts(new Date());
                const period = `${parts.find((x) => x.type === "year").value}-${parts.find((x) => x.type === "month").value}`;
                const draftBilling = await billing().saveDraft(
                  {
                    roomId: target.id,
                    billingPeriod: period,
                    electricityPrevious: 0,
                    electricityCurrent: 12,
                    waterPrevious: 0,
                    waterCurrent: 7,
                  },
                  new Date(),
                );
                const finalized = await billing().finalize(
                  draftBilling.id,
                  admin.id,
                );
                const [invoice, ...cancelled] = finalized.invoices;
                assert.ok(invoice);
                await query(
                  "UPDATE invoices SET total_amount=1000000,status='PARTIALLY_PAID' WHERE id=$1",
                  [invoice.id],
                );
                if (cancelled.length)
                  await query(
                    "UPDATE invoices SET status='CANCELLED' WHERE id=ANY($1::uuid[])",
                    [cancelled.map((item) => item.id)],
                  );
                await query(
                  `INSERT INTO payments(
                     invoice_id,amount,status,submitted_by,processed_by,processed_at,
                     voided_by,voided_at,void_reason
                   )
                   VALUES($1,400000,'CONFIRMED',$2,$2,now(),NULL,NULL,NULL),
                         ($1,300000,'PENDING',$2,NULL,NULL,NULL,NULL,NULL),
                         ($1,200000,'VOIDED',$2,$2,now(),$2,now(),'Dashboard void test')`,
                  [invoice.id, admin.id],
                );

                const summary = await dashboard.summary();
                assert.equal(summary.facility.totalUsableBeds, 3);
                assert.equal(summary.facility.occupiedBeds, 2);
                assert.equal(summary.facility.emptyBeds, 1);
                assert.equal(summary.facility.occupancyRate, 66.7);
                assert.equal(summary.residence.activeContracts, 2);
                assert.equal(summary.residence.pendingContracts, 1);
                assert.equal(summary.residence.pendingRoomChanges, 1);
                assert.equal(summary.residence.pendingCheckouts, 1);
                assert.equal(summary.expiringContracts.within7Days, 1);
                assert.equal(summary.expiringContracts.within30Days, 2);
                assert.equal(summary.operations.pendingMaintenance, 1);
                assert.equal(summary.operations.inProgressMaintenance, 1);
                assert.equal(summary.finance.partiallyPaidInvoices, 1);
                assert.equal(summary.finance.confirmedRevenueThisMonth, 400000);
                assert.equal(summary.finance.confirmedRevenueAllTime, 400000);
                assert.equal(summary.finance.outstandingAmount, 600000);
                const targetBuilding = summary.occupancyByBuilding.find(
                  (item) => item.buildingId === building.id,
                );
                assert.equal(targetBuilding.occupancyRate, 66.7);

                const trends = await dashboard.trends(6);
                assert.deepEqual(trends.revenue, [{ period, amount: 400000 }]);
                assert.deepEqual(trends.utilities, [
                  { period, electricityUsage: 12, waterUsage: 7 },
                ]);

                await query(
                  "UPDATE invoices SET status='CANCELLED' WHERE id=$1",
                  [invoice.id],
                );
                assert.equal(
                  (await dashboard.summary()).finance.outstandingAmount,
                  0,
                );
                throw rollback;
              }),
            (error) => error === rollback,
          );
        },
      );
      await t.test(
        "real unique diagnostic translates exact SQLSTATE plus constraint",
        async () => {
          const winner = await r.users.create(
            userData("first", "same@example.test"),
          );
          await assert.rejects(
            () =>
              pool.query(
                `INSERT INTO users(username,password_hash,role,full_name,email) VALUES ('second','hash','STUDENT','Second','same@example.test')`,
              ),
            (e) =>
              e.code === "23505" &&
              e.constraint === "uq_users_email" &&
              translatePostgresError(e).code === "EMAIL_ALREADY_EXISTS",
          );
          await assert.rejects(
            () => r.users.create(userData("third", "same@example.test")),
            code("EMAIL_ALREADY_EXISTS"),
          );
          await r.users.create(userData("null1"));
          await r.users.create(userData("null2"));
          const results = await Promise.allSettled([
            r.users.create(userData("race1", "race@example.test")),
            r.users.create(userData("race2", "race@example.test")),
          ]);
          assert.equal(
            results.filter((x) => x.status === "fulfilled").length,
            1,
          );
          assert.equal(
            results.find((x) => x.status === "rejected").reason.code,
            "EMAIL_ALREADY_EXISTS",
          );
          assert.ok(winner.id.match(/^[a-f0-9-]{36}$/));
        },
      );
      await t.test(
        "room number scope, cursor creation, FK/CHECK and bed-room integrity",
        async () => {
          const first = await room();
          assert.equal(
            (await r.cursors.findByRoom(first.id)).latestFinalizedBillingPeriod,
            null,
          );
          await assert.rejects(
            () =>
              r.rooms.create({
                buildingId: building.id,
                roomTypeId: type.id,
                roomNumber: first.roomNumber,
                floor: 1,
              }),
            code("ROOM_NUMBER_ALREADY_EXISTS"),
          );
          const another = await r.buildings.create({ name: "Second" });
          await roomService.create({
            buildingId: another.id,
            roomTypeId: type.id,
            roomNumber: first.roomNumber,
            floor: 1,
          });
          await assert.rejects(
            () =>
              pool.query(
                "INSERT INTO rooms(building_id,room_type_id,room_number,floor) VALUES ($1,$2,$3,0)",
                [randomUUID(), type.id, "bad"],
              ),
            (e) => e.code === "23503" && e.constraint === "fk_rooms_building",
          );
          await assert.rejects(
            () =>
              pool.query(
                "INSERT INTO room_types(name,capacity,price_per_month) VALUES ('invalid',0,0)",
              ),
            (e) =>
              e.code === "23514" && e.constraint === "ck_room_types_capacity",
          );
          const other = await room(),
            a = await student(),
            bed = (await r.beds.findByRoomId(first.id))[0];
          await assert.rejects(
            () =>
              r.contracts.create({
                studentId: a.student.id,
                bedId: bed.id,
                roomId: other.id,
                startDate: new Date("2026-01-01"),
                endDate: new Date("2027-01-01"),
                status: "PENDING",
                roomPricePerMonthSnapshot: 1_800_000,
              }),
            code("CONTRACT_ROOM_MISMATCH"),
          );
        },
      );
      await t.test(
        "room creation is atomic and creates exactly the RoomType capacity",
        async () => {
          const four = await r.types.create({
            name: "Atomic four " + ++serial,
            capacity: 4,
            pricePerMonth: 1500000,
          });
          const created = await roomService.create({
            buildingId: building.id,
            roomTypeId: four.id,
            roomNumber: "AT" + ++serial,
            floor: 2,
          });
          const beds = await r.beds.findByRoomId(created.id);
          assert.equal(beds.length, 4);
          assert.equal(new Set(beds.map((bed) => bed.bedNumber)).size, 4);
          assert.ok(beds.every((bed) => bed.roomId === created.id));
          assert.ok(await r.cursors.findByRoom(created.id));

          const failingBeds = new Proxy(r.beds, {
            get(target, key) {
              if (key === "createMany")
                return async (...args) => {
                  await target.createMany(...args);
                  throw new Error("injected bed creation failure");
                };
              return typeof target[key] === "function"
                ? target[key].bind(target)
                : target[key];
            },
          });
          const brokenService = new RoomService(
            r.rooms,
            r.buildings,
            r.types,
            failingBeds,
            r.equipment,
            tx,
          );
          const failedNumber = "FAIL" + ++serial;
          await assert.rejects(
            () =>
              brokenService.create({
                buildingId: building.id,
                roomTypeId: four.id,
                roomNumber: failedNumber,
                floor: 2,
              }),
            /injected bed creation failure/,
          );
          assert.equal(
            await r.rooms.findByRoomNumberAndBuildingId(
              failedNumber,
              building.id,
            ),
            null,
          );
        },
      );
      await t.test(
        "room type changes preserve bed capacity and IDs",
        async () => {
          const typeA = await r.types.create({
            name: "Capacity A " + ++serial,
            capacity: 4,
            pricePerMonth: 1000000,
          });
          const typeB = await r.types.create({
            name: "Capacity B " + ++serial,
            capacity: 4,
            pricePerMonth: 2000000,
          });
          const typeSix = await r.types.create({
            name: "Capacity six " + ++serial,
            capacity: 6,
            pricePerMonth: 2000000,
          });
          const target = await roomService.create({
            buildingId: building.id,
            roomTypeId: typeA.id,
            roomNumber: "CAP" + ++serial,
            floor: 3,
          });
          const originalIds = (await r.beds.findByRoomId(target.id))
            .map((bed) => bed.id)
            .sort();
          await roomService.update(target.id, { roomTypeId: typeB.id });
          assert.equal(
            (await r.rooms.findById(target.id)).roomTypeId,
            typeB.id,
          );
          assert.deepEqual(
            (await r.beds.findByRoomId(target.id)).map((bed) => bed.id).sort(),
            originalIds,
          );
          await assert.rejects(
            () => roomService.update(target.id, { roomTypeId: typeSix.id }),
            code("ROOM_TYPE_CAPACITY_MISMATCH"),
          );
          assert.equal(
            (await r.rooms.findById(target.id)).roomTypeId,
            typeB.id,
          );
          assert.equal((await r.beds.findByRoomId(target.id)).length, 4);

          await assert.rejects(
            () => roomTypeService.update(typeB.id, { capacity: 6 }),
            code("ROOM_TYPE_CAPACITY_IN_USE"),
          );
          const unused = await r.types.create({
            name: "Unused capacity " + ++serial,
            capacity: 4,
            pricePerMonth: 1000000,
          });
          await roomTypeService.update(unused.id, { capacity: 6 });
          assert.equal((await r.types.findById(unused.id)).capacity, 6);
        },
      );
      await t.test(
        "room assignment racing target capacity update cannot create mismatch",
        async () => {
          const sourceType = await r.types.create({
            name: "Race source " + ++serial,
            capacity: 4,
            pricePerMonth: 1000000,
          });
          const targetType = await r.types.create({
            name: "Race target " + ++serial,
            capacity: 4,
            pricePerMonth: 1000000,
          });
          const target = await roomService.create({
            buildingId: building.id,
            roomTypeId: sourceType.id,
            roomNumber: "RACE" + ++serial,
            floor: 4,
          });
          const results = await Promise.allSettled([
            roomService.update(target.id, { roomTypeId: targetType.id }),
            roomTypeService.update(targetType.id, { capacity: 6 }),
          ]);
          assert.equal(
            results.filter((result) => result.status === "fulfilled").length,
            1,
          );
          const finalRoom = await r.rooms.findById(target.id);
          const finalType = await r.types.findById(finalRoom.roomTypeId);
          assert.equal(
            (await r.beds.findByRoomId(target.id)).length,
            finalType.capacity,
          );
        },
      );
      await t.test(
        "transaction context is shared even when optional argument is omitted; rollback preserves original error",
        async () => {
          let ctx;
          await assert.rejects(
            () =>
              tx.runInTransaction(async (s) => {
                ctx = s;
                await r.users.create(userData("rollback-context"));
                await r.buildings.create({ name: "rollback-building" }, s);
                throw new Error("intentional rollback");
              }),
            /intentional rollback/,
          );
          assert.equal(await r.users.findByUsername("rollback-context"), null);
          await assert.rejects(() => query("SELECT 1", [], ctx), /Inactive/);
          await tx.runInTransaction(async (s) => {
            const a = await query("SELECT pg_backend_pid() AS pid", [], s),
              b = await query("SELECT pg_backend_pid() AS pid");
            assert.equal(a.rows[0].pid, b.rows[0].pid);
          });
        },
      );
      await t.test(
        "registry registration rolls back User and Student on injected failure",
        async () => {
          const identity = await r.registry.create({
            studentCode: "ROLLBACK001",
            fullName: "Rollback Student",
            email: "rollback.registry@example.test",
            gender: "FEMALE",
          });
          const failingStudents = {
            ...r.students,
            findByMssv: r.students.findByMssv.bind(r.students),
            create: async (...args) => {
              await r.students.create(...args);
              throw new Error("injected registration failure");
            },
          };
          const service = new AuthService(
            r.users,
            failingStudents,
            r.sessions,
            r.registry,
            tokens,
            hasher,
            tx,
          );
          await assert.rejects(
            () =>
              service.register({
                username: "rollback-register",
                password: "Secret123!",
                mssv: identity.studentCode,
                email: identity.email,
              }),
            /injected registration failure/,
          );
          assert.equal(await r.users.findByUsername("rollback-register"), null);
          assert.equal(await r.students.findByMssv(identity.studentCode), null);
          assert.equal(
            (await r.registry.findById(identity.id)).status,
            "AVAILABLE",
          );
        },
      );
      await t.test(
        "registry is authoritative and claim registration is atomic",
        async () => {
          const identity = await r.registry.create({
            studentCode: " registry001 ".trim().toUpperCase(),
            fullName: "Registry Authority",
            email: "registry.authority@example.test",
            gender: "FEMALE",
          });
          await assert.rejects(
            () =>
              auth.register({
                username: "unknown-registry",
                password: "Secret123!",
                mssv: "UNKNOWN001",
                email: "unknown@example.test",
              }),
            code("STUDENT_NOT_IN_REGISTRY"),
          );
          await assert.rejects(
            () =>
              auth.register({
                username: "wrong-registry",
                password: "Secret123!",
                mssv: identity.studentCode,
                email: "wrong@example.test",
              }),
            code("STUDENT_IDENTITY_MISMATCH"),
          );
          const result = await auth.register({
            username: "registry-student",
            password: "Secret123!",
            mssv: "registry001",
            email: "REGISTRY.AUTHORITY@EXAMPLE.TEST",
            role: "ADMIN",
            gender: "MALE",
          });
          assert.equal(result.user.role, "STUDENT");
          assert.equal(result.user.fullName, identity.fullName);
          const createdStudent = await r.students.findByUserId(result.user.id);
          assert.equal(createdStudent.mssv, "REGISTRY001");
          assert.equal(createdStudent.gender, "FEMALE");
          const claimed = await r.registry.findById(identity.id);
          assert.equal(claimed.status, "CLAIMED");
          assert.equal(claimed.claimedUserId, result.user.id);
          await assert.rejects(
            () =>
              auth.register({
                username: "registry-second",
                password: "Secret123!",
                mssv: identity.studentCode,
                email: identity.email,
              }),
            code("STUDENT_REGISTRY_ALREADY_CLAIMED"),
          );

          const disabled = await r.registry.create({
            studentCode: "DISABLED001",
            fullName: "Disabled",
            email: "disabled@example.test",
            gender: "MALE",
          });
          await r.registry.setAvailability(disabled.id, "DISABLED");
          await assert.rejects(
            () =>
              auth.register({
                username: "disabled-student",
                password: "Secret123!",
                mssv: disabled.studentCode,
                email: disabled.email,
              }),
            code("STUDENT_REGISTRY_DISABLED"),
          );
          const existing = await student();
          const duplicateCode = await r.registry.create({
            studentCode: existing.student.mssv,
            fullName: "Duplicate code",
            email: "duplicate-code@example.test",
            gender: "MALE",
          });
          await assert.rejects(
            () =>
              auth.register({
                username: "duplicate-code",
                password: "Secret123!",
                mssv: duplicateCode.studentCode,
                email: duplicateCode.email,
              }),
            code("STUDENT_CODE_ALREADY_EXISTS"),
          );
          const emailOwner = await r.users.create(
            userData("email-owner", "owned@example.test"),
          );
          assert.ok(emailOwner.id);
          const duplicateEmail = await r.registry.create({
            studentCode: "EMAILDUP001",
            fullName: "Duplicate email",
            email: "owned@example.test",
            gender: "MALE",
          });
          await assert.rejects(
            () =>
              auth.register({
                username: "duplicate-email",
                password: "Secret123!",
                mssv: duplicateEmail.studentCode,
                email: duplicateEmail.email,
              }),
            code("EMAIL_ALREADY_EXISTS"),
          );
        },
      );
      await t.test(
        "concurrent registry claim has exactly one winner",
        async () => {
          const identity = await r.registry.create({
            studentCode: "CLAIMRACE001",
            fullName: "Claim Race",
            email: "claim.race@example.test",
            gender: "MALE",
          });
          const results = await Promise.allSettled([
            auth.register({
              username: "claim-race-a",
              password: "Secret123!",
              mssv: identity.studentCode,
              email: identity.email,
            }),
            auth.register({
              username: "claim-race-b",
              password: "Secret123!",
              mssv: identity.studentCode,
              email: identity.email,
            }),
          ]);
          assert.equal(
            results.filter((item) => item.status === "fulfilled").length,
            1,
          );
          assert.equal(
            results.filter((item) => item.status === "rejected").length,
            1,
          );
          assert.equal(
            (await r.registry.findById(identity.id)).status,
            "CLAIMED",
          );
          assert.equal(
            (
              await pool.query("SELECT count(*) FROM students WHERE mssv=$1", [
                identity.studentCode,
              ])
            ).rows[0].count,
            "1",
          );
          assert.equal(
            (
              await pool.query(
                "SELECT count(*) FROM users WHERE username IN ('claim-race-a','claim-race-b')",
              )
            ).rows[0].count,
            "1",
          );
        },
      );
      await t.test(
        "refresh sessions rotate, revoke and never store raw tokens",
        async () => {
          const account = await student();
          const password = "SessionSecret123!";
          await r.users.updatePassword(
            account.user.id,
            await hasher.hash(password),
          );
          const login = await auth.login(account.user.username, password, {
            userAgent: "integration-test",
          });
          const payload = tokens.verifyRefreshToken(login.refreshToken);
          const stored = (
            await pool.query("SELECT * FROM refresh_sessions WHERE id=$1", [
              payload.sessionId,
            ])
          ).rows[0];
          assert.notEqual(stored.token_hash, login.refreshToken);
          assert.equal(stored.token_hash.length, 64);
          const rotations = await Promise.allSettled([
            auth.refresh(login.refreshToken),
            auth.refresh(login.refreshToken),
          ]);
          assert.equal(
            rotations.filter((item) => item.status === "fulfilled").length,
            1,
          );
          const rotated = rotations.find(
            (item) => item.status === "fulfilled",
          ).value;
          await assert.rejects(
            () => auth.refresh(login.refreshToken),
            code("REFRESH_TOKEN_REVOKED"),
          );
          const secondRotation = await auth.refresh(rotated.refreshToken);
          await auth.logout(secondRotation.refreshToken);
          await auth.logout(secondRotation.refreshToken);
          await assert.rejects(
            () => auth.refresh(secondRotation.refreshToken),
            code("REFRESH_TOKEN_REVOKED"),
          );

          const expiring = await auth.login(account.user.username, password);
          const expiringPayload = tokens.verifyRefreshToken(
            expiring.refreshToken,
          );
          await pool.query(
            "UPDATE refresh_sessions SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE id=$1",
            [expiringPayload.sessionId],
          );
          await assert.rejects(
            () => auth.refresh(expiring.refreshToken),
            code("REFRESH_TOKEN_REVOKED"),
          );

          const locked = await auth.login(account.user.username, password);
          const { AdminStudentService } =
            await import("../dist/services/admin/student.service.js");
          const adminStudents = new AdminStudentService(
            r.students,
            r.users,
            r.sessions,
            tx,
          );
          await adminStudents.accountStatus(account.student.id, "LOCKED");
          await assert.rejects(() => auth.refresh(locked.refreshToken));
          await assert.rejects(
            () => auth.login(account.user.username, password),
            code("FORBIDDEN"),
          );
          await adminStudents.accountStatus(account.student.id, "ACTIVE");

          const { StudentProfileService } =
            await import("../dist/services/student-profile.service.js");
          const profile = new StudentProfileService(
            r.users,
            r.students,
            tx,
            hasher,
            r.sessions,
          );
          const existingProfile = await profile.getProfile(account.user.id);
          assert.equal(existingProfile.mssv, account.student.mssv);
          const passwordSession = await auth.login(
            account.user.username,
            password,
          );
          await profile.changePassword(
            account.user.id,
            password,
            "NewSessionSecret123!",
          );
          await assert.rejects(
            () => auth.refresh(passwordSession.refreshToken),
            code("REFRESH_TOKEN_REVOKED"),
          );
          const relogin = await auth.login(
            account.user.username,
            "NewSessionSecret123!",
          );
          assert.ok(await auth.refresh(relogin.refreshToken));
        },
      );
      await t.test(
        "two concurrent same-bed approvals have one winner and consistent occupancy",
        async () => {
          const target = await room(1),
            bed = (await r.beds.findByRoomId(target.id))[0],
            a = await student(),
            b = await student();
          const input = {
            bedId: bed.id,
            roomId: target.id,
            startDate: new Date("2026-01-01"),
            endDate: new Date("2027-01-01"),
            status: "PENDING",
            roomPricePerMonthSnapshot: 1_800_000,
          };
          const ca = await r.contracts.create({
              ...input,
              studentId: a.student.id,
            }),
            cb = await r.contracts.create({
              ...input,
              studentId: b.student.id,
            });
          const result = await Promise.allSettled([
            contracts.approveContract(ca.id, admin.id),
            contracts.approveContract(cb.id, admin.id),
          ]);
          assert.equal(
            result.filter((x) => x.status === "fulfilled").length,
            1,
          );
          assert.equal((await r.beds.findById(bed.id)).status, "OCCUPIED");
          assert.equal((await r.rooms.findById(target.id)).status, "FULL");
          assert.equal(
            (
              await pool.query(
                "SELECT count(*) FROM contracts WHERE bed_id=$1 AND status='ACTIVE'",
                [bed.id],
              )
            ).rows[0].count,
            "1",
          );
        },
      );
      await t.test(
        "room change, checkout and residence history use real relations",
        async () => {
          const old = await room(1),
            target = await room(1),
            a = await resident(old),
            bed = (await r.beds.findByRoomId(target.id))[0];
          const request = await changes.createRequest(a.user.id, {
            targetBedId: bed.id,
          });
          await changes.approveRequest(request.id, admin.id);
          assert.equal(
            (await r.contracts.findById(a.contract.id)).status,
            "ENDED",
          );
          assert.equal((await r.beds.findById(a.bed.id)).status, "EMPTY");
          assert.equal((await r.rooms.findById(old.id)).status, "AVAILABLE");
          const current = await r.contracts.findActiveByStudentId(a.student.id);
          assert.equal(current.bedId, bed.id);
          const out = await checkout.create(a.user.id);
          await checkout.approve(out.id, admin.id);
          assert.equal(
            (await r.contracts.findById(current.id)).status,
            "ENDED",
          );
          assert.equal((await r.beds.findById(bed.id)).status, "EMPTY");
          const history = await r.contracts.findResidenceHistoryByStudentId(
            a.student.id,
          );
          assert.equal(history.length, 2);
          assert.ok(history.every((x) => x.consistencyIssues.length === 0));
        },
      );
      await t.test(
        "checkout creation racing contract close leaves no stale pending request",
        async () => {
          const target = await room(1),
            a = await resident(target);
          const results = await Promise.allSettled([
            checkout.create(a.user.id),
            contracts.endContract(a.contract.id, admin.id),
          ]);
          if (results[1].status === "rejected")
            await contracts.endContract(a.contract.id, admin.id);
          assert.equal(
            (await r.contracts.findById(a.contract.id)).status,
            "ENDED",
          );
          assert.equal(
            await r.checkouts.findPendingByStudentId(a.student.id),
            null,
          );
        },
      );
      await t.test(
        "different beds in the same room synchronize FULL status",
        async () => {
          const target = await room(),
            [bedA, bedB] = await r.beds.findByRoomId(target.id),
            a = await student(),
            b = await student();
          await Promise.all([
            contracts.adminCreateContract(admin.id, {
              studentId: a.student.id,
              bedId: bedA.id,
            }),
            contracts.adminCreateContract(admin.id, {
              studentId: b.student.id,
              bedId: bedB.id,
            }),
          ]);
          assert.equal((await r.rooms.findById(target.id)).status, "FULL");
        },
      );
      await t.test(
        "FINALIZE creates official reading, invoices and items; cancel keeps consumed history",
        async () => {
          const target = await room();
          const a = await resident(target);
          await resident(target);
          const d = await draft(target, "2026-08");
          const preview = await billing().preview(d.id);
          assert.equal(preview.residents.length, 2);
          assert.ok(preview.residents.every((x) => x.roomFee === 1200000));
          const done = await billing().finalize(d.id, admin.id);
          assert.equal(done.status, "FINALIZED");
          assert.equal(done.invoices.length, 2);
          const reading = await r.readings.findByRoomAndPeriod(
            target.id,
            "2026-08",
          );
          assert.equal(reading.monthlyBillingId, d.id);
          assert.equal(done.utilityReadingId, reading.id);
          await assert.rejects(
            () =>
              pool.query(
                `INSERT INTO monthly_billings(room_id,billing_period,draft_electricity_previous,draft_electricity_current,draft_water_previous,draft_water_current) VALUES ($1,$2,0,10,0,10)`,
                [target.id, "2026-08"],
              ),
            (e) =>
              e.code === "23505" &&
              e.constraint === "uq_monthly_billings_room_period" &&
              translatePostgresError(e).code ===
                "MONTHLY_BILLING_ALREADY_EXISTS",
          );
          await assert.rejects(
            () =>
              pool.query(
                `INSERT INTO utility_readings(room_id,billing_period,electricity_previous,electricity_current,electricity_usage,electricity_unit_price,electricity_amount,water_previous,water_current,water_usage,water_unit_price,water_amount,recorded_by,monthly_billing_id) SELECT room_id,billing_period,electricity_previous,electricity_current,electricity_usage,electricity_unit_price,electricity_amount,water_previous,water_current,water_usage,water_unit_price,water_amount,recorded_by,monthly_billing_id FROM utility_readings WHERE id=$1`,
                [reading.id],
              ),
            (e) =>
              e.code === "23505" &&
              e.constraint === "uq_utility_readings_room_period" &&
              translatePostgresError(e).code ===
                "UTILITY_READING_ALREADY_EXISTS",
          );
          const invoices = await r.invoices.findByMonthlyBilling(d.id);
          assert.equal(
            invoices.reduce((sum, x) => sum + x.totalAmount, 0),
            done.totalInvoiceAmount,
          );
          assert.equal((await r.invoices.findItems(invoices[0].id)).length, 5);
          const other = await student();
          assert.equal(
            await r.invoices.findByIdForStudent(
              invoices[0].id,
              other.student.id,
            ),
            null,
          );
          await billing().cancel(d.id, admin.id, "test cancellation");
          assert.ok(
            (await r.invoices.findByMonthlyBilling(d.id)).every(
              (x) => x.status === "CANCELLED",
            ),
          );
          assert.equal(
            (await r.cursors.findByRoom(target.id))
              .latestFinalizedBillingPeriod,
            "2026-08",
          );
          await assert.rejects(
            () => draft(target, "2026-08"),
            code("MONTHLY_BILLING_CANCELLED"),
          );
        },
      );
      await t.test(
        "billing preserves the contract price after RoomType price changes",
        async () => {
          const agreedPrice = 1_350_000;
          const changedPrice = 2_750_000;
          const historicalType = await r.types.create({
            name: "Historical price " + ++serial,
            capacity: 1,
            pricePerMonth: agreedPrice,
          });
          const target = await roomService.create({
            buildingId: building.id,
            roomTypeId: historicalType.id,
            roomNumber: "HIST" + ++serial,
            floor: 1,
          });
          const account = await resident(target);
          assert.equal(account.contract.roomPricePerMonthSnapshot, agreedPrice);
          await r.types.update(historicalType.id, {
            pricePerMonth: changedPrice,
          });
          const billingDraft = await draft(target, "2026-09", 0);
          const preview = await billing().preview(billingDraft.id);
          assert.equal(
            preview.residents[0].roomPricePerMonthSnapshot,
            agreedPrice,
          );
          assert.equal(preview.residents[0].roomFee, agreedPrice);
          const finalized = await billing().finalize(billingDraft.id, admin.id);
          assert.equal(finalized.invoices[0].roomMonthlyPrice, agreedPrice);
        },
      );
      await t.test(
        "failure during FINALIZE rolls back reading, invoices, billing and cursor",
        async () => {
          const target = await room();
          await resident(target);
          const d = await draft(target, "2026-07");
          const failing = new Proxy(r.invoices, {
            get(obj, key) {
              return key === "createItems"
                ? async () => {
                    throw new Error("fail items");
                  }
                : typeof obj[key] === "function"
                  ? obj[key].bind(obj)
                  : obj[key];
            },
          });
          await assert.rejects(
            () => billing(failing).finalize(d.id, admin.id),
            /fail items/,
          );
          assert.equal(await r.readings.findLatestByRoom(target.id), null);
          assert.equal((await r.billings.findById(d.id)).status, "DRAFT");
          assert.equal(
            (await r.cursors.findByRoom(target.id))
              .latestFinalizedBillingPeriod,
            null,
          );
          assert.deepEqual(await r.invoices.findByMonthlyBilling(d.id), []);
        },
      );
      await t.test(
        "concurrent September/October FINALIZE serializes cursor and meter chain",
        async () => {
          const target = await room();
          await resident(target);
          let d = await draft(target, "2026-08", 10);
          await billing().finalize(d.id, admin.id);
          const base = {
            roomId: target.id,
            electricityCurrent: 20,
            waterCurrent: 20,
          };
          const sept = await billing().saveDraft(
            { ...base, billingPeriod: "2026-09" },
            new Date("2026-12-15"),
          );
          const oct = await billing().saveDraft(
            {
              ...base,
              billingPeriod: "2026-10",
              electricityCurrent: 30,
              waterCurrent: 30,
            },
            new Date("2026-12-15"),
          );
          const results = await Promise.allSettled([
            billing().finalize(sept.id, admin.id),
            billing().finalize(oct.id, admin.id),
          ]);
          assert.ok(results.some((x) => x.status === "fulfilled"));
          const chain = (await r.readings.findByRoom(target.id)).reverse();
          for (let i = 1; i < chain.length; i++) {
            assert.equal(
              chain[i].electricityPrevious,
              chain[i - 1].electricityCurrent,
            );
            assert.equal(chain[i].waterPrevious, chain[i - 1].waterCurrent);
          }
          assert.equal(
            (await r.cursors.findByRoom(target.id))
              .latestFinalizedBillingPeriod,
            chain.at(-1).billingPeriod,
          );
        },
      );
      await t.test(
        "concurrent finalize of one draft commits exactly one invoice batch",
        async () => {
          const target = await room();
          await resident(target);
          const d = await draft(target, "2026-06");
          const result = await Promise.allSettled([
            billing().finalize(d.id, admin.id),
            billing().finalize(d.id, admin.id),
          ]);
          assert.equal(
            result.filter((x) => x.status === "fulfilled").length,
            1,
          );
          assert.equal((await r.invoices.findByMonthlyBilling(d.id)).length, 1);
          assert.equal((await r.readings.findByRoom(target.id)).length, 1);
        },
      );
      await t.test(
        "notifications, schedules, recommendations, equipment and maintenance persist",
        async () => {
          const target = await room(),
            a = await resident(target);
          const entries = [
            { dayOfWeek: "MONDAY", startPeriod: 1, endPeriod: 3 },
            { dayOfWeek: "FRIDAY", startPeriod: 6, endPeriod: 9 },
          ];
          await r.schedules.upsert(a.student.id, entries);
          await r.schedules.upsert(a.student.id, entries);
          assert.deepEqual(
            (await r.schedules.findByStudentId(a.student.id)).entries,
            entries,
          );
          await r.preferences.upsert(a.student.id, {
            pricePreference: "LOW",
            wantsHotWater: true,
          });
          assert.equal(
            (await r.preferences.findByStudentId(a.student.id)).wantsHotWater,
            true,
          );
          const category = await r.categories.create({
              name: "Bình nóng lạnh",
              unit: "cái",
            }),
            equipment = await r.equipment.create({
              roomId: target.id,
              categoryId: category.id,
              condition: "GOOD",
            });
          const candidate = (
            await r.recommendations.findCandidates("MALE")
          ).find((x) => x.room.id === target.id);
          assert.equal(candidate.hasHotWater, true);
          assert.equal(candidate.room.pricePerMonth, 1200000);
          assert.deepEqual(candidate.residentSchedules, [entries]);
          const notification = await r.notifications.create({
            title: "Test",
            content: "Notice",
            targetScope: "SPECIFIC_STUDENT",
            targetStudentId: a.student.id,
            createdBy: admin.id,
          });
          await r.recipients.createMany([
            { notificationId: notification.id, studentId: a.student.id },
          ]);
          await r.recipients.markAsRead(notification.id, a.student.id);
          assert.equal(
            await r.recipients.countReadByNotificationId(notification.id),
            1,
          );
          const request = await r.maintenance.create({
            studentId: a.student.id,
            roomId: target.id,
            equipmentItemId: equipment.id,
            category: "APPLIANCE",
            description: "Repair",
          });
          assert.equal(request.status, "PENDING");
          assert.equal(
            (
              await r.maintenance.findAll({
                page: 1,
                limit: 20,
                roomId: target.id,
              })
            ).pagination.total,
            1,
          );
          assert.ok(
            (
              await r.students.search({
                page: 1,
                limit: 20,
                search: a.student.mssv,
              })
            ).items.length > 0,
          );
          assert.ok(
            (
              await r.equipment.findAll({
                page: 1,
                limit: 20,
                roomId: target.id,
              })
            ).items.length > 0,
          );
        },
      );
      await t.test(
        "HTTP auth cookie rotation, UUID validation and authorization",
        async () => {
          server = app.listen(0, "127.0.0.1");
          await new Promise((resolve) => server.once("listening", resolve));
          const base = `http://127.0.0.1:${server.address().port}/api/v1`;
          const post = (path, data, token) =>
            fetch(base + path, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                ...(token ? { authorization: "Bearer " + token } : {}),
              },
              body: JSON.stringify(data),
            });
          await r.registry.create({
            studentCode: "HTTP001",
            fullName: "HTTP Student",
            email: "http@example.test",
            gender: "MALE",
          });
          let response = await post("/auth/register", {
            username: "http-student",
            password: "Secret123!",
            mssv: "HTTP001",
            email: "http@example.test",
          });
          assert.equal(response.status, 201);
          const registered = await response.json();
          response = await post("/auth/login", {
            username: "http-student",
            password: "Secret123!",
          });
          assert.equal(response.status, 200);
          const login = await response.json();
          const token = login.data.accessToken;
          assert.equal(login.data.refreshToken, undefined);
          const loginCookie = response.headers.get("set-cookie");
          response = await fetch(base + "/auth/refresh-token", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              cookie: loginCookie,
            },
            body: "{}",
          });
          assert.equal(response.status, 200);
          assert.ok((await response.json()).data.accessToken);
          const rotatedCookie = response.headers.get("set-cookie");
          response = await fetch(base + "/auth/me", {
            headers: { authorization: "Bearer " + token },
          });
          assert.equal(response.status, 200);
          await pool.query("UPDATE users SET status='LOCKED' WHERE id=$1", [
            registered.data.user.id,
          ]);
          response = await post("/auth/login", {
            username: "http-student",
            password: "Secret123!",
          });
          assert.equal(response.status, 403);
          response = await fetch(base + "/auth/refresh-token", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              cookie: rotatedCookie,
            },
            body: "{}",
          });
          assert.equal(response.status, 403);
          response = await fetch(base + "/student/invoices/me", {
            headers: { authorization: "Bearer " + token },
          });
          assert.equal(response.status, 403);
          await pool.query("UPDATE users SET status='ACTIVE' WHERE id=$1", [
            registered.data.user.id,
          ]);
          response = await post("/auth/register", {
            username: "http-second",
            password: "Secret123!",
            mssv: "HTTP002",
            email: "http@example.test",
          });
          assert.equal(response.status, 404);
          assert.equal((await response.json()).code, "STUDENT_NOT_IN_REGISTRY");
          response = await fetch(base + "/admin/buildings", {
            headers: { authorization: "Bearer " + token },
          });
          assert.equal(response.status, 403);
          response = await fetch(base + "/admin/student-registry");
          assert.equal(response.status, 401);
          response = await fetch(base + "/admin/student-registry", {
            headers: { authorization: "Bearer " + token },
          });
          assert.equal(response.status, 403);
          const adminToken = tokens.generateAccessToken({
            userId: admin.id,
            role: "ADMIN",
          });
          response = await fetch(base + "/admin/student-registry", {
            headers: {
              authorization: "Bearer " + adminToken,
              origin: "http://localhost:5173",
            },
          });
          assert.equal(response.status, 200);
          assert.equal(
            response.headers.get("access-control-allow-origin"),
            "http://localhost:5173",
          );
          assert.equal(
            response.headers.get("access-control-allow-credentials"),
            "true",
          );
          response = await fetch(
            base + "/admin/rooms/507f1f77bcf86cd799439011",
            { headers: { authorization: "Bearer " + adminToken } },
          );
          assert.equal(response.status, 400);
          response = await fetch(base + "/admin/dashboard/summary", {
            headers: { authorization: "Bearer " + adminToken },
          });
          assert.equal(response.status, 200);
          const old = tokens.generateAccessToken({
            userId: "507f1f77bcf86cd799439011",
            role: "ADMIN",
          });
          assert.throws(
            () => tokens.verifyAccessToken(old),
            code("INVALID_TOKEN"),
          );
          assert.ok(registered.data.user.id);
        },
      );
      await t.test("facility deletion and capacity restrictions", async () => {
        const bs = new BuildingService(r.buildings, r.rooms, tx),
          ts = roomTypeService;
        await assert.rejects(
          () => bs.delete(building.id),
          code("BUILDING_HAS_ROOMS"),
        );
        await assert.rejects(
          () => ts.delete(type.id),
          code("ROOM_TYPE_IS_USED"),
        );
        await assert.rejects(
          () => ts.update(type.id, { capacity: 99 }),
          code("ROOM_TYPE_CAPACITY_IN_USE"),
        );
        const empty = await room();
        assert.equal((await r.beds.findByRoomId(empty.id)).length, 2);
        await roomService.delete(empty.id);
        assert.equal(await r.rooms.findById(empty.id), null);
        const occupied = await room();
        await resident(occupied);
        await assert.rejects(
          () => roomService.delete(occupied.id),
          code("ROOM_HAS_OCCUPIED_BEDS"),
        );
        const equipped = await room();
        const category = await r.categories.create({
          name: "Audit equipment",
          unit: "piece",
        });
        await r.equipment.create({
          roomId: equipped.id,
          categoryId: category.id,
          condition: "GOOD",
        });
        await assert.rejects(
          () => roomService.delete(equipped.id),
          code("ROOM_HAS_EQUIPMENT"),
        );
      });
      await t.test(
        "building gender update uses ACTIVE contracts only and is atomic",
        async () => {
          const bs = new BuildingService(r.buildings, r.rooms, tx);
          const createBuildingRoom = async (allowedGender, prefix) => {
            const targetBuilding = await r.buildings.create({
              name: `${prefix} building ${++serial}`,
              allowedGender,
            });
            const targetRoom = await roomService.create({
              buildingId: targetBuilding.id,
              roomTypeId: type.id,
              roomNumber: `${prefix}${++serial}`,
              floor: 1,
            });
            return { targetBuilding, targetRoom };
          };

          const activeCase = await createBuildingRoom("MALE", "GACTIVE");
          const activeResident = await student();
          const activeBed = (
            await r.beds.findByRoomId(activeCase.targetRoom.id)
          )[0];
          const activeContract = await contracts.adminCreateContract(admin.id, {
            studentId: activeResident.student.id,
            bedId: activeBed.id,
          });
          await assert.rejects(
            () =>
              bs.update(activeCase.targetBuilding.id, {
                name: "must not persist",
                allowedGender: "FEMALE",
              }),
            code("BUILDING_GENDER_CONFLICT_WITH_RESIDENTS"),
          );
          let persisted = await r.buildings.findById(
            activeCase.targetBuilding.id,
          );
          assert.equal(persisted.name, activeCase.targetBuilding.name);
          assert.equal(persisted.allowedGender, "MALE");

          await contracts.endContract(activeContract.id, admin.id);
          persisted = await bs.update(activeCase.targetBuilding.id, {
            allowedGender: "FEMALE",
          });
          assert.equal(persisted.allowedGender, "FEMALE");

          const cancelledCase = await createBuildingRoom("MIXED", "GCANCEL");
          const cancelledResident = await student();
          const cancelledBed = (
            await r.beds.findByRoomId(cancelledCase.targetRoom.id)
          )[0];
          const cancelled = await contracts.adminCreateContract(admin.id, {
            studentId: cancelledResident.student.id,
            bedId: cancelledBed.id,
          });
          await contracts.cancelActiveContract(
            cancelled.id,
            admin.id,
            "integration test",
          );
          assert.equal(
            (
              await bs.update(cancelledCase.targetBuilding.id, {
                allowedGender: "FEMALE",
              })
            ).allowedGender,
            "FEMALE",
          );

          for (const [status, prefix] of [
            ["PENDING", "GPENDING"],
            ["REJECTED", "GREJECTED"],
          ]) {
            const statusCase = await createBuildingRoom("MIXED", prefix);
            const account = await student();
            const bed = (
              await r.beds.findByRoomId(statusCase.targetRoom.id)
            )[0];
            const pending = await contracts.createContract(account.user.id, {
              bedId: bed.id,
            });
            if (status === "REJECTED")
              await contracts.rejectContract(pending.id, admin.id, "test");
            assert.equal(
              (
                await bs.update(statusCase.targetBuilding.id, {
                  allowedGender: "FEMALE",
                })
              ).allowedGender,
              "FEMALE",
            );
          }
        },
      );
      await t.test(
        "building mutation serializes with every ACTIVE placement path",
        async () => {
          const proxy = (target, methods) =>
            new Proxy(target, {
              get(object, key) {
                if (key in methods) return methods[key];
                const value = object[key];
                return typeof value === "function" ? value.bind(object) : value;
              },
            });
          const createBuildingRoom = async (prefix) => {
            const targetBuilding = await r.buildings.create({
              name: `${prefix} building ${++serial}`,
              allowedGender: "MIXED",
            });
            const targetRoom = await roomService.create({
              buildingId: targetBuilding.id,
              roomTypeId: type.id,
              roomNumber: `${prefix}${++serial}`,
              floor: 1,
            });
            return { targetBuilding, targetRoom };
          };
          const runRace = async (label, preparePlacement) => {
            for (const placementFirst of [true, false]) {
              const target = await createBuildingRoom(
                `${label}${placementFirst}`,
              );
              const lockHeld = deferred();
              const releasePlacement = deferred();
              const mutationAttempted = deferred();
              let firstPid, secondPid;
              const lock = (first) => async (id, context) => {
                await query("SET LOCAL lock_timeout = '8s'", [], context);
                const pid = (
                  await query("SELECT pg_backend_pid() AS pid", [], context)
                ).rows[0].pid;
                if (first) firstPid = pid;
                else {
                  secondPid = pid;
                  mutationAttempted.resolve();
                }
                const row = await r.buildings.findByIdForUpdate(id, context);
                if (first) {
                  lockHeld.resolve();
                  await releasePlacement.promise;
                }
                return row;
              };
              const placementBuildings = proxy(r.buildings, {
                findByIdForUpdate: lock(placementFirst),
              });
              const mutationBuildings = proxy(r.buildings, {
                findByIdForUpdate: lock(!placementFirst),
              });
              const placement = await preparePlacement(
                target,
                placementBuildings,
              );
              const snapshot = async () =>
                (
                  await pool.query(
                    `SELECT jsonb_build_object(
                'contracts', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM contracts c WHERE student_id=$1),
                'requests', (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM room_change_requests r WHERE student_id=$1),
                'student', (SELECT to_jsonb(s) FROM students s WHERE id=$1),
                'beds', (SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM beds b WHERE room_id=$2 OR id IN (SELECT bed_id FROM contracts WHERE student_id=$1))) AS state`,
                    [placement.studentId, target.targetRoom.id],
                  )
                ).rows[0].state;
              const before = await snapshot();
              const mutation = () =>
                new BuildingService(mutationBuildings, r.rooms, tx).update(
                  target.targetBuilding.id,
                  { allowedGender: "FEMALE" },
                );
              const outcome = (start) =>
                start().then(
                  (value) => ({ value }),
                  (error) => ({ error }),
                );
              const first = outcome(
                placementFirst ? placement.start : mutation,
              );
              let second;
              try {
                await Promise.race([
                  lockHeld.promise,
                  first.then(() => {
                    throw new Error("First writer did not hold Building");
                  }),
                ]);
                second = outcome(placementFirst ? mutation : placement.start);
                await Promise.race([
                  mutationAttempted.promise,
                  second.then(() => {
                    throw new Error("Second writer did not attempt Building");
                  }),
                ]);
                assert.notEqual(
                  firstPid,
                  secondPid,
                  "writers must use separate connections",
                );
                const deadline = Date.now() + 5000;
                while (
                  !(
                    await pool.query(
                      "SELECT $1::integer = ANY(pg_blocking_pids($2::integer)) AS blocked",
                      [firstPid, secondPid],
                    )
                  ).rows[0].blocked
                ) {
                  assert.ok(
                    Date.now() < deadline,
                    "second writer must actually block behind first",
                  );
                  await new Promise((resolve) => setTimeout(resolve, 10));
                }
              } finally {
                releasePlacement.resolve();
                await Promise.all([first, second]);
              }
              const firstResult = await first,
                secondResult = await second;
              assert.equal(firstResult.error, undefined);
              assert.ok(
                code(
                  placementFirst
                    ? "BUILDING_GENDER_CONFLICT_WITH_RESIDENTS"
                    : "BUILDING_GENDER_NOT_ALLOWED",
                )(secondResult.error),
              );
              const finalBuilding = await r.buildings.findById(
                target.targetBuilding.id,
              );
              const active = await r.contracts.findActiveByStudentId(
                placement.studentId,
              );
              assert.equal(
                finalBuilding.allowedGender,
                placementFirst ? "MIXED" : "FEMALE",
              );
              if (placementFirst)
                assert.equal(active.roomId, target.targetRoom.id);
              else
                assert.deepEqual(
                  await snapshot(),
                  before,
                  "rejected placement must not change residence data",
                );
              assert.equal(
                Number(
                  (
                    await pool.query(
                      `SELECT count(*) FROM contracts c JOIN rooms r ON r.id=c.room_id JOIN buildings b ON b.id=r.building_id JOIN students s ON s.id=c.student_id
               WHERE c.status='ACTIVE' AND b.allowed_gender<>'MIXED' AND (s.gender IS NULL OR s.gender<>b.allowed_gender)`,
                    )
                  ).rows[0].count,
                ),
                0,
              );
            }
          };

          await runRace("RACEAPPROVE", async (target, buildingsRepo) => {
            const account = await student();
            const bed = (await r.beds.findByRoomId(target.targetRoom.id))[0];
            const pending = await contracts.createContract(account.user.id, {
              bedId: bed.id,
            });
            const service = new ContractService(
              r.contracts,
              r.students,
              r.beds,
              r.rooms,
              tx,
              r.checkouts,
              r.types,
              buildingsRepo,
            );
            return {
              studentId: account.student.id,
              start: () => service.approveContract(pending.id, admin.id),
            };
          });

          await runRace("RACEDIRECT", async (target, buildingsRepo) => {
            const account = await student();
            const bed = (await r.beds.findByRoomId(target.targetRoom.id))[0];
            const service = new ContractService(
              r.contracts,
              r.students,
              r.beds,
              r.rooms,
              tx,
              r.checkouts,
              r.types,
              buildingsRepo,
            );
            return {
              studentId: account.student.id,
              start: () =>
                service.adminCreateContract(admin.id, {
                  studentId: account.student.id,
                  bedId: bed.id,
                }),
            };
          });

          await runRace("RACEMOVE", async (target, buildingsRepo) => {
            const origin = await room();
            const account = await resident(origin);
            const bed = (await r.beds.findByRoomId(target.targetRoom.id))[0];
            const request = await changes.createRequest(account.user.id, {
              targetBedId: bed.id,
            });
            const service = new RoomChangeRequestService(
              r.changes,
              r.contracts,
              r.students,
              r.beds,
              r.rooms,
              tx,
              r.checkouts,
              r.types,
              buildingsRepo,
            );
            return {
              studentId: account.student.id,
              start: () => service.approveRequest(request.id, admin.id),
            };
          });
        },
      );
      await t.test(
        "seeds preserve existing Building policy and resident gender on conflict",
        async () => {
          const { spawnSync } = await import("node:child_process");
          requireTestDatabase(url);
          const seed = (file) =>
            spawnSync(
              process.execPath,
              ["--import", "tsx", `scripts/${file}.ts`],
              {
                encoding: "utf8",
                timeout: 20000,
                env: {
                  ...process.env,
                  NODE_ENV: "test",
                  DATABASE_URL: url,
                  TEST_DATABASE_URL: url,
                  DATABASE_URL_SOURCE: "TEST_DATABASE_URL",
                  ADMIN_USERNAME: admin.username,
                },
              },
            );
          const seededBuilding = await r.buildings.create({
            name: "Tòa A",
            allowedGender: "MIXED",
          });
          const seededRoom = await roomService.create({
            buildingId: seededBuilding.id,
            roomTypeId: type.id,
            roomNumber: "SEED-CONFLICT",
            floor: 1,
          });
          const user = await r.users.create(
            userData("demom001", "seed.gender@example.test"),
          );
          const seededStudent = await r.students.create({
            userId: user.id,
            mssv: "DM001",
            gender: "FEMALE",
          });
          const seededBed = (await r.beds.findByRoomId(seededRoom.id))[0];
          const active = await contracts.adminCreateContract(admin.id, {
            studentId: seededStudent.id,
            bedId: seededBed.id,
          });
          const state = async () => ({
            building: await r.buildings.findById(seededBuilding.id),
            student: await r.students.findById(seededStudent.id),
            contract: await r.contracts.findById(active.id),
            bed: await r.beds.findById(seededBed.id),
          });
          const before = await state();
          const dormitorySeed = seed("seed-dormitory-data");
          assert.equal(
            dormitorySeed.status,
            1,
            "dormitory seed must reject conflicting policy",
          );
          assert.match(
            dormitorySeed.stderr,
            /BUILDING_GENDER_CONFLICT_WITH_RESIDENTS/,
          );
          assert.deepEqual(await state(), before);

          const maleBuilding = await r.buildings.create({
            name: "Seed male zone",
            allowedGender: "MALE",
          });
          await roomService.create({
            buildingId: maleBuilding.id,
            roomTypeId: type.id,
            roomNumber: "SEED-MALE",
            floor: 1,
          });
          const demoSeed = seed("seed-demo-students");
          assert.equal(
            demoSeed.status,
            1,
            "student seed must reject existing gender mismatch",
          );
          assert.match(
            demoSeed.stderr,
            /Existing demom001 has a different gender/,
          );
          assert.deepEqual(await state(), before);
        },
      );
      await t.test(
        "all contract creation paths capture price at their defined business moment",
        async () => {
          const createPricedRoom = async (price, prefix) => {
            const roomType = await r.types.create({
              name: `${prefix} type ${++serial}`,
              capacity: 1,
              pricePerMonth: price,
            });
            const target = await roomService.create({
              buildingId: building.id,
              roomTypeId: roomType.id,
              roomNumber: `${prefix}${++serial}`,
              floor: 1,
            });
            return { roomType, target };
          };

          const requested = await createPricedRoom(1_100_000, "REQ");
          const requester = await student();
          const requestedBed = (
            await r.beds.findByRoomId(requested.target.id)
          )[0];
          const pending = await contracts.createContract(requester.user.id, {
            bedId: requestedBed.id,
          });
          await r.types.update(requested.roomType.id, {
            pricePerMonth: 1_300_000,
          });
          await contracts.approveContract(pending.id, admin.id);
          assert.equal(
            (await r.contracts.findById(pending.id)).roomPricePerMonthSnapshot,
            1_100_000,
          );

          const changed = await createPricedRoom(1_500_000, "MOVE");
          const changedBed = (await r.beds.findByRoomId(changed.target.id))[0];
          const changeRequest = await changes.createRequest(requester.user.id, {
            targetBedId: changedBed.id,
          });
          await r.types.update(changed.roomType.id, {
            pricePerMonth: 1_700_000,
          });
          await changes.approveRequest(changeRequest.id, admin.id);
          assert.equal(
            (await r.contracts.findActiveByStudentId(requester.student.id))
              .roomPricePerMonthSnapshot,
            1_700_000,
          );

          const direct = await createPricedRoom(2_000_000, "ADM");
          const directStudent = await student();
          const directBed = (await r.beds.findByRoomId(direct.target.id))[0];
          await r.types.update(direct.roomType.id, {
            pricePerMonth: 2_200_000,
          });
          const directContract = await contracts.adminCreateContract(admin.id, {
            studentId: directStudent.student.id,
            bedId: directBed.id,
            startDate: new Date("2025-01-01T00:00:00Z"),
            endDate: new Date("2026-01-01T00:00:00Z"),
          });
          assert.equal(directContract.roomPricePerMonthSnapshot, 2_200_000);
        },
      );
      await t.test(
        "student contract create, reject, cancel, approve metadata and end",
        async () => {
          const a = await student(),
            target = await room(1),
            bed = (await r.beds.findByRoomId(target.id))[0];
          let c = await contracts.createContract(a.user.id, { bedId: bed.id });
          assert.equal(c.status, "PENDING");
          await contracts.rejectContract(c.id, admin.id, "Audit rejection");
          assert.equal((await r.contracts.findById(c.id)).status, "REJECTED");
          c = await contracts.createContract(a.user.id, { bedId: bed.id });
          await contracts.cancelPendingContract(
            a.user.id,
            c.id,
            "Changed plans",
          );
          assert.equal((await r.contracts.findById(c.id)).status, "CANCELLED");
          c = await contracts.createContract(a.user.id, { bedId: bed.id });
          await contracts.approveContract(c.id, admin.id);
          const active = await r.contracts.findById(c.id);
          assert.equal(active.approvedBy, admin.id);
          assert.ok(active.approvedAt instanceof Date);
          await contracts.endContract(c.id, admin.id);
          assert.equal((await r.beds.findById(bed.id)).status, "EMPTY");
        },
      );
      await t.test(
        "room change and checkout failures roll back every changed row",
        async () => {
          const fail = (repo, key) =>
            new Proxy(repo, {
              get(o, k) {
                return k === key
                  ? async () => {
                      throw new Error("injected failure");
                    }
                  : typeof o[k] === "function"
                    ? o[k].bind(o)
                    : o[k];
              },
            });
          const original = await room(1),
            target = await room(1),
            a = await resident(original);
          const targetBed = (await r.beds.findByRoomId(target.id))[0];
          const request = await changes.createRequest(a.user.id, {
            targetBedId: targetBed.id,
          });
          const broken = new RoomChangeRequestService(
            r.changes,
            fail(r.contracts, "create"),
            r.students,
            r.beds,
            r.rooms,
            tx,
            r.checkouts,
            r.types,
            r.buildings,
          );
          await assert.rejects(
            () => broken.approveRequest(request.id, admin.id),
            /injected failure/,
          );
          assert.equal(
            (await r.contracts.findById(a.contract.id)).status,
            "ACTIVE",
          );
          assert.equal((await r.beds.findById(a.bed.id)).status, "OCCUPIED");
          assert.equal((await r.beds.findById(targetBed.id)).status, "EMPTY");
          assert.equal(
            (await r.changes.findById(request.id)).status,
            "PENDING",
          );
          const second = await resident(await room(1));
          const out = await checkout.create(second.user.id);
          const brokenOut = new CheckoutRequestService(
            r.checkouts,
            r.contracts,
            r.students,
            r.changes,
            fail(r.beds, "releaseIfOccupied"),
            r.rooms,
            tx,
          );
          await assert.rejects(
            () => brokenOut.approve(out.id, admin.id),
            /injected failure/,
          );
          assert.equal(
            (await r.contracts.findById(second.contract.id)).status,
            "ACTIVE",
          );
          assert.equal((await r.checkouts.findById(out.id)).status, "PENDING");
          assert.equal(
            (await r.beds.findById(second.bed.id)).status,
            "OCCUPIED",
          );
        },
      );
      await t.test(
        "notification scopes and maintenance workflow with real relations",
        async () => {
          const { NotificationService } =
            await import("../dist/services/notification.service.js");
          const ns = new NotificationService(
            r.notifications,
            r.recipients,
            r.students,
            r.contracts,
            r.buildings,
            tx,
          );
          const a = await resident(await room()),
            stranger = await student();
          for (const scope of ["ALL", "BUILDING", "SPECIFIC_STUDENT"]) {
            const result = await ns.create(admin.id, {
              title: "Audit " + scope,
              content: "Notice",
              targetScope: scope,
              ...(scope === "BUILDING"
                ? { targetBuildingId: building.id }
                : scope === "SPECIFIC_STUDENT"
                  ? { targetStudentId: a.student.id }
                  : {}),
            });
            assert.ok(result.recipientCount > 0);
            await ns.studentDetail(a.user.id, result.notification.id);
            if (scope === "SPECIFIC_STUDENT")
              await assert.rejects(
                () =>
                  ns.studentDetail(stranger.user.id, result.notification.id),
                code("NOTIFICATION_NOT_FOUND"),
              );
          }
          const { StaffRepository } =
            await import("../dist/repositories/implementations/staff.repository.js");
          const { MaintenanceRequestService } =
            await import("../dist/services/maintenance-request.service.js");
          const ms = new MaintenanceRequestService(
            r.maintenance,
            r.students,
            r.contracts,
            r.equipment,
            new StaffRepository(),
          );
          const staff = (
            await pool.query(
              "INSERT INTO staff(staff_code,full_name,specialty,status) VALUES ('MT-TEST','Nhân viên test','Điện nước','ACTIVE') RETURNING id",
            )
          ).rows[0];
          const m = await ms.create(a.user.id, {
            category: "OTHER",
            description: "Audit repair",
          });
          assert.equal(m.roomId, a.contract.roomId);
          await assert.rejects(
            () => ms.studentCancel(stranger.user.id, m.id),
            code("FORBIDDEN"),
          );
          await ms.assign(m.id, staff.id);
          await ms.resolve(m.id, {
            resolutionMethod: "REPAIR",
            damageCause: "WEAR_AND_TEAR",
            resolutionReason: "Fixed",
            resolutionCost: 0,
          });
          assert.equal((await r.maintenance.findById(m.id)).status, "RESOLVED");
          await assert.rejects(
            () => ms.studentCancel(a.user.id, m.id),
            code("MAINTENANCE_REQUEST_NOT_PENDING"),
          );
          const cancel = await ms.create(a.user.id, {
            category: "OTHER",
            description: "Cancel me",
          });
          await ms.studentCancel(a.user.id, cancel.id);
          assert.equal(
            (await r.maintenance.findById(cancel.id)).status,
            "CANCELLED",
          );
        },
      );
      await t.test(
        "append-only billing rejects missing middle period without financial writes",
        async () => {
          const target = await room();
          await resident(target);
          const july = await draft(target, "2026-07", 10);
          await billing().finalize(july.id, admin.id);
          const august = await billing().saveDraft(
            {
              roomId: target.id,
              billingPeriod: "2026-08",
              electricityCurrent: 20,
              waterCurrent: 20,
            },
            new Date("2026-12-15"),
          );
          const september = await billing().saveDraft(
            {
              roomId: target.id,
              billingPeriod: "2026-09",
              electricityCurrent: 30,
              waterCurrent: 30,
            },
            new Date("2026-12-15"),
          );
          await billing().finalize(september.id, admin.id);
          await assert.rejects(
            () => billing().finalize(august.id, admin.id),
            code("MONTHLY_BILLING_OUT_OF_ORDER"),
          );
          assert.equal(
            await r.readings.findByRoomAndPeriod(target.id, "2026-08"),
            null,
          );
          assert.deepEqual(
            await r.invoices.findByMonthlyBilling(august.id),
            [],
          );
        },
      );
      await t.test(
        "Staff directory, assignment policy and transactional audit",
        async () => {
          const base = `http://127.0.0.1:${server.address().port}/api/v1`;
          const adminToken = tokens.generateAccessToken({
            userId: admin.id,
            role: "ADMIN",
          });
          const request = async (
            path,
            method = "GET",
            body,
            token = adminToken,
          ) => {
            const response = await fetch(base + path, {
              method,
              headers: {
                "content-type": "application/json",
                authorization: "Bearer " + token,
              },
              body: body === undefined ? undefined : JSON.stringify(body),
            });
            return {
              status: response.status,
              body: await response.json(),
              requestId: response.headers.get("x-request-id"),
            };
          };
          let response = await request("/admin/staff", "POST", {
            staffCode: "MT-001",
            fullName: "Nguyễn Bảo Trì",
            phone: "0901234567",
            specialty: "Điện nước",
          });
          assert.equal(response.status, 201);
          assert.ok(response.requestId);
          const staff = response.body.data;
          response = await request("/admin/staff", "POST", {
            staffCode: "MT-001",
            fullName: "Trùng mã",
          });
          assert.equal(response.status, 409);
          assert.equal(response.body.code, "STAFF_CODE_ALREADY_EXISTS");
          const residentAccount = await resident(await room());
          const maintenance = (
            await pool.query(
              "INSERT INTO maintenance_requests(student_id,room_id,category,description) VALUES($1,$2,'OTHER','Test assignment') RETURNING id",
              [residentAccount.student.id, residentAccount.contract.roomId],
            )
          ).rows[0];
          response = await request(
            `/admin/maintenance-requests/${maintenance.id}/assign`,
            "PATCH",
            { staffId: staff.id },
          );
          assert.equal(response.status, 200);
          response = await request(`/admin/staff/${staff.id}/status`, "PATCH", {
            status: "INACTIVE",
          });
          assert.equal(response.status, 409);
          assert.equal(response.body.code, "STAFF_HAS_ACTIVE_ASSIGNMENTS");
          response = await request(
            `/admin/maintenance-requests/${maintenance.id}/resolve`,
            "PATCH",
            {
              resolutionMethod: "REPAIR",
              damageCause: "WEAR_AND_TEAR",
              resolutionReason: "Đã sửa",
              resolutionCost: 0,
            },
          );
          assert.equal(response.status, 200);
          response = await request(`/admin/staff/${staff.id}/status`, "PATCH", {
            status: "INACTIVE",
          });
          assert.equal(response.status, 200);
          const historical = await request(
            `/admin/maintenance-requests/${maintenance.id}`,
          );
          assert.equal(historical.body.data.assignedStaff.staffCode, "MT-001");
          assert.equal(historical.body.data.assignedStaff.status, "INACTIVE");
          const second = (
            await pool.query(
              "INSERT INTO maintenance_requests(student_id,room_id,category,description) VALUES($1,$2,'OTHER','Inactive assignment') RETURNING id",
              [residentAccount.student.id, residentAccount.contract.roomId],
            )
          ).rows[0];
          response = await request(
            `/admin/maintenance-requests/${second.id}/assign`,
            "PATCH",
            { staffId: staff.id },
          );
          assert.equal(response.status, 409);
          assert.equal(response.body.code, "STAFF_INACTIVE");
          response = await request(`/admin/staff/${staff.id}`, "PATCH", {
            phone: "0911222333",
            specialty: "Điện",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.data.phone, "0911222333");
          assert.equal(response.body.data.userId, undefined);
          response = await request(`/admin/staff/${staff.id}/status`, "PATCH", {
            status: "ACTIVE",
          });
          assert.equal(response.status, 200);
          const studentToken = tokens.generateAccessToken({
            userId: residentAccount.user.id,
            role: "STUDENT",
          });
          response = await request(
            "/admin/audit-logs",
            "GET",
            undefined,
            studentToken,
          );
          assert.equal(response.status, 403);
          response = await request(`/admin/audit-logs?entityId=${staff.id}`);
          assert.equal(response.status, 200);
          assert.ok(
            response.body.data.items.some((x) => x.action === "STAFF_CREATED"),
          );
          assert.ok(
            response.body.data.items.some(
              (x) => x.action === "STAFF_DEACTIVATED",
            ),
          );
          assert.ok(
            response.body.data.items.every(
              (x) => !x.actor || x.actor.id === admin.id,
            ),
          );
          assert.ok(
            response.body.data.items.some((x) => x.action === "STAFF_UPDATED"),
          );
          assert.ok(
            response.body.data.items.some(
              (x) => x.action === "STAFF_ACTIVATED",
            ),
          );
          for (let i = 1; i < response.body.data.items.length; i++)
            assert.ok(
              new Date(response.body.data.items[i - 1].createdAt) >=
                new Date(response.body.data.items[i].createdAt),
            );
          response = await request(
            `/admin/audit-logs?action=STAFF_CREATED&entityType=STAFF&entityId=${staff.id}&dateFrom=2020-01-01`,
          );
          assert.equal(response.status, 200);
          assert.equal(response.body.data.items.length, 1);
          assert.equal(response.body.data.items[0].action, "STAFF_CREATED");

          const { StaffService } =
            await import("../dist/services/admin/staff.service.js");
          const { StaffRepository } =
            await import("../dist/repositories/implementations/staff.repository.js");
          const { AuditLogService } =
            await import("../dist/services/audit-log.service.js");
          const target = (
            await pool.query(
              "INSERT INTO staff(staff_code,full_name,status) VALUES('MT-ROLLBACK','Rollback Test','ACTIVE') RETURNING id",
            )
          ).rows[0];
          const failingAudit = new AuditLogService({
            create: async () => {
              throw new Error("injected audit failure");
            },
          });
          const service = new StaffService(
            new StaffRepository(),
            tx,
            failingAudit,
          );
          await assert.rejects(
            () =>
              service.status(target.id, "INACTIVE", { actorUserId: admin.id }),
            /injected audit failure/,
          );
          assert.equal(
            (
              await pool.query("SELECT status FROM staff WHERE id=$1", [
                target.id,
              ])
            ).rows[0].status,
            "ACTIVE",
          );
        },
      );
      await paymentScenarios(t, {
        pool,
        r,
        tx,
        room,
        resident,
        draft,
        billing,
        admin,
        student,
        app,
        tokens,
      });
      await t.test(
        "final relational occupancy and cursor invariants",
        async () => {
          const report = await r.diagnostics.consistency();
          assert.equal(report.activeOnNonOccupiedBeds, 0);
          assert.equal(report.bedsWithMultipleActiveContracts, 0);
          assert.equal(report.fullRoomsWithEmptyBeds, 0);
          const orphan = (
            await pool.query(
              `SELECT count(*) FROM rooms r LEFT JOIN room_billing_cursors c ON c.room_id=r.id WHERE c.room_id IS NULL`,
            )
          ).rows[0].count;
          assert.equal(orphan, "0");
          assert.equal(
            (
              await pool.query(
                "SELECT count(*) FROM beds b WHERE b.status='OCCUPIED' AND (SELECT count(*) FROM contracts c WHERE c.bed_id=b.id AND c.status='ACTIVE')<>1",
              )
            ).rows[0].count,
            "0",
          );
          assert.equal(
            (
              await pool.query(
                `SELECT count(*) FROM (
                  SELECT r.id
                  FROM rooms r
                  JOIN room_types rt ON rt.id=r.room_type_id
                  LEFT JOIN beds b ON b.room_id=r.id
                  GROUP BY r.id,rt.capacity
                  HAVING count(b.id)<>rt.capacity
                ) mismatches`,
              )
            ).rows[0].count,
            "0",
          );
        },
      );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await pool.end();
    }
  },
);
