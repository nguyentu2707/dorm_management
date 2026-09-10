export interface RoomBillingCursor {
  roomId: string;
  latestFinalizedBillingPeriod: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
export type RoomBillingCursorDocument = RoomBillingCursor & { id: string };
