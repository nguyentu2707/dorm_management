import { z } from "zod";
import { DAYS_OF_WEEK } from "../../models/class-schedule.model.js";
import { OCCUPANCY_PREFERENCES, PRICE_PREFERENCES } from "../../models/room-preference.model.js";
import { MAX_CLASS_PERIOD } from "../../config/recommendation.js";
const empty = z.object({});
const wrap = (body: z.ZodType = empty, params: z.ZodType = empty, query: z.ZodType = empty) => z.object({ body, params, query });
export const preferencePut = wrap(z.object({
  pricePreference: z.enum(PRICE_PREFERENCES).optional(),
  wantsHotWater: z.boolean().nullable().optional(),
  occupancyPreference: z.enum(OCCUPANCY_PREFERENCES).optional(),
}).strict());
const entry = z.object({ dayOfWeek: z.enum(DAYS_OF_WEEK), startPeriod: z.number().int().min(1).max(MAX_CLASS_PERIOD), endPeriod: z.number().int().min(1).max(MAX_CLASS_PERIOD) }).refine((item) => item.endPeriod >= item.startPeriod, { message: "endPeriod phải lớn hơn hoặc bằng startPeriod" });
export const schedulePut = wrap(z.object({ entries: z.array(entry).max(70).superRefine((entries, ctx) => {
  entries.forEach((current, index) => entries.slice(0, index).forEach((previous) => {
    if (current.dayOfWeek === previous.dayOfWeek && current.startPeriod <= previous.endPeriod && previous.startPeriod <= current.endPeriod)
      ctx.addIssue({ code: "custom", path: [index], message: "Các khoảng lịch cùng ngày không được chồng lấn" });
  }));
}) }).strict());
export const recommendationQuery = wrap(empty, empty, z.object({ limit: z.coerce.number().int().min(1).max(10).default(5) }));
