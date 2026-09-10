import { Router } from "express"; import { container as c } from "../../config/container.js"; import { validate } from "../../middlewares/validate.js"; import * as v from "../../validators/admin/admin.validator.js";
export const adminResidenceHistoryRouter = Router();
adminResidenceHistoryRouter.get("/students/:studentId/residence-history", validate(v.idParams("studentId")), c.adminResidenceHistoryController.get);
