import { disconnectDatabase, connectDatabase } from "../src/config/database.js";
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
import { PostgresTransactionManager } from "../src/services/transaction-manager.js";

const roomTypes = [
  { name: "Tiêu chuẩn 6 người", capacity: 6, price: 900_000 },
  { name: "Phòng giá rẻ", capacity: 4, price: 1_200_000 },
  { name: "Phòng trung bình", capacity: 4, price: 1_500_000 },
  { name: "Chất lượng cao 4 người", capacity: 4, price: 1_900_000 },
  { name: "Cao cấp 2 người", capacity: 2, price: 2_500_000 },
] as const;
const buildings = [
  { name: "Tòa A", code: "A", allowedGender: "MALE" as const },
  { name: "Tòa B", code: "B", allowedGender: "MALE" as const },
  { name: "Tòa C", code: "C", allowedGender: "FEMALE" as const },
] as const;
const distributions = {
  A: [[0, 0, 1, 1, 2], [1, 1, 2, 2, 3], [2, 3, 3, 4, 4]],
  B: [[0, 1, 1, 2, 2], [1, 2, 2, 3, 3], [2, 3, 4, 3, 4]],
  C: [[1, 1, 2, 2, 3], [1, 2, 2, 3, 3], [2, 3, 3, 4, 4]],
} as const;
const categories = [
  { name: "Tủ lạnh", prefix: "FRIDGE" },
  { name: "Bộ bàn ghế", prefix: "DESK" },
  { name: "Quạt trần", prefix: "FAN" },
  { name: "Bình nóng lạnh", prefix: "WATERHEATER" },
  { name: "Điều hòa", prefix: "AC" },
] as const;

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seeds are disabled in production");
  await connectDatabase();
  const br = new BuildingRepository(), tr = new RoomTypeRepository(), rr = new RoomRepository();
  const beds = new BedRepository(), equipment = new EquipmentItemRepository(), categoriesRepo = new EquipmentCategoryRepository();
  const transactionManager = new PostgresTransactionManager();
  const bs = new BuildingService(br, rr),
    ts = new RoomTypeService(tr, rr, transactionManager);
  const rs = new RoomService(rr, br, tr, beds, equipment, transactionManager);
  const categoryService = new EquipmentCategoryService(categoriesRepo, equipment);
  const equipmentService = new EquipmentItemService(equipment, categoriesRepo, rr);
  const summary = { buildingsCreated: 0, roomsCreated: 0, roomsReused: 0, legacyRoomsRenamed: 0, equipmentCreated: 0, warnings: [] as string[] };

  const typeIds: string[] = [];
  for (const type of roomTypes) {
    const found = (await tr.findAll()).find((item) => item.name === type.name);
    typeIds.push(found?.id ?? (await ts.create({ name: type.name, capacity: type.capacity, pricePerMonth: type.price })).id);
    if (found && (found.capacity !== type.capacity || found.pricePerMonth !== type.price)) summary.warnings.push(`Giữ nguyên hạng phòng hiện có: ${type.name}`);
  }
  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const found = (await categoriesRepo.findAll()).find((item) => item.name === category.name);
    categoryIds.set(category.name, found?.id ?? (await categoryService.create({ name: category.name, unit: "cái" })).id);
  }

  for (const config of buildings) {
    let building = (await br.findAll()).find((item) => item.name === config.name);
    if (!building) {
      building = await bs.create({ name: config.name, status: "ACTIVE", allowedGender: config.allowedGender });
      summary.buildingsCreated++;
    } else if (building.status !== "ACTIVE" || building.allowedGender !== config.allowedGender) {
      building = await bs.update(building.id, { status: "ACTIVE", allowedGender: config.allowedGender });
    }
    for (let floor = 1; floor <= 3; floor++) for (let index = 1; index <= 5; index++) {
      const roomNumber = `${config.code}${floor}0${index}`, legacyNumber = `${config.code}-${floor}0${index}`;
      let room = await rr.findByRoomNumberAndBuildingId(roomNumber, building.id);
      if (!room) {
        const legacy = await rr.findByRoomNumberAndBuildingId(legacyNumber, building.id);
        if (legacy) { room = await rr.update(legacy.id, { roomNumber }); summary.legacyRoomsRenamed++; }
      }
      if (!room) {
        const typeIndex = distributions[config.code][floor - 1]![index - 1]!;
        room = await rs.create({ buildingId: building.id, roomTypeId: typeIds[typeIndex]!, roomNumber, floor });
        summary.roomsCreated++;
      } else {
        summary.roomsReused++;
        if (room.floor !== floor) summary.warnings.push(`${roomNumber}: giữ nguyên tầng ${room.floor} vì phòng đã tồn tại`);
      }
      const roomType = await tr.findById(room.roomTypeId), actualBeds = await beds.findByRoomId(room.id);
      if (roomType && actualBeds.length !== roomType.capacity) summary.warnings.push(`${roomNumber}: ${actualBeds.length} giường, hạng phòng yêu cầu ${roomType.capacity}; không tự resize`);
      const selected = categories.filter((category) => category.name === "Điều hòa" ? roomType?.name.includes("Cao") || roomType?.name.includes("Chất lượng") : category.name !== "Bình nóng lạnh" || roomType?.name !== "Tiêu chuẩn 6 người");
      for (const category of selected) {
        const serialNumber = `${category.prefix}-${roomNumber}-01`;
        if (await equipment.findBySerialNumber(serialNumber)) continue;
        await equipmentService.create({ roomId: room.id, categoryId: categoryIds.get(category.name)!, serialNumber, condition: "GOOD" });
        summary.equipmentCreated++;
      }
    }
  }
  const finalBuildings = await br.findAllWithSummaries();
  for (const building of finalBuildings.filter((item) => buildings.some((config) => config.name === item.name)))
    if (building.floorCount !== 3 || building.roomCount !== 15) summary.warnings.push(`${building.name}: expected 3 tầng/15 phòng, actual ${building.floorCount}/${building.roomCount}`);
  console.log("===== Dormitory Demo Seed =====");
  console.log({ ...summary, topology: finalBuildings.map(({ name, floorCount, roomCount, totalBeds }) => ({ name, floorCount, roomCount, totalBeds })) });
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => disconnectDatabase());
