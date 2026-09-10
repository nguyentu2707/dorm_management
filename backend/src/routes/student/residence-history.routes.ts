import { Router } from "express"; import { container as c } from "../../config/container.js";
export const studentResidenceHistoryRouter = Router();
studentResidenceHistoryRouter.get("/residence-history/me", c.studentResidenceHistoryController.mine);
