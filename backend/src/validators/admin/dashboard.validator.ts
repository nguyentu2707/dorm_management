import { z } from "zod";

export const dashboardTrends = z.object({
  body: z.any(),
  params: z.any(),
  query: z.object({
    months: z.coerce.number().int().min(1).max(12).default(6),
  }),
});
