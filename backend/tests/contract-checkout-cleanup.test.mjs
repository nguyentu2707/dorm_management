import test from "node:test";
import assert from "node:assert/strict";
import { ContractService } from "../dist/services/contract.service.js";
const oid = (x) => x;
function fixture(releaseSucceeds = true) {
  const committed = {
    contract: "ACTIVE",
    bed: "OCCUPIED",
    room: "FULL",
    checkout: "PENDING",
    endedAt: null,
  };
  let draft;
  const contract = {
    id: "contract-1",
    id: oid("contract-1"),
    studentId: oid("student-1"),
    bedId: oid("bed-1"),
    roomId: oid("room-1"),
    status: "ACTIVE",
    startDate: new Date(),
    endDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const contracts = {
    findById: async () => contract,
    findActiveByBedId: async () => contract,
    updateStatus: async (_id, status, metadata) => {
      draft.contract = status;
      draft.endedAt = metadata.endedAt;
      return { ...contract, status };
    },
  };
  const beds = {
    releaseIfOccupied: async () => {
      if (!releaseSucceeds) return false;
      draft.bed = "EMPTY";
      return true;
    },
  };
  const rooms = {
    findById: async () => ({
      id: "room-1",
      id: oid("room-1"),
      status: "FULL",
    }),
    updateStatus: async (_id, status) => {
      draft.room = status;
    },
  };
  const checkout = {
    cancelPendingByContractId: async () => {
      draft.checkout = "CANCELLED";
    },
  };
  const tx = {
    runInTransaction: async (work) => {
      draft = { ...committed };
      try {
        const result = await work({});
        Object.assign(committed, draft);
        return result;
      } catch (error) {
        throw error;
      }
    },
  };
  return {
    service: new ContractService(contracts, {}, beds, rooms, tx, checkout),
    committed,
  };
}
test("admin end cleans pending checkout in the same transaction", async () => {
  const f = fixture();
  await f.service.endContract("contract-1", "admin");
  assert.deepEqual(
    {
      contract: f.committed.contract,
      bed: f.committed.bed,
      room: f.committed.room,
      checkout: f.committed.checkout,
    },
    {
      contract: "ENDED",
      bed: "EMPTY",
      room: "AVAILABLE",
      checkout: "CANCELLED",
    },
  );
  assert.ok(f.committed.endedAt instanceof Date);
});
test("failure after contract mutation rolls back contract, bed, room and checkout", async () => {
  const f = fixture(false);
  await assert.rejects(() => f.service.endContract("contract-1", "admin"));
  assert.deepEqual(f.committed, {
    contract: "ACTIVE",
    bed: "OCCUPIED",
    room: "FULL",
    checkout: "PENDING",
    endedAt: null,
  });
});
