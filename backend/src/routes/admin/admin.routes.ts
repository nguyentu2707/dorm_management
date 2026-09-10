import { Router } from "express";
import { container as c } from "../../config/container.js";
import { validate } from "../../middlewares/validate.js";
import * as v from "../../validators/admin/admin.validator.js";
export const adminRouter = Router();
adminRouter.get("/dashboard/summary", c.adminDashboardController.summary);
adminRouter
  .get("/students", validate(v.studentList), c.adminStudentController.list)
  .get(
    "/students/:studentId",
    validate(v.idParams("studentId")),
    c.adminStudentController.get,
  )
  .patch(
    "/students/:studentId/account-status",
    validate(v.studentAccountStatus),
    c.adminStudentController.accountStatus,
  );
adminRouter
  .get("/buildings", c.buildingController.list)
  .get(
    "/buildings/:buildingId",
    validate(v.idParams("buildingId")),
    c.buildingController.get,
  )
  .get(
    "/buildings/:buildingId/overview",
    validate(v.idParams("buildingId")),
    c.buildingController.overview,
  )
  .post("/buildings", validate(v.buildingCreate), c.buildingController.create)
  .patch(
    "/buildings/:buildingId",
    validate(v.buildingUpdate),
    c.buildingController.update,
  )
  .delete("/buildings/:buildingId", c.buildingController.delete);
adminRouter
  .get("/room-types", c.roomTypeController.list)
  .get("/room-types/:roomTypeId", c.roomTypeController.get)
  .post("/room-types", validate(v.roomTypeCreate), c.roomTypeController.create)
  .patch(
    "/room-types/:roomTypeId",
    validate(v.roomTypeUpdate),
    c.roomTypeController.update,
  )
  .delete("/room-types/:roomTypeId", c.roomTypeController.delete);
adminRouter
  .get("/buildings/:buildingId/rooms", c.roomController.list)
  .post(
    "/buildings/:buildingId/rooms",
    validate(v.roomCreate),
    c.roomController.create,
  )
  .get("/rooms/:roomId", c.roomController.get)
  .patch("/rooms/:roomId", validate(v.roomUpdate), c.roomController.update)
  .patch(
    "/rooms/:roomId/status",
    validate(v.roomStatus),
    c.roomController.status,
  )
  .delete("/rooms/:roomId", c.roomController.delete)
  .get("/rooms/:roomId/beds", c.bedController.list);
adminRouter
  .get("/equipment-categories", c.equipmentCategoryController.list)
  .post(
    "/equipment-categories",
    validate(v.categoryCreate),
    c.equipmentCategoryController.create,
  )
  .patch(
    "/equipment-categories/:categoryId",
    validate(v.categoryUpdate),
    c.equipmentCategoryController.update,
  )
  .delete(
    "/equipment-categories/:categoryId",
    c.equipmentCategoryController.delete,
  );
adminRouter
  .get(
    "/equipment",
    validate(v.equipmentList),
    c.equipmentItemController.listAll,
  )
  .get("/rooms/:roomId/equipment", c.equipmentItemController.list)
  .post(
    "/rooms/:roomId/equipment",
    validate(v.equipmentCreate),
    c.equipmentItemController.create,
  )
  .get("/equipment/:equipmentId", c.equipmentItemController.get)
  .patch(
    "/equipment/:equipmentId",
    validate(v.equipmentUpdate),
    c.equipmentItemController.update,
  )
  .patch(
    "/equipment/:equipmentId/condition",
    validate(v.equipmentCondition),
    c.equipmentItemController.condition,
  )
  .delete("/equipment/:equipmentId", c.equipmentItemController.delete);
