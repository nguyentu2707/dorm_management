import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { translatePostgresError } from "../database/postgres-errors.js";
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const translated = translatePostgresError(err);
  const error =
    translated ??
    new AppError(500, "INTERNAL_SERVER_ERROR", "Lỗi máy chủ nội bộ");
  if (!translated)
    console.error("Unhandled server error", {
      name: err instanceof Error ? err.name : "Unknown",
    });
  res
    .status(error.statusCode)
    .json({ success: false, message: error.message, code: error.code });
};
