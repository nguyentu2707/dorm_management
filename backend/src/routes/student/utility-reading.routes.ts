import { Router } from "express";
import { container as c } from "../../config/container.js";
export const studentUtilityReadingRouter = Router();
studentUtilityReadingRouter.get(
  "/utility-readings/me",
  c.studentUtilityReadingController.mine,
);
