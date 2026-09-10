import { PostgresDashboardRepository } from "../repositories/implementations/dashboard.repository.js";
import { PostgresPaymentRepository } from "../repositories/implementations/payment.repository.js";
import { PaymentService } from "../services/payment.service.js";
import { PaymentController } from "../controllers/payment.controller.js";
import { JwtTokenService } from "../services/token.service.js";
import { BcryptPasswordHasher } from "../services/password-hasher.service.js";
import { PostgresTransactionManager } from "../services/transaction-manager.js";
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
import { AdminStudentService } from "../services/admin/student.service.js";
import { AdminStudentController } from "../controllers/admin/student.controller.js";
import { AdminDashboardService } from "../services/admin/dashboard.service.js";
import { AdminDashboardController } from "../controllers/admin/dashboard.controller.js";
import { NotificationRepository } from "../repositories/implementations/notification.repository.js";
import { NotificationRecipientRepository } from "../repositories/implementations/notification-recipient.repository.js";
import { NotificationService } from "../services/notification.service.js";
import { AdminNotificationController } from "../controllers/admin/notification.controller.js";
import { StudentNotificationController } from "../controllers/student/notification.controller.js";
import { MaintenanceRequestRepository } from "../repositories/implementations/maintenance-request.repository.js";
import { StaffRepository } from "../repositories/implementations/staff.repository.js";
import { MaintenanceRequestService } from "../services/maintenance-request.service.js";
import { AdminMaintenanceRequestController } from "../controllers/admin/maintenance-request.controller.js";
import { StudentMaintenanceRequestController } from "../controllers/student/maintenance-request.controller.js";
import { RoomPreferenceRepository } from "../repositories/implementations/room-preference.repository.js";
import { ClassScheduleRepository } from "../repositories/implementations/class-schedule.repository.js";
import { RoomRecommendationRepository } from "../repositories/implementations/room-recommendation.repository.js";
import { StudentPersonalizationService } from "../services/student-personalization.service.js";
import { RoomRecommendationService } from "../services/room-recommendation.service.js";
import { StudentPersonalizationController } from "../controllers/student/personalization.controller.js";
import { CheckoutRequestRepository } from "../repositories/implementations/checkout-request.repository.js";
import { CheckoutRequestService } from "../services/checkout-request.service.js";
import { StudentCheckoutRequestController } from "../controllers/student/checkout-request.controller.js";
import { AdminCheckoutRequestController } from "../controllers/admin/checkout-request.controller.js";
import { ResidenceHistoryService } from "../services/residence-history.service.js";
import { StudentResidenceHistoryController } from "../controllers/student/residence-history.controller.js";
import { AdminResidenceHistoryController } from "../controllers/admin/residence-history.controller.js";
import { UtilityReadingRepository } from "../repositories/implementations/utility-reading.repository.js";
import { UtilityReadingService } from "../services/utility-reading.service.js";
import { AdminUtilityReadingController } from "../controllers/admin/utility-reading.controller.js";
import { StudentUtilityReadingController } from "../controllers/student/utility-reading.controller.js";
import { MonthlyBillingRepository } from "../repositories/implementations/monthly-billing.repository.js";
import { RoomBillingCursorRepository } from "../repositories/implementations/room-billing-cursor.repository.js";
import { InvoiceRepository } from "../repositories/implementations/invoice.repository.js";
import { MonthlyBillingCalculator } from "../services/monthly-billing.calculator.js";
import { MonthlyBillingService } from "../services/monthly-billing.service.js";
import { AdminMonthlyBillingController } from "../controllers/admin/monthly-billing.controller.js";
import { StudentInvoiceController } from "../controllers/student/invoice.controller.js";
import { BILLING_FEE_CONFIG } from "./billing-fees.js";
import { RefreshSessionRepository } from "../repositories/implementations/refresh-session.repository.js";
import { StudentRegistryRepository } from "../repositories/implementations/student-registry.repository.js";
import { StudentRegistryService } from "../services/admin/student-registry.service.js";
import { StudentRegistryController } from "../controllers/admin/student-registry.controller.js";
const tokenService = new JwtTokenService(),
  passwordHasher = new BcryptPasswordHasher(),
  transactionManager = new PostgresTransactionManager();
const userRepository = new UserRepository(),
  studentRepository = new StudentRepository(),
  refreshSessionRepository = new RefreshSessionRepository(),
  studentRegistryRepository = new StudentRegistryRepository(),
  buildingRepository = new BuildingRepository(),
  roomTypeRepository = new RoomTypeRepository(),
  roomRepository = new RoomRepository(),
  bedRepository = new BedRepository(),
  equipmentCategoryRepository = new EquipmentCategoryRepository(),
  equipmentItemRepository = new EquipmentItemRepository(),
  contractRepository = new ContractRepository(),
  roomChangeRequestRepository = new RoomChangeRequestRepository();
const checkoutRequestRepository = new CheckoutRequestRepository();
const utilityReadingRepository = new UtilityReadingRepository();
const monthlyBillingRepository = new MonthlyBillingRepository();
const roomBillingCursorRepository = new RoomBillingCursorRepository();
const invoiceRepository = new InvoiceRepository();
const notificationRepository = new NotificationRepository(),
  notificationRecipientRepository = new NotificationRecipientRepository();
const notificationService = new NotificationService(
  notificationRepository,
  notificationRecipientRepository,
  studentRepository,
  contractRepository,
  buildingRepository,
  transactionManager,
);
const maintenanceRequestRepository = new MaintenanceRequestRepository();
const roomPreferenceRepository = new RoomPreferenceRepository();
const classScheduleRepository = new ClassScheduleRepository();
const maintenanceRequestService = new MaintenanceRequestService(
  maintenanceRequestRepository,
  studentRepository,
  contractRepository,
  equipmentItemRepository,
  new StaffRepository(),
);
const contractService = new ContractService(
  contractRepository,
  studentRepository,
  bedRepository,
  roomRepository,
  transactionManager,
  checkoutRequestRepository,
  buildingRepository,
);
const roomChangeRequestService = new RoomChangeRequestService(
  roomChangeRequestRepository,
  contractRepository,
  studentRepository,
  bedRepository,
  roomRepository,
  transactionManager,
  checkoutRequestRepository,
  buildingRepository,
);
const checkoutRequestService = new CheckoutRequestService(
  checkoutRequestRepository,
  contractRepository,
  studentRepository,
  roomChangeRequestRepository,
  bedRepository,
  roomRepository,
  transactionManager,
);
const residenceHistoryService = new ResidenceHistoryService(
  contractRepository,
  studentRepository,
);
const utilityReadingService = new UtilityReadingService(
  utilityReadingRepository,
  roomRepository,
  buildingRepository,
  contractRepository,
  studentRepository,
  transactionManager,
);
const monthlyBillingService = new MonthlyBillingService(
  monthlyBillingRepository,
  roomBillingCursorRepository,
  invoiceRepository,
  utilityReadingRepository,
  roomRepository,
  buildingRepository,
  studentRepository,
  new MonthlyBillingCalculator(
    roomRepository,
    buildingRepository,
    contractRepository,
    utilityReadingRepository,
    BILLING_FEE_CONFIG,
  ),
  transactionManager,
);
const studentFacilityService = new StudentFacilityService(
  buildingRepository,
  roomRepository,
  roomTypeRepository,
  bedRepository,
  studentRepository,
);
const studentProfileService = new StudentProfileService(
  userRepository,
  studentRepository,
  transactionManager,
  passwordHasher,
  refreshSessionRepository,
);
export const container = {
  paymentController: new PaymentController(
    new PaymentService(
      new PostgresPaymentRepository(),
      studentRepository,
      transactionManager,
    ),
  ),
  userRepository,
  tokenService,
  adminMonthlyBillingController: new AdminMonthlyBillingController(
    monthlyBillingService,
  ),
  studentInvoiceController: new StudentInvoiceController(monthlyBillingService),
  studentCheckoutRequestController: new StudentCheckoutRequestController(
    checkoutRequestService,
  ),
  adminCheckoutRequestController: new AdminCheckoutRequestController(
    checkoutRequestService,
  ),
  studentResidenceHistoryController: new StudentResidenceHistoryController(
    residenceHistoryService,
  ),
  adminResidenceHistoryController: new AdminResidenceHistoryController(
    residenceHistoryService,
  ),
  adminUtilityReadingController: new AdminUtilityReadingController(
    utilityReadingService,
  ),
  studentUtilityReadingController: new StudentUtilityReadingController(
    utilityReadingService,
  ),
  studentPersonalizationController: new StudentPersonalizationController(
    new StudentPersonalizationService(
      studentRepository,
      roomPreferenceRepository,
      classScheduleRepository,
    ),
    new RoomRecommendationService(
      studentRepository,
      contractRepository,
      roomPreferenceRepository,
      classScheduleRepository,
      new RoomRecommendationRepository(),
    ),
  ),
  adminNotificationController: new AdminNotificationController(
    notificationService,
  ),
  studentNotificationController: new StudentNotificationController(
    notificationService,
  ),
  adminMaintenanceRequestController: new AdminMaintenanceRequestController(
    maintenanceRequestService,
  ),
  studentMaintenanceRequestController: new StudentMaintenanceRequestController(
    maintenanceRequestService,
  ),
  authController: new AuthController(
    new AuthService(
      userRepository,
      studentRepository,
      refreshSessionRepository,
      studentRegistryRepository,
      tokenService,
      passwordHasher,
      transactionManager,
    ),
  ),
  buildingController: new BuildingController(
    new BuildingService(buildingRepository, roomRepository),
  ),
  roomTypeController: new RoomTypeController(
      new RoomTypeService(roomTypeRepository, roomRepository, transactionManager),
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
  adminStudentController: new AdminStudentController(
    new AdminStudentService(
      studentRepository,
      userRepository,
      refreshSessionRepository,
      transactionManager,
    ),
  ),
  studentRegistryController: new StudentRegistryController(
    new StudentRegistryService(studentRegistryRepository),
  ),
  adminDashboardController: new AdminDashboardController(
    new AdminDashboardService(new PostgresDashboardRepository()),
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
