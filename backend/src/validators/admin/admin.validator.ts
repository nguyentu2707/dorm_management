import { z } from "zod";
import { ROOM_STATUSES } from "../../models/room.model.js";
import { EQUIPMENT_CONDITIONS } from "../../models/equipment-item.model.js";
const id = z.string().regex(/^[a-f\d]{24}$/i, "ID không hợp lệ");
const wrap = (
  body: z.ZodType = z.any(),
  params: z.ZodType = z.any(),
  query: z.ZodType = z.any(),
) => z.object({ body, params, query });
export const idParams = (key: string) =>
  wrap(z.any(), z.object({ [key]: id }), z.any());
export const buildingCreate = wrap(
  z.object({
    name: z.string().trim().min(1).max(100),
    address: z.string().optional(),
    description: z.string().optional(),
  }),
);
export const buildingUpdate = wrap(
  z
    .object({
      name: z.string().trim().min(1).max(100),
      address: z.string().optional(),
      description: z.string().optional(),
    })
    .partial(),
);
export const roomTypeCreate = wrap(
  z.object({
    name: z.string().trim().min(1),
    capacity: z.number().int().positive(),
    pricePerMonth: z.number().nonnegative(),
    description: z.string().optional(),
  }),
);
export const roomTypeUpdate = wrap(
  z
    .object({
      name: z.string().trim().min(1),
      capacity: z.number().int().positive(),
      pricePerMonth: z.number().nonnegative(),
      description: z.string().optional(),
    })
    .partial(),
);
export const roomCreate = wrap(
  z.object({
    roomTypeId: id,
    roomNumber: z.string().trim().min(1),
    floor: z.number().int().nonnegative(),
    status: z.enum(ROOM_STATUSES).optional(),
  }),
);
export const roomUpdate = wrap(
  z.object({
    roomTypeId: id.optional(),
    roomNumber: z.string().trim().min(1).optional(),
    floor: z.number().int().nonnegative().optional(),
  }),
);
export const roomStatus = wrap(z.object({ status: z.enum(ROOM_STATUSES) }));
export const categoryCreate = wrap(
  z.object({
    name: z.string().trim().min(1),
    unit: z.string().trim().min(1),
    defaultLifespanMonths: z.number().int().positive().optional(),
  }),
);
export const categoryUpdate = wrap(
  z
    .object({
      name: z.string().trim().min(1),
      unit: z.string().trim().min(1),
      defaultLifespanMonths: z.number().int().positive(),
    })
    .partial(),
);
export const equipmentCreate = wrap(
  z.object({
    categoryId: id,
    serialNumber: z.string().trim().min(1).optional(),
    condition: z.enum(EQUIPMENT_CONDITIONS).default("NEW"),
    purchaseDate: z.coerce.date().optional(),
    purchasePrice: z.number().nonnegative().optional(),
  }),
);
export const equipmentUpdate = wrap(
  z.object({
    categoryId: id.optional(),
    serialNumber: z.string().trim().min(1).optional(),
    purchaseDate: z.coerce.date().optional(),
    purchasePrice: z.number().nonnegative().optional(),
  }),
);
export const equipmentCondition = wrap(
  z.object({ condition: z.enum(EQUIPMENT_CONDITIONS) }),
);
const paginationQuery = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export const studentList = wrap(
  z.any(),
  z.any(),
  z.object({
    ...paginationQuery,
    search: z.string().trim().max(100).optional(),
    faculty: z.string().trim().max(100).optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  }),
);
export const equipmentList = wrap(
  z.any(),
  z.any(),
  z.object({
    ...paginationQuery,
    search: z.string().trim().max(100).optional(),
    categoryId: id.optional(),
    roomId: id.optional(),
    buildingId: id.optional(),
    condition: z.enum(EQUIPMENT_CONDITIONS).optional(),
  }),
);
