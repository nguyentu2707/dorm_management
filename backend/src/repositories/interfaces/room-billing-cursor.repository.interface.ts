import type { TransactionContext } from "../../services/transaction-manager.js";
import type { RoomBillingCursorDocument } from "../../models/room-billing-cursor.model.js";

export interface IRoomBillingCursorRepository {
  ensureForRoom(roomId: string): Promise<RoomBillingCursorDocument>;
  findByRoom(
    roomId: string,
    session?: TransactionContext,
  ): Promise<RoomBillingCursorDocument | null>;
  advance(
    roomId: string,
    expectedPeriod: string | null,
    nextPeriod: string,
    session: TransactionContext,
  ): Promise<RoomBillingCursorDocument | null>;
}
