import test from "node:test";
import assert from "node:assert/strict";
import { MaintenanceRequestService } from "../dist/services/maintenance-request.service.js";
import { resolveMaintenance } from "../dist/validators/maintenance-request.validator.js";

const oid = (value) => ({ toString: () => value });

function fixture(status = "IN_PROGRESS") {
  let current = {
    id: "request-1",
    id: oid("request-1"),
    studentId: oid("student-1"),
    roomId: oid("room-1"),
    category: "APPLIANCE",
    description: "Quạt không hoạt động",
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let update;
  const requests = {
    findById: async () => current,
    update: async (_id, data) => {
      update = data;
      current = { ...current, ...data };
      return current;
    },
  };
  const service = new MaintenanceRequestService(requests, {}, {}, {}, {});
  return { service, getUpdate: () => update };
}

test("resolve stores method, damage cause, reason and cost", async () => {
  const f = fixture();
  const result = await f.service.resolve("request-1", {
    resolutionMethod: "REPLACE",
    damageCause: "STUDENT_CAUSED",
    resolutionReason: "Động cơ bị cháy, không thể sửa chữa an toàn",
    resolutionCost: 450_000,
    resolutionNote: "Đã thay quạt mới",
  });

  assert.equal(result.status, "RESOLVED");
  assert.equal(result.resolutionMethod, "REPLACE");
  assert.equal(result.damageCause, "STUDENT_CAUSED");
  assert.equal(result.resolutionCost, 450_000);
  assert.ok(f.getUpdate().processingStartedAt instanceof Date);
  assert.ok(f.getUpdate().resolvedAt instanceof Date);
});

test("resolve rejects a completed request", async () => {
  const f = fixture("RESOLVED");
  await assert.rejects(
    () =>
      f.service.resolve("request-1", {
        resolutionMethod: "REPAIR",
        damageCause: "WEAR_AND_TEAR",
        resolutionReason: "Bảo dưỡng",
        resolutionCost: 0,
      }),
    (error) => error.code === "INVALID_MAINTENANCE_STATUS",
  );
});

test("OTHER damage cause requires a detail", () => {
  const base = {
    body: {
      resolutionMethod: "REPAIR",
      damageCause: "OTHER",
      resolutionReason: "Sửa để tiếp tục sử dụng",
      resolutionCost: 100_000,
    },
    params: { id: "507f1f77-bcf8-4cd7-9943-901100000001" },
    query: {},
  };

  assert.equal(resolveMaintenance.safeParse(base).success, false);
  assert.equal(
    resolveMaintenance.safeParse({
      ...base,
      body: { ...base.body, damageCauseDetail: "Chập điện do nguồn bên ngoài" },
    }).success,
    true,
  );
});
