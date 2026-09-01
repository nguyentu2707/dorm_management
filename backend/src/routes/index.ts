import { Router } from "express";
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
export const apiRouter = Router();
apiRouter.use("/auth", authRouter);
apiRouter.use(
  "/student",
  authenticate(container.tokenService),
  authorize("STUDENT"),
  studentContractRouter,
  studentRoomChangeRouter,
  studentFacilityRouter,
  studentProfileRouter,
  studentNotificationRouter,
  studentMaintenanceRouter,
  studentPersonalizationRouter,
);
apiRouter.use(
  "/admin",
  authenticate(container.tokenService),
  authorize("ADMIN"),
  adminContractRouter,
  adminRoomChangeRouter,
  adminNotificationRouter,
  adminMaintenanceRouter,
  adminRouter,
);
