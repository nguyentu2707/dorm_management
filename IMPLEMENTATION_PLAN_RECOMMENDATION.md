# Room Recommendation Implementation Plan

## Findings

- No `LifestyleProfile` model, API, data reference, `noiseTolerance`, `cleanliness`, or `sleepTime` exists. The only prior recommendation code is a frontend “coming soon” placeholder, so `RoomPreference + optional ClassSchedule` cleanly replaces that concept without migration risk.
- `RoomType` currently contains only `name`, `capacity`, `pricePerMonth`, and optional `description`. No `tier` will be added.
- Equipment is normalized as `EquipmentItem(roomId, categoryId, condition, serialNumber...)` → `EquipmentCategory(name...)`. Hot water will be derived from a GOOD/NEW item whose normalized category name is `bình nóng lạnh`; no building-name or room boolean shortcut.
- MongoDB is currently unreachable at `127.0.0.1:27017`, so actual Building/Room/Bed/occupancy counts cannot be claimed before implementation. The demo seed will query and log them at runtime and never hardcode Bed totals.

## Design

- Price buckets are derived from current prices, without schema changes: `LOW <= 1,300,000`, `MEDIUM <= 1,800,000`; `ANY` disables price matching. These stable thresholds live in recommendation constants and can be configured later.
- Candidate extraction is one repository aggregate: AVAILABLE rooms with at least one EMPTY Bed, joined with RoomType, Building, Equipment, ACTIVE residents, and resident schedules. The service does not import Mongoose Models.
- Base weights: price 40%, amenity 30%, availability 20%, occupancy 10%. Missing optional preferences are removed and remaining weights are renormalized. Availability always applies.
- Per-room level: BASIC if requester has no schedule, room is empty, or coverage is zero; PARTIAL for `0 < coverage < 0.6`; PERSONALIZED for `coverage >= 0.6`.
- Adaptive blend: BASIC 100/0, PARTIAL 70/30, PERSONALIZED 50/50 (base/schedule). Schedule similarity is deterministic binary-vector cosine similarity over 7 days × 10 periods.
- Demo occupancy target uses `Math.round(totalBeds * 0.85)`. It only fills `max(0, target-existingOccupied)` stable-order EMPTY Beds and never releases/deletes existing data.
