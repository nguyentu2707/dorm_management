import test from "node:test";
import assert from "node:assert/strict";
import { CheckoutRequestService } from "../dist/services/checkout-request.service.js";
const oid = (x) => x;
const doc = (status = "PENDING") => ({
  id: "checkout-1",
  studentId: oid("student-1"),
  contractId: oid("contract-1"),
  roomId: oid("room-1"),
  status,
  reason: "Rời KTX",
  createdAt: new Date(),
  updatedAt: new Date(),
});
const summary = {
  student: { id: "student-1", mssv: "SV1", fullName: "A" },
  room: { id: "room-1", buildingName: "Tòa A", roomNumber: "A1" },
  bed: { id: "bed-1", bedNumber: "1" },
  contract: { id: "contract-1", startDate: new Date(), endDate: new Date() },
};
function fixture(options = {}) {
  const calls = [];
  const contractUpdates = [];
  let current = doc();
  const requests = {
    create: async () => current,
    findById: async () => current,
    findByStudentId: async () => [current],
    findPendingByStudentId: async () =>
      options.pendingCheckout ? current : null,
    findAll: async () => ({
      items: [current],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    findSummaries: async () => new Map([[current.id, summary]]),
    updatePending: async (_id, status) => {
      if (current.status !== "PENDING") return null;
      calls.push(`checkout:${status}`);
      current = doc(status);
      return current;
    },
  };
  const contract = {
    id: "contract-1",
    id: oid("contract-1"),
    studentId: oid("student-1"),
    roomId: oid("room-1"),
    bedId: oid("bed-1"),
    status: "ACTIVE",
    startDate: new Date(),
    endDate: new Date(),
  };
  const contracts = {
    findActiveByStudentId: async () => (options.noActive ? null : contract),
    findById: async () => contract,
    findActiveByBedId: async () => contract,
    updateStatus: async (_id, status, metadata) => {
      calls.push(`contract:${status}`);
      contractUpdates.push({ status, metadata });
    },
  };
  const students = {
    findByUserId: async () => ({ id: "student-1" }),
    lockResidenceIntent: async () => {},
  };
  const roomChanges = {
    findPendingByStudentId: async () => (options.pendingRoomChange ? {} : null),
  };
  const beds = {
    releaseIfOccupied: async () => {
      calls.push("bed:release");
      return options.releaseFails ? false : true;
    },
  };
  const rooms = {
    findById: async () => ({ id: "room-1", status: "FULL" }),
    updateStatus: async (_id, status) => {
      calls.push(`room:${status}`);
    },
  };
  const tx = { runInTransaction: async (work) => work({}) };
  return {
    service: new CheckoutRequestService(
      requests,
      contracts,
      students,
      roomChanges,
      beds,
      rooms,
      tx,
    ),
    calls,
    contractUpdates,
    requests,
    setStatus: (s) => {
      current = doc(s);
    },
  };
}
test("create derives ownership and rejects missing ACTIVE contract", async () => {
  const f = fixture({ noActive: true });
  await assert.rejects(
    () => f.service.create("user", "x"),
    (e) => e.code === "NO_ACTIVE_CONTRACT" && e.statusCode === 409,
  );
});
test("create rejects pending checkout and pending room-change conflicts", async () => {
  await assert.rejects(
    () => fixture({ pendingCheckout: true }).service.create("user"),
    (e) => e.code === "CHECKOUT_REQUEST_ALREADY_PENDING",
  );
  await assert.rejects(
    () => fixture({ pendingRoomChange: true }).service.create("user"),
    (e) => e.code === "CONFLICTING_PENDING_REQUEST",
  );
});
test("approve ends contract, releases bed, updates FULL room and approves request", async () => {
  const f = fixture();
  const result = await f.service.approve("checkout-1", "admin");
  assert.equal(result.status, "APPROVED");
  assert.ok(f.contractUpdates[0].metadata.endedAt instanceof Date);
  assert.deepEqual(f.calls, [
    "contract:ENDED",
    "bed:release",
    "room:AVAILABLE",
    "checkout:APPROVED",
  ]);
});
test("reject and student cancel do not mutate contract, bed or room", async () => {
  const reject = fixture();
  await reject.service.reject("checkout-1", "admin", "no");
  assert.deepEqual(reject.calls, ["checkout:REJECTED"]);
  const cancel = fixture();
  await cancel.service.cancel("user", "checkout-1");
  assert.deepEqual(cancel.calls, ["checkout:CANCELLED"]);
});
test("conditional status transition allows only one of two approvals", async () => {
  const f = fixture();
  await f.service.approve("checkout-1", "admin-1");
  await assert.rejects(
    () => f.service.approve("checkout-1", "admin-2"),
    (e) => e.code === "CHECKOUT_REQUEST_NOT_PENDING",
  );
  assert.equal(f.calls.filter((x) => x === "checkout:APPROVED").length, 1);
});
test("bed-release failure stops checkout approval", async () => {
  const f = fixture({ releaseFails: true });
  await assert.rejects(
    () => f.service.approve("checkout-1", "admin"),
    (e) => e.code === "BED_NOT_OCCUPIED",
  );
  assert.equal(f.calls.includes("checkout:APPROVED"), false);
});
