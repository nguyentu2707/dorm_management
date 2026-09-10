import { z } from "zod";

const uuid = z.string().uuid("INVALID_ID");
const wrapParams = (params: z.ZodType) =>
  z.object({ body: z.any(), params, query: z.any() });

export const studentBuildingIdSchema = wrapParams(
  z.object({ buildingId: uuid }),
);
export const studentRoomIdSchema = wrapParams(z.object({ roomId: uuid }));
