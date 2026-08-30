import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "INVALID_ID");
const wrapParams = (params: z.ZodType) =>
  z.object({ body: z.any(), params, query: z.any() });

export const studentBuildingIdSchema = wrapParams(
  z.object({ buildingId: objectId }),
);
export const studentRoomIdSchema = wrapParams(z.object({ roomId: objectId }));
