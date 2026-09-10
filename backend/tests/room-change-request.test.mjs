import test from "node:test";
import assert from "node:assert/strict";
import { RoomChangeRequestService } from "../dist/services/room-change-request.service.js";

const oid = (value) => value;
const requestDoc = (overrides = {}) => ({
  id: "request-1",
  studentId: oid("student-1"),
  currentContractId: oid("contract-old"),
  targetBedId: oid("bed-target"),
  status: "PENDING",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
const summary = {
  student: { id: "student-1", mssv: "SV001", fullName: "Sinh viên A" },
  currentRoom: {
    id: "room-old",
    roomNumber: "A-101",
    buildingName: "Tòa A",
    bedNumber: "1",
  },
  targetRoom: {
    id: "room-target",
    roomNumber: "B-201",
    buildingName: "Tòa B",
    bedNumber: "2",
  },
};
function fixture(overrides = {}) {
  const calls = [];
  const contractUpdates = [];
  const createdContracts = [];
  const request = requestDoc();
  const oldEndDate = new Date("2027-01-31T00:00:00.000Z");
  const dependencies = {
    requests: {
      findById: async () => request,
      findDisplaySummaries: async () => new Map([[request.id, summary]]),
      findByStudentId: async () => [request],
      findPendingByStudentId: async () => null,
      create: async (data) => requestDoc(data),
      updateStatus: async (_id, status) => {
        calls.push(`request:${status}`);
        return requestDoc({ status });
      },
    },
    contracts: {
      findById: async () => ({
        id: oid("contract-old"),
        studentId: oid("student-1"),
        roomId: oid("room-old"),
        bedId: oid("bed-old"),
        status: "ACTIVE",
        endDate: oldEndDate,
      }),
      findActiveByStudentId: async () => ({
        id: oid("contract-old"),
        studentId: oid("student-1"),
        roomId: oid("room-old"),
        bedId: oid("bed-old"),
        status: "ACTIVE",
        endDate: oldEndDate,
      }),
      findActiveByBedId: async () => ({ id: oid("contract-old") }),
      updateStatus: async (_id, status, metadata) => {
        calls.push(`contract:${status}`);
        contractUpdates.push({ status, metadata });
      },
      create: async (data) => {
        calls.push("contract:create");
        createdContracts.push(data);
        return data;
      },
    },
    students: {
      findByUserId: async () => ({ id: "student-1" }),
      lockResidenceIntent: async () => {},
    },
    beds: {
      findById: async (id) => ({
        id: oid(id),
        roomId: oid(id === "bed-target" ? "room-target" : "room-old"),
        status: "EMPTY",
      }),
      occupyIfEmpty: async () => {
        calls.push("bed:claim");
        return true;
      },
      releaseIfOccupied: async () => {
        calls.push("bed:release");
        return true;
      },
      countEmptyByRoomId: async () => 1,
    },
    rooms: {
      findById: async (id) => ({ id, status: "AVAILABLE" }),
      updateStatus: async (_id, status) => {
        calls.push(`room:${status}`);
      },
    },
    tx: { runInTransaction: async (work) => work({}) },
    checkout: {
      findPendingByStudentId: async () => null,
      cancelPendingByContractId: async () => {
        calls.push("checkout:cancel");
      },
    },
    calls,
    contractUpdates,
    oldEndDate,
    request,
    createdContracts,
  };
  for (const [key, value] of Object.entries(overrides))
    Object.assign(dependencies[key], value);
  const service = new RoomChangeRequestService(
    dependencies.requests,
    dependencies.contracts,
    dependencies.students,
    dependencies.beds,
    dependencies.rooms,
    dependencies.tx,
    dependencies.checkout,
  );
  return { service, ...dependencies };
}

test("create rejects a target bed in the student's current room", async () => {
  const f = fixture({
    beds: {
      findById: async () => ({
        id: oid("bed-other"),
        roomId: oid("room-old"),
        status: "EMPTY",
      }),
    },
  });
  await assert.rejects(
    () => f.service.createRequest("user-1", { targetBedId: "bed-other" }),
    (error) =>
      error.statusCode === 409 && error.code === "INVALID_ROOM_CHANGE_TARGET",
  );
});
test("create rejects a pending checkout conflict", async () => {
  const f = fixture({
    checkout: { findPendingByStudentId: async () => ({ id: "checkout" }) },
  });
  await assert.rejects(
    () => f.service.createRequest("user-1", { targetBedId: "bed-target" }),
    (error) =>
      error.statusCode === 409 && error.code === "CONFLICTING_PENDING_REQUEST",
  );
});

test("approve rejects an atomically-lost target-bed race without partial writes", async () => {
  const f = fixture({
    beds: {
      occupyIfEmpty: async () => {
        f.calls.push("bed:claim");
        return false;
      },
    },
  });
  await assert.rejects(
    () => f.service.approveRequest("request-1", "admin-1"),
    (error) =>
      error.statusCode === 409 && error.code === "TARGET_BED_NOT_AVAILABLE",
  );
  assert.deepEqual(f.calls, ["bed:claim"]);
  assert.equal(f.request.status, "PENDING");
});

test("approve creates one ACTIVE contract inheriting the old contract endDate", async () => {
  const f = fixture();
  const response = await f.service.approveRequest("request-1", "admin-1");
  assert.equal(response.status, "APPROVED");
  assert.ok(f.contractUpdates[0].metadata.endedAt instanceof Date);
  assert.equal(f.createdContracts[0].status, "ACTIVE");
  assert.equal(f.createdContracts[0].endDate, f.oldEndDate);
  assert.equal(f.calls.filter((call) => call === "contract:create").length, 1);
  assert.deepEqual(f.calls.slice(0, 5), [
    "bed:claim",
    "contract:ENDED",
    "checkout:cancel",
    "bed:release",
    "contract:create",
  ]);
});

test("approve revalidates and rejects a target room that is no longer AVAILABLE", async () => {
  const f = fixture({
    rooms: {
      findById: async (id) => ({
        id: oid(id),
        status: id === "room-target" ? "FULL" : "AVAILABLE",
      }),
    },
  });
  await assert.rejects(
    () => f.service.approveRequest("request-1", "admin-1"),
    (error) => error.statusCode === 409 && error.code === "ROOM_NOT_AVAILABLE",
  );
  assert.deepEqual(f.calls, []);
});
