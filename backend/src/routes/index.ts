import { Router } from "express";
import { studentPaymentRouter, adminPaymentRouter } from "./payment.routes.js";
import { authRouter } from "./auth.routes.js";
import { adminRouter } from "./admin/admin.routes.js";
import { adminContractRouter } from "./admin/contract.routes.js";
import { adminRoomChangeRouter } from "./admin/room-change-request.routes.js";
import { studentContractRouter } from "./student/contract.routes.js";
import { studentRoomChangeRouter } from "./student/room-change-request.routes.js";
import { studentFacilityRouter } from "./student/facility.routes.js";
import { studentProfileRouter } from "./student/profile.routes.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { container } from "../config/container.js";
import { adminNotificationRouter } from "./admin/notification.routes.js";
import { studentNotificationRouter } from "./student/notification.routes.js";
import { studentMaintenanceRouter } from "./student/maintenance-request.routes.js";
import { adminMaintenanceRouter } from "./admin/maintenance-request.routes.js";
import { studentPersonalizationRouter } from "./student/personalization.routes.js";
import { studentCheckoutRouter } from "./student/checkout-request.routes.js";
import { adminCheckoutRouter } from "./admin/checkout-request.routes.js";
import { studentResidenceHistoryRouter } from "./student/residence-history.routes.js";
import { adminResidenceHistoryRouter } from "./admin/residence-history.routes.js";
import { adminUtilityReadingRouter } from "./admin/utility-reading.routes.js";
import { studentUtilityReadingRouter } from "./student/utility-reading.routes.js";
import { adminMonthlyBillingRouter } from "./admin/monthly-billing.routes.js";
import { studentInvoiceRouter } from "./student/invoice.routes.js";
import { adminStudentRegistryRouter } from "./admin/student-registry.routes.js";
export const apiRouter = Router();
apiRouter.use("/auth", authRouter);
apiRouter.use(
  "/student",
  authenticate(container.tokenService, container.userRepository),
  authorize("STUDENT"),
  studentContractRouter,
  studentRoomChangeRouter,
  studentFacilityRouter,
  studentProfileRouter,
  studentNotificationRouter,
  studentMaintenanceRouter,
  studentPersonalizationRouter,
  studentCheckoutRouter,
  studentResidenceHistoryRouter,
  studentUtilityReadingRouter,
  studentInvoiceRouter,
  studentPaymentRouter,
);
apiRouter.use(
  "/admin",
  authenticate(container.tokenService, container.userRepository),
  authorize("ADMIN"),
  adminContractRouter,
  adminRoomChangeRouter,
  adminNotificationRouter,
  adminMaintenanceRouter,
  adminCheckoutRouter,
  adminResidenceHistoryRouter,
  adminUtilityReadingRouter,
  adminMonthlyBillingRouter,
  adminPaymentRouter,
  adminStudentRegistryRouter,
  adminRouter,
);
