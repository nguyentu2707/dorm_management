# Building Gender Integrity — audit and implementation plan

Date: 2026-10-05. Initial status: PARTIAL. This assessment is based on source, not the revision report.

1. Keep the existing BuildingService.update implementation: transaction, Building FOR UPDATE, then hasIncompatibleActiveResidents using contracts.status='ACTIVE'. A conflict throws HTTP 409 BUILDING_GENDER_CONFLICT_WITH_RESIDENTS before any update or audit write.
2. Keep policy revalidation in ContractService.approveContract/adminCreateContract and RoomChangeRequestService.approveRequest. Each reads the locked Building within the placement transaction.
3. Fix RoomChange lock inversion: it currently locks target Room, then Building, and later source Room. Another placement can hold source Room while waiting for that Building. Lock both Rooms in sorted ID order before Building; reuse those rows afterwards.
4. Stop seed-demo-students from rewriting existing Student.gender. Fail on incompatible/missing seed identity data, preserving existing residence. seed-dormitory-data already calls BuildingService.update, so retains ACTIVE-resident validation and transactional conflict behavior.
5. Extend PostgreSQL races for approval, direct creation, and room change to both lock acquisition orders. Use separate backend PIDs and pg_blocking_pids to verify interleaving; assert writer outcomes, rollback state, and the final ACTIVE-resident invariant. Add seed conflict coverage and a RoomChange lock-order regression test.
6. Run backend build/core tests/lint, script typecheck, frontend build/lint, and guarded PostgreSQL tests. PostgreSQL requires explicit TEST_DATABASE_URL ending in _test; never fall back to DATABASE_URL. Missing/invalid test DB means BLOCKED, not PASS.

Scope excludes Maintenance, Room status behavior, Billing, Payment, Auth, Staff, schema redesign, and unrelated refactoring. Existing working-tree changes are preserved.
