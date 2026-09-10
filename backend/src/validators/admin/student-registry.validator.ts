import { z } from "zod";
import { STUDENT_REGISTRY_STATUSES } from "../../models/student-registry.model.js";
const id = z.string().uuid("ID không hợp lệ");
const identity = z.object({
  studentCode: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.coerce.date().optional(),
});
const wrap = (body: z.ZodType = z.any(), params: z.ZodType = z.any(), query: z.ZodType = z.any()) => z.object({ body, params, query });
export const registryList = wrap(z.any(), z.any(), z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  status: z.enum(STUDENT_REGISTRY_STATUSES).optional(),
}));
export const registryId = wrap(z.any(), z.object({ registryId: id }), z.any());
export const registryCreate = wrap(identity.strict());
export const registryUpdate = wrap(identity.partial().strict(), z.object({ registryId: id }), z.any());
export const registryAvailability = wrap(z.object({ status: z.enum(["AVAILABLE", "DISABLED"]) }).strict(), z.object({ registryId: id }), z.any());
