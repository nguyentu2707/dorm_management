import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type { AuthRequest } from "../types/common.types.js";
export const requestId: RequestHandler = (request: AuthRequest, response, next) => {
  request.requestId = randomUUID();
  response.setHeader("X-Request-Id", request.requestId);
  next();
};
