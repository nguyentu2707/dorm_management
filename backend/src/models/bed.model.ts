export interface Bed {
  roomId: string;
  bedNumber: string;
  status: "EMPTY" | "OCCUPIED";
  createdAt: Date;
  updatedAt: Date;
}
export type BedDocument = Bed & { id: string };
