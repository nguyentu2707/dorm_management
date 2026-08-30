import type { IBuildingRepository } from "../repositories/interfaces/building.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { IRoomTypeRepository } from "../repositories/interfaces/room-type.repository.interface.js";
import type { IBedRepository } from "../repositories/interfaces/bed.repository.interface.js";
import { AppError } from "../errors/AppError.js";
import { StudentFacilityMapper } from "../mappers/student-facility.mapper.js";

export class StudentFacilityService {
  constructor(
    private buildings: IBuildingRepository,
    private rooms: IRoomRepository,
    private roomTypes: IRoomTypeRepository,
    private beds: IBedRepository,
  ) {}

  async getBuildings() {
    return (await this.buildings.findAll()).map(StudentFacilityMapper.building);
  }

  async getRooms(buildingId: string) {
    if (!(await this.buildings.findById(buildingId))) {
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    }

    const result = await this.rooms.findByBuildingId(buildingId, {
      page: 1,
      limit: 100,
      status: "AVAILABLE",
    });

    const rooms = await Promise.all(
      result.items.map(async (room) => {
        const [roomType, beds] = await Promise.all([
          this.roomTypes.findById(room.roomTypeId.toString()),
          this.beds.findByRoomId(room._id.toString()),
        ]);

        if (!roomType) return null;
        const emptyBedCount = beds.filter(
          (bed) => bed.status === "EMPTY",
        ).length;
        if (emptyBedCount === 0) return null;

        return StudentFacilityMapper.room(
          room,
          roomType,
          emptyBedCount,
          beds.length,
        );
      }),
    );

    return rooms.filter((room) => room !== null);
  }

  async getRoom(roomId: string) {
    const room = await this.rooms.findById(roomId);
    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    }

    const [building, roomType, beds] = await Promise.all([
      this.buildings.findById(room.buildingId.toString()),
      this.roomTypes.findById(room.roomTypeId.toString()),
      this.beds.findByRoomId(roomId),
    ]);

    if (!building) {
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    }
    if (!roomType) {
      throw new AppError(
        404,
        "ROOM_TYPE_NOT_FOUND",
        "Không tìm thấy loại phòng",
      );
    }

    return {
      ...StudentFacilityMapper.room(
        room,
        roomType,
        beds.filter((bed) => bed.status === "EMPTY").length,
        beds.length,
      ),
      building: StudentFacilityMapper.building(building),
      beds: beds.map(StudentFacilityMapper.bed),
    };
  }

  async getEmptyBeds(roomId: string) {
    const room = await this.rooms.findById(roomId);
    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
    }
    if (room.status !== "AVAILABLE") {
      throw new AppError(
        409,
        "ROOM_NOT_AVAILABLE",
        "Phòng hiện không khả dụng",
      );
    }

    return (await this.beds.findByRoomId(roomId))
      .filter((bed) => bed.status === "EMPTY")
      .map(StudentFacilityMapper.bed);
  }
}
