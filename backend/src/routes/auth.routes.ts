import { Router } from "express";
import { container } from "../config/container.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/authenticate.js";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "../validators/auth.validator.js";
export const authRouter = Router();
authRouter.post(
  "/register",
  validate(registerSchema),
  container.authController.register,
);
authRouter.post(
  "/logout",
  validate(logoutSchema),
  container.authController.logout,
);
authRouter.post(
  "/logout-all",
  authenticate(container.tokenService, container.userRepository),
  container.authController.logoutAll,
);
authRouter.post(
  "/login",
  validate(loginSchema),
  container.authController.login,
);
authRouter.post(
  "/refresh-token",
  validate(refreshSchema),
  container.authController.refresh,
);
authRouter.get(
  "/me",
  authenticate(container.tokenService, container.userRepository),
  container.authController.me,
);
