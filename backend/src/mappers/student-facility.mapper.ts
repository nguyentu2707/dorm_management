import type { BuildingDocument } from "../models/building.model.js";
import type { BedDocument } from "../models/bed.model.js";
import type { RoomDocument } from "../models/room.model.js";
import type { RoomTypeDocument } from "../models/room-type.model.js";

export class StudentFacilityMapper {
  static building(building: BuildingDocument) {
    return { id: building.id.toString(), name: building.name };
  }

  static room(
    room: RoomDocument,
    roomType: RoomTypeDocument,
    emptyBedCount: number,
    totalBedCount: number,
  ) {
    return {
      id: room.id.toString(),
      buildingId: room.buildingId.toString(),
      roomNumber: room.roomNumber,
      floor: room.floor,
      status: room.status,
      emptyBedCount,
      totalBedCount,
      roomType: {
        id: roomType.id.toString(),
        name: roomType.name,
        capacity: roomType.capacity,
        pricePerMonth: roomType.pricePerMonth,
      },
    };
  }

  static bed(bed: BedDocument) {
    return {
      id: bed.id.toString(),
      roomId: bed.roomId.toString(),
      bedNumber: bed.bedNumber,
      status: bed.status,
    };
  }
}
