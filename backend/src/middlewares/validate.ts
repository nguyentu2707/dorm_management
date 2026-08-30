import type { RequestHandler } from "express";
import type { ZodType } from "zod";
export const validate =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    const r = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (!r.success) {
      const invalidId = r.error.issues.some(
        (i) => i.message === "INVALID_ID" || i.message === "ID không hợp lệ",
      );
      if (invalidId)
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
          code: "INVALID_ID",
        });
      return res.status(422).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
        errors: r.error.issues.map((i) => ({
          field: i.path.slice(1).join("."),
          message: i.message,
        })),
      });
    }
    Object.assign(req, r.data);
    next();
  };
