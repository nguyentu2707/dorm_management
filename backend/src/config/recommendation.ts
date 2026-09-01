export const MAX_CLASS_PERIOD = 10;
export const PERSONALIZED_THRESHOLD = 0.6;
export const ROOM_PRICE_BUCKETS = { LOW_MAX: 1_300_000, MEDIUM_MAX: 1_800_000 } as const;
export const BASE_SIGNAL_WEIGHTS = { price: 0.4, amenity: 0.3, availability: 0.2, occupancy: 0.1 } as const;
export const ADAPTIVE_WEIGHTS = {
  BASIC: { base: 1, schedule: 0 },
  PARTIAL: { base: 0.7, schedule: 0.3 },
  PERSONALIZED: { base: 0.5, schedule: 0.5 },
} as const;
