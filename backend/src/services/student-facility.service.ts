import type { IBuildingRepository } from "../repositories/interfaces/building.repository.interface.js";
import type { IRoomRepository } from "../repositories/interfaces/room.repository.interface.js";
import type { IRoomTypeRepository } from "../repositories/interfaces/room-type.repository.interface.js";
import type { IBedRepository } from "../repositories/interfaces/bed.repository.interface.js";
import { AppError } from "../errors/AppError.js";
import { StudentFacilityMapper } from "../mappers/student-facility.mapper.js";
import type { IStudentRepository } from "../repositories/interfaces/student.repository.interface.js";
import { assertPlacementAllowed, isGenderCompatible } from "./building-placement.js";

export class StudentFacilityService {
  constructor(
    private buildings: IBuildingRepository,
    private rooms: IRoomRepository,
    private roomTypes: IRoomTypeRepository,
    private beds: IBedRepository,
    private students: IStudentRepository,
  ) {}

  async getBuildings(userId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    return (await this.buildings.findAll())
      .filter((building) => building.status === "ACTIVE" && isGenderCompatible(student.gender, building.allowedGender))
      .map(StudentFacilityMapper.building);
  }

  async getRooms(userId: string, buildingId: string) {
    const [student, building] = await Promise.all([this.students.findByUserId(userId), this.buildings.findById(buildingId)]);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    if (!building) {
      throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    }
    assertPlacementAllowed(student, building);

    const result = await this.rooms.findByBuildingId(buildingId, {
      page: 1,
      limit: 100,
      status: "AVAILABLE",
    });

    const [types, occupancy] = await Promise.all([
      this.roomTypes.findAll(),
      this.beds.summarizeByRoomIds(result.items.map((room) => room.id)),
    ]);
    const typesById = new Map(types.map((type) => [type.id, type]));
    const rooms = result.items.map((room) => {
      const roomType = typesById.get(room.roomTypeId);
      if (!roomType) return null;
      const summary = occupancy.get(room.id);
      const emptyBedCount = summary?.empty ?? 0;
      if (emptyBedCount === 0) return null;

      return StudentFacilityMapper.room(
        room,
        roomType,
        emptyBedCount,
        summary?.total ?? 0,
      );
    });

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

  async getEmptyBeds(userId: string, roomId: string) {
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
    const [student, building] = await Promise.all([
      this.students.findByUserId(userId),
      this.buildings.findById(room.buildingId),
    ]);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên");
    if (!building) throw new AppError(404, "BUILDING_NOT_FOUND", "Không tìm thấy tòa nhà");
    assertPlacementAllowed(student, building);

    return (await this.beds.findByRoomId(roomId))
      .filter((bed) => bed.status === "EMPTY")
      .map(StudentFacilityMapper.bed);
  }
}
