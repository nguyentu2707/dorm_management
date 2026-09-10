import { z } from "zod";
const id = z.string().uuid("INVALID_ID");
const base = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(2000),
});
const target = z.discriminatedUnion("targetScope", [
  base.extend({
    targetScope: z.literal("ALL"),
    targetBuildingId: z.never().optional(),
    targetStudentId: z.never().optional(),
  }),
  base.extend({
    targetScope: z.literal("BUILDING"),
    targetBuildingId: id,
    targetStudentId: z.never().optional(),
  }),
  base.extend({
    targetScope: z.literal("SPECIFIC_STUDENT"),
    targetStudentId: id,
    targetBuildingId: z.never().optional(),
  }),
]);
export const createNotification = z.object({
  body: target,
  params: z.object({}),
  query: z.object({}),
});
export const adminListNotifications = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    targetScope: z.enum(["ALL", "BUILDING", "SPECIFIC_STUDENT"]).optional(),
    search: z.string().trim().optional(),
  }),
});
export const studentListNotifications = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    isRead: z.enum(["true", "false"]).optional(),
  }),
});
export const notificationId = z.object({
  body: z.object({}),
  params: z.object({ notificationId: id }),
  query: z.object({}),
});
