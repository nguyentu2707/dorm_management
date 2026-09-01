# Room Preference, Schedule and Recommendation — Delivery Report

## Existing-code audit

- No LifestyleProfile implementation or stored legacy lifestyle fields were found. The old code was only a `COMING_SOON` frontend placeholder. The new RoomPreference design is now the sole room-needs form.
- RoomType remains unchanged: `name`, `capacity`, `pricePerMonth`, `description`. No `tier` field was added.
- Hot water is derived generically from GOOD/NEW EquipmentItem records joined to an EquipmentCategory named “Bình nóng lạnh”. Building names are not used by feature logic.

## Scoring

- Candidate: Room `AVAILABLE` and at least one EMPTY Bed.
- Price buckets: LOW ≤ 1,300,000; MEDIUM > 1,300,000 and ≤ 1,800,000. Price mismatches reduce score but never filter a room.
- Base signals: price 40%, hot-water amenity 30%, availability 20%, occupancy preference 10%. Missing/ANY signals are excluded and weights are renormalized.
- Schedule: cosine similarity over a derived 7 × 10 binary vector; residents without schedules are ignored.
- Coverage = scheduled active residents / all active residents. Empty rooms use coverage 0.
- Per-item level: BASIC when requester lacks schedule or room coverage is 0; PARTIAL for `0 < coverage < 0.6`; PERSONALIZED at coverage ≥ 0.6.
- Blend: BASIC 100/0, PARTIAL 70/30, PERSONALIZED 50/50 (base/schedule).
- Reasons are emitted only from signals actually scored; no LLM or invented explanation.

## API and UI delivered

- `GET/PUT/DELETE /api/v1/student/room-preference/me`
- `GET/PUT/DELETE /api/v1/student/class-schedule/me`
- `GET /api/v1/student/room-recommendations?limit=5` (max 10)
- Student registration now shows recommendation cards on the left and the synchronized manual Building → Room → Bed flow on the right.
- Selecting a recommendation clears Bed selection and refetches live EMPTY Beds; recommendations do not reserve anything.
- Preference form is optional. `/student/schedule` is an optional weekly period grid and is not in the main sidebar.
- Open-contract errors are handled without exposing Axios text; the existing contract check redirects the student to `/student/room`.

## Demo seed

- Added `npm run seed:demo-students` and a production guard.
- Runtime diagnostics query actual Buildings, Rooms, total/EMPTY/OCCUPIED Beds before seeding.
- Target is `Math.round(totalBeds * 0.85)`; only the positive shortfall is filled, in Building/Room/Bed stable order.
- Accounts, hashed passwords and ACTIVE contracts use AuthService and ContractService. No direct User/Contract creation occurs.
- Resident schedule coverage target is `round(residentCount × 0.65)` and preference coverage is `round(residentCount × 0.50)` using deterministic MORNING/AFTERNOON/MIXED distributions.
- Two non-resident accounts are ensured: `recommend.morning@dormitory.local` and `recommend.medium@dormitory.local`.
- The existing dormitory infrastructure seed already ensures exactly one deterministic GOOD hot-water item for each Building B room and none for Building A.
- Post-seed verification reports active contracts on non-occupied Beds, duplicate ACTIVE contracts per Bed, and FULL rooms containing EMPTY Beds without altering unrelated records.

## Test results

- Backend build: PASS.
- Recommendation tests: PASS 4/4.
- Frontend build: PASS. Existing Zod annotation and >500 kB bundle warnings remain.
- Demo seed runtime: BLOCKED before writes with `ECONNREFUSED 127.0.0.1:27017` because the local MongoDB service is stopped.
- Real Beds before seed, target occupancy, final occupancy, residents created, and actual coverage: unavailable due to the database blocker. No values are inferred or hardcoded.

## Main files

- Models: `room-preference.model.ts`, `class-schedule.model.ts`
- Config/scoring: `config/recommendation.ts`, `room-recommendation.service.ts`
- Repository aggregate: `room-recommendation.repository.ts`
- APIs: `personalization.controller.ts`, `personalization.routes.ts`, `personalization.validator.ts`
- Seed: `scripts/seed-demo-students.ts`, `demo-seed.repository.ts`
- Frontend: `recommendation.api.ts`, `RoomRecommendationPanel.tsx`, `RoomRegistrationPage.tsx`, `SchedulePage.tsx`
- Tests: `tests/room-recommendation.test.mjs`

## Known limitations

- Actual seed/idempotency/occupancy verification requires a running MongoDB replica set because core Contract operations intentionally require real transactions.
- Price thresholds are code configuration, not admin-managed settings.
- Schedule comparison represents class-period overlap only; it does not infer lifestyle, personality, gender, or travel time.
- Initial frontend bundle is ~515 kB; route-level lazy loading is a separate optimization.
