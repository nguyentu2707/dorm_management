import { JwtTokenService } from "../services/token.service.js";
import { BcryptPasswordHasher } from "../services/password-hasher.service.js";
import { MongoTransactionManager } from "../services/transaction-manager.js";
import { UserRepository } from "../repositories/implementations/user.repository.js";
import { StudentRepository } from "../repositories/implementations/student.repository.js";
import { BuildingRepository } from "../repositories/implementations/building.repository.js";
import { RoomTypeRepository } from "../repositories/implementations/room-type.repository.js";
import { RoomRepository } from "../repositories/implementations/room.repository.js";
import { BedRepository } from "../repositories/implementations/bed.repository.js";
import { EquipmentCategoryRepository } from "../repositories/implementations/equipment-category.repository.js";
import { EquipmentItemRepository } from "../repositories/implementations/equipment-item.repository.js";
import { AuthService } from "../services/auth.service.js";
import { BuildingService } from "../services/admin/building.service.js";
import { RoomTypeService } from "../services/admin/room-type.service.js";
import { RoomService } from "../services/admin/room.service.js";
import { BedService } from "../services/admin/bed.service.js";
import { EquipmentCategoryService } from "../services/admin/equipment-category.service.js";
import { EquipmentItemService } from "../services/admin/equipment-item.service.js";
import { AuthController } from "../controllers/auth.controller.js";
import { BuildingController } from "../controllers/admin/building.controller.js";
import { RoomTypeController } from "../controllers/admin/room-type.controller.js";
import { RoomController } from "../controllers/admin/room.controller.js";
import { BedController } from "../controllers/admin/bed.controller.js";
import { EquipmentCategoryController } from "../controllers/admin/equipment-category.controller.js";
import { EquipmentItemController } from "../controllers/admin/equipment-item.controller.js";
import { ContractRepository } from "../repositories/implementations/contract.repository.js";
import { RoomChangeRequestRepository } from "../repositories/implementations/room-change-request.repository.js";
import { ContractService } from "../services/contract.service.js";
import { RoomChangeRequestService } from "../services/room-change-request.service.js";
import { StudentContractController } from "../controllers/student/contract.controller.js";
import { AdminContractController } from "../controllers/admin/contract.controller.js";
import { StudentRoomChangeRequestController } from "../controllers/student/room-change-request.controller.js";
import { AdminRoomChangeRequestController } from "../controllers/admin/room-change-request.controller.js";
import { StudentFacilityService } from "../services/student-facility.service.js";
import { StudentProfileService } from "../services/student-profile.service.js";
import { StudentFacilityController } from "../controllers/student/facility.controller.js";
import { StudentProfileController } from "../controllers/student/profile.controller.js";
const tokenService = new JwtTokenService(),
  passwordHasher = new BcryptPasswordHasher(),
  transactionManager = new MongoTransactionManager();
const userRepository = new UserRepository(),
  studentRepository = new StudentRepository(),
  buildingRepository = new BuildingRepository(),
  roomTypeRepository = new RoomTypeRepository(),
  roomRepository = new RoomRepository(),
  bedRepository = new BedRepository(),
  equipmentCategoryRepository = new EquipmentCategoryRepository(),
  equipmentItemRepository = new EquipmentItemRepository(),
  contractRepository = new ContractRepository(),
  roomChangeRequestRepository = new RoomChangeRequestRepository();
const contractService = new ContractService(
  contractRepository,
  studentRepository,
  bedRepository,
  roomRepository,
  transactionManager,
);
const roomChangeRequestService = new RoomChangeRequestService(
  roomChangeRequestRepository,
  contractRepository,
  studentRepository,
  bedRepository,
  roomRepository,
  transactionManager,
);
const studentFacilityService = new StudentFacilityService(
  buildingRepository,
  roomRepository,
  roomTypeRepository,
  bedRepository,
);
const studentProfileService = new StudentProfileService(
  userRepository,
  studentRepository,
  transactionManager,
);
export const container = {
  tokenService,
  authController: new AuthController(
    new AuthService(
      userRepository,
      studentRepository,
      tokenService,
      passwordHasher,
      transactionManager,
    ),
  ),
  buildingController: new BuildingController(
    new BuildingService(buildingRepository, roomRepository),
  ),
  roomTypeController: new RoomTypeController(
    new RoomTypeService(roomTypeRepository, roomRepository),
  ),
  roomController: new RoomController(
    new RoomService(
      roomRepository,
      buildingRepository,
      roomTypeRepository,
      bedRepository,
      equipmentItemRepository,
      transactionManager,
    ),
  ),
  bedController: new BedController(
    new BedService(bedRepository, roomRepository),
  ),
  equipmentCategoryController: new EquipmentCategoryController(
    new EquipmentCategoryService(
      equipmentCategoryRepository,
      equipmentItemRepository,
    ),
  ),
  equipmentItemController: new EquipmentItemController(
    new EquipmentItemService(
      equipmentItemRepository,
      equipmentCategoryRepository,
      roomRepository,
    ),
  ),
  studentContractController: new StudentContractController(contractService),
  adminContractController: new AdminContractController(contractService),
  studentRoomChangeRequestController: new StudentRoomChangeRequestController(
    roomChangeRequestService,
  ),
  adminRoomChangeRequestController: new AdminRoomChangeRequestController(
    roomChangeRequestService,
  ),
  studentFacilityController: new StudentFacilityController(
    studentFacilityService,
  ),
  studentProfileController: new StudentProfileController(studentProfileService),
};
