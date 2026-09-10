export const BILLING_FEE_CONFIG = Object.freeze({
  electricityPerKwh: 3_500,
  waterPerM3: 15_000,
  wifiPerRoomMonth: 100_000,
  trashPerRoomMonth: 30_000,
});

export type BillingFeeConfig = typeof BILLING_FEE_CONFIG;
