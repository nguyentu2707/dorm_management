export const INVOICE_ITEM_TYPES = [
  "ROOM_FEE",
  "ELECTRICITY",
  "WATER",
  "WIFI",
  "TRASH",
] as const;
export type InvoiceItemType = (typeof INVOICE_ITEM_TYPES)[number];
export interface InvoiceItem {
  invoiceId: string;
  type: InvoiceItemType;
  description: string;
  amount: number;
  calculationNote: string;
  createdAt: Date;
  updatedAt: Date;
}
export type InvoiceItemDocument = InvoiceItem & { id: string };
