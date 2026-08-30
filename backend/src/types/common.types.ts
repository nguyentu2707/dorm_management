import type { Request } from "express";

export const ROLES = ["STUDENT", "ADMIN", "STAFF"] as const;
export type Role = (typeof ROLES)[number];
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
export type PaginatedResult<T> = { items: T[]; pagination: Pagination };
export interface AuthRequest extends Request {
  user?: { userId: string; role: Role };
}

export const paginationFrom = (page = 1, limit = 20) => ({
  page: Math.max(1, page),
  limit: Math.min(100, Math.max(1, limit)),
});
