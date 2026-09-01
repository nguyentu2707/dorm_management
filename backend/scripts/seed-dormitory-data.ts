import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import { BuildingRepository } from "../src/repositories/implementations/building.repository.js";
import { RoomTypeRepository } from "../src/repositories/implementations/room-type.repository.js";
import { RoomRepository } from "../src/repositories/implementations/room.repository.js";
import { BedRepository } from "../src/repositories/implementations/bed.repository.js";
import { EquipmentItemRepository } from "../src/repositories/implementations/equipment-item.repository.js";
import { EquipmentCategoryRepository } from "../src/repositories/implementations/equipment-category.repository.js";
import { BuildingService } from "../src/services/admin/building.service.js";
import { RoomTypeService } from "../src/services/admin/room-type.service.js";
import { RoomService } from "../src/services/admin/room.service.js";
import { EquipmentItemService } from "../src/services/admin/equipment-item.service.js";
import { EquipmentCategoryService } from "../src/services/admin/equipment-category.service.js";
import { MongoTransactionManager } from "../src/services/transaction-manager.js";
const tiers = [
  {
    name: "Phòng giá rẻ",
    price: 1_200_000,
    building: "Tòa A",
    code: "A",
    floors: 1,
    tier: "ECONOMY",
  },
  {
    name: "Phòng trung bình",
    price: 1_500_000,
    building: "Tòa B",
    code: "B",
    floors: 1,
    tier: "STANDARD",
  },
] as const;
const categories = [
  { name: "Tủ lạnh", prefix: "FRIDGE", count: 1 },
  { name: "Bộ bàn ghế", prefix: "DESK", count: 4 },
  { name: "Quạt trần", prefix: "FAN", count: 1 },
  { name: "Bình nóng lạnh", prefix: "WATERHEATER", count: 1 },
] as const;
async function main() {
  await connectDatabase();
  const br = new BuildingRepository(),
    tr = new RoomTypeRepository(),
    rr = new RoomRepository(),
    beds = new BedRepository(),
    er = new EquipmentItemRepository(),
    cr = new EquipmentCategoryRepository();
  const bs = new BuildingService(br, rr),
    ts = new RoomTypeService(tr, rr),
    rs = new RoomService(rr, br, tr, beds, er, new MongoTransactionManager()),
    cs = new EquipmentCategoryService(cr, er),
    es = new EquipmentItemService(er, cr, rr);
  const summary = {
    roomsCreated: 0,
    roomsSkipped: 0,
    equipmentCreated: 0,
    equipmentSkipped: 0,
    bedsRestored: 0,
  };
  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const found = (await cr.findAll()).find((x) => x.name === c.name);
    categoryIds.set(
      c.name,
      found?.id ?? (await cs.create({ name: c.name, unit: "cái" })).id,
    );
  }
  for (const t of tiers) {
    const foundType = (await tr.findAll()).find((x) => x.name === t.name);
    const typeId =
      foundType?.id ??
      (await ts.create({ name: t.name, capacity: 4, pricePerMonth: t.price }))
        .id;
    const foundBuilding = (await br.findAll()).find(
      (x) => x.name === t.building,
    );
    const buildingId =
      foundBuilding?.id ?? (await bs.create({ name: t.building })).id;
    for (let floor = 1; floor <= t.floors; floor++)
      for (let i = 1; i <= 5; i++) {
        const roomNumber = `${t.code}-${floor}0${i}`;
        let room = await rr.findByRoomNumberAndBuildingId(
          roomNumber,
          buildingId,
        );
        if (!room) {
          await rs.create({
            buildingId,
            roomTypeId: typeId,
            roomNumber,
            floor,
          });
          room = await rr.findByRoomNumberAndBuildingId(roomNumber, buildingId);
          summary.roomsCreated++;
        } else {
          summary.roomsSkipped++;
          if (room.roomTypeId.toString() !== typeId)
            room = await rr.update(room.id, { roomTypeId: typeId });
        }
        if (!room) throw Error(`Cannot create ${roomNumber}`);
        summary.bedsRestored += await beds.ensureCapacity(room.id, 4);
        const selected = categories.filter(
          (c) => !(c.name === "Bình nóng lạnh" && t.tier === "ECONOMY"),
        );
        for (const c of selected)
          for (let n = 1; n <= c.count; n++) {
            const serial = `${c.prefix}-${roomNumber}-${String(n).padStart(2, "0")}`;
            if (await er.findBySerialNumber(serial)) {
              summary.equipmentSkipped++;
              continue;
            }
            await es.create({
              roomId: room.id,
              categoryId: categoryIds.get(c.name)!,
              serialNumber: serial,
              condition: "GOOD",
            });
            summary.equipmentCreated++;
          }
      }
  }
  console.log("===== Seed Summary =====");
  console.log({
    ...summary,
    expectedRooms: 10,
    expectedBeds: 40,
    expectedEquipment: 65,
  });
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
