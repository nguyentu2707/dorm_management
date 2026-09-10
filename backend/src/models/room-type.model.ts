export interface RoomType {
  name: string;
  capacity: number;
  pricePerMonth: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type RoomTypeDocument = RoomType & { id: string };
