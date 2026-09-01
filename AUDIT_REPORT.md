# Dormitory Management System — Audit Report

Audit date: 2026-09-01

This report was created after source tracing and build checks, before corrective code changes. Runtime seed/E2E execution is currently blocked because the local MongoDB service is stopped and cannot be started by the current account (`ECONNREFUSED 127.0.0.1:27017`). Runtime-only assertions are marked BLOCKED rather than PASS.

## 1. System map

| Module | Backend layers | Frontend | Main rules / states | Dependencies |
|---|---|---|---|---|
| Auth | User, Student; repositories; AuthService; AuthController; `/auth` | Login, Register, AuthProvider, route guards | Register always creates STUDENT; access/refresh secrets differ; ACTIVE users only | transaction manager, password hasher, JWT |
| Users | User, Student, Staff | Student list/detail/profile | ADMIN/STUDENT/STAFF roles; Staff position used by maintenance | Auth, Contract |
| Dormitory | Building, RoomType, Room, Bed | building/room/resource pages, room detail/registration | RoomType drives capacity/price; create Room creates Beds; room state AVAILABLE/FULL/MAINTENANCE/LOCKED | Equipment, Contract |
| Equipment | EquipmentCategory, EquipmentItem | room equipment panel; hidden global/category pages remain routed | equipment belongs to one Room; serial is sparse-unique | Room, Maintenance |
| Contract | Contract | admin contract list/detail; student room/registration | PENDING → ACTIVE/REJECTED/CANCELLED; ACTIVE → ENDED/CANCELLED; student dates server-owned | Student, Room, Bed, transaction manager |
| Room change | RoomChangeRequest | student/admin room-change pages | PENDING → APPROVED/REJECTED/CANCELLED; approval ends old contract and preserves endDate | Contract, Bed, Room, transaction manager |
| Maintenance | MaintenanceRequest, Staff | student/admin maintenance pages | ACTIVE contract required to create; equipment must be in derived room; PENDING/IN_PROGRESS → RESOLVED/CANCELLED | Student, Contract, Equipment, Staff |
| Notification | Notification, NotificationRecipient | student/admin notification pages, bell/count | ALL/BUILDING/SPECIFIC_STUDENT; recipient ownership; idempotent read | Student, active Contract, Building, transaction manager |
| Dashboard | aggregate queries | admin/student dashboards | independent frontend sections via `Promise.allSettled` | all operational modules |

Request architecture is generally Route → authenticate → authorize → validate → Controller → Service → Repository → Mongoose. `AdminDashboardService` directly uses Mongoose models and is an ARCHITECTURE VIOLATION.

## 2. Modules found

Auth, User/Student/Staff, Building, RoomType, Room, Bed, EquipmentCategory, EquipmentItem, Contract, RoomChangeRequest, MaintenanceRequest, Notification, NotificationRecipient, Admin Dashboard, Student Profile and Student Facilities.

## 3. Golden path result

| Step | Result | Evidence |
|---|---|---|
| Seed dormitory | BLOCKED | MongoDB connection refused before execution |
| Seed admin | BLOCKED | Same environment blocker |
| Register/login/browse/register/approve | BLOCKED runtime; PASS static trace | Routes, validators and service calls exist |
| Student sees ACTIVE | PASS static trace | `/student/contracts/me/active`; Room page distinguishes NONE/PENDING/ACTIVE |
| Maintenance create/resolve | PARTIAL | Backend flow exists; admin assignment UI requires raw Staff ID |
| Notification send/read | PASS static trace | recipient ownership and idempotent update implemented |
| Room change/approve/new room | PASS static trace | transaction flow preserves old contract endDate |

## 4. Negative-flow result

| Flow | Result |
|---|---|
| Inject ADMIN role at registration | PASS static: registration schema strips unknown role and service hard-codes STUDENT |
| Access token as refresh token | PASS static: separate refresh secret/verifier |
| Student accesses admin API | PASS static: `/admin` requires ADMIN |
| Second contract while PENDING/ACTIVE | PASS static plus unique partial index per student |
| Two approvals for same Bed | PASS only with real transaction: atomic `occupyIfEmpty`; unsafe standalone fallback found |
| Maintenance without ACTIVE contract | PASS static |
| Equipment from another room | PASS static |
| Room change same/occupied Bed | PASS static |
| Read another student's notification | PASS static: recipient-scoped lookup returns 404 |
| Building notification without recipients | PASS static: 409 |

## 5–11. Findings

### A. Bugs

| Severity | Module | Problem | Expected | Actual / root cause | Fix |
|---|---|---|---|---|---|
| CRITICAL | Transactions | Multi-document core flows silently execute without a transaction on standalone MongoDB | Atomic or fail safely | `MongoTransactionManager` catches unsupported transactions and reruns writes outside a transaction | Remove unsafe fallback; fail closed. Keep explicit compensation only where implemented |
| HIGH | Room delete | Room and Beds are deleted in separate non-transactional writes | Atomic delete | Bed delete can succeed before Room delete fails | Execute both through `ITransactionManager` |
| HIGH | Dormitory seed | Resume does not restore missing Beds for an existing seeded Room | Restore exact missing Beds, no duplicates | Bed creation only occurs for newly created Room | Add idempotent capacity reconciliation |
| HIGH | Maintenance UI | Assign/reassign requires manually typing `Staff._id` | Select a MAINTENANCE staff member | No Staff listing endpoint; prompt exposes storage ID | Add admin maintenance-staff endpoint and selector |
| MEDIUM | Room change API/UI | Admin list renders Student/Contract/Bed ObjectIds | Human-readable student/current room/target bed | Mapper returns only IDs and UI prints them | Enrich list DTO in one aggregate; render display fields |
| MEDIUM | Dashboard UI | Pending cards render student ObjectId | Full name + MSSV | UI ignores already-enriched Contract DTO; RoomChange DTO is not enriched | Use enriched fields |
| MEDIUM | Student maintenance | History/cancel calls require an ACTIVE contract | Existing request ownership should remain accessible after contract end | `mine` and `studentCancel` call context that requires current ACTIVE contract | Resolve student without requiring active contract for read/cancel |
| MEDIUM | Admin dashboard | Maintenance counts exist in backend but not in frontend type/cards | Show all “needs handling” counts | Type omits `maintenanceRequests`; no card | Align contract/UI |
| LOW | Frontend build | Main JS chunk is 508.61 kB | Smaller initial chunk | All routes imported eagerly | Route-level lazy loading later |

### B. Logic inconsistencies

- Transaction guarantees depend on deployment topology but `.env.example` and README do not require a replica set.
- RoomType is hidden from navigation but Room creation still exposes the backend RoomType concept. The current select is human-readable (not a raw-ID textbox), so this is acceptable compatibility; rename it to a room-tier selector for UX.
- Hidden legacy pages remain routable (`room-types`, `equipment-categories`, global `equipment`) although sidebar entries are hidden. Backend dependencies make deleting their APIs unsafe.

### C. UX problems / raw ObjectId locations

- `frontend/src/pages/admin/RoomChangeRequestsPage.tsx`: studentId, currentContractId, targetBedId rendered as labels.
- `frontend/src/pages/admin/DashboardPage.tsx`: Contract and RoomChange studentId rendered.
- `frontend/src/pages/student/ContractsPage.tsx`: bedId rendered, but route currently redirects to `/student/room`; classify as hidden compatibility code.
- `frontend/src/pages/admin/MaintenancePage.tsx`: prompt asks for Staff._id.

IDs used only as route keys, request payloads, selectors' values and React keys are valid internal use.

### D. Architecture concerns

- `backend/src/services/admin/dashboard.service.ts` imports Models directly instead of repository interfaces.
- Maintenance and RoomChange list DTOs are raw model-shaped; presentation joins are inconsistent across modules.

### N+1 audit

No per-row frontend fetch was found in Contract, Student, Room, or Notification lists. Student room/profile pages perform one detail request after loading the active contract; this is a constant two-request composition, not N+1. Contract list uses one bulk aggregation for display summaries.

### Transaction audit

| Flow | Status |
|---|---|
| Register User + Student | Transaction; explicit compensating fallback exists |
| Create Room + Beds | Transaction; explicit compensating fallback exists |
| Delete Room + Beds | FAIL: not transactional |
| Approve/end/admin-create Contract | Transaction API used, but global manager unsafe fallback breaks atomicity |
| Approve RoomChange | Same critical fallback issue |
| Create Notification + Recipients | Same critical fallback issue |

### Security audit

Role injection, admin route access, contract ownership, maintenance room derivation/equipment validation, and notification recipient ownership are enforced server-side. No confirmed authorization bypass was found. The critical transaction fallback is a data-integrity security/reliability risk, not an auth bypass.

## 12–13. Build results

- Backend `npm run build`: PASS, no TypeScript errors.
- Frontend `npm run build`: PASS. Warnings: Zod pure-comment placement and 508.61 kB chunk.

## 14–15. Files and priority fix plan

1. Data integrity: `transaction-manager.ts`, `room.service.ts`, repository interfaces/implementations.
2. Seed recovery: `seed-dormitory-data.ts`, Bed repository.
3. Broken maintenance assignment: Staff repository/service/controller/route plus frontend API/page.
4. DTO/raw IDs: RoomChange repository/mapper/service/types/pages and dashboard.
5. Medium follow-up: maintenance history access and dashboard maintenance card.

## 16. Recommended roadmap

| Direction | Business value | Difficulty | Dependencies | Demo value | Priority |
|---|---:|---:|---|---:|---|
| Maintenance improvement | High | Low–medium | Staff management, enriched DTO | High | NOW |
| Admin analytics | Medium–high | Medium | Stable invariants and reporting DTOs | High | NEXT |
| ClassSchedule + Room Recommendation | High | Medium | schedule data, preference model, explainable scoring | Very high | NEXT |
| Invoice/Payment | High | High | stable contracts, billing rules, reconciliation | High | NEXT/LATER |
| Notification improvement | Medium | Low–medium | current notification core | Medium | NEXT |
| AI Assistant/RAG | Medium | Medium | curated dorm rules/FAQ, retrieval evaluation | High | LATER |
| Schedule Management | Medium | Medium | timetable source and ownership rules | Medium | LATER unless needed for recommendation |
| Mobile App | Medium | High | stable API/auth and responsive web | High | LATER |

Room Recommendation should precede AI Assistant because it directly improves the core room-registration journey. It needs ClassSchedule/preferences/room occupancy data, a deterministic similarity/scoring service and recommendation DTO/UI; an LLM explanation is optional. The AI Assistant is a separate RAG feature requiring authoritative dormitory documents, chunking/retrieval, citations and answer-quality evaluation.

### NOW / NEXT / LATER

**NOW:** restore transaction safety; make Room deletion and seed recovery safe; fix maintenance staff selection; remove visible raw IDs; rerun seed twice and the supplied E2E audit once MongoDB is available.

**NEXT:** finish maintenance DTO/detail/filter UX, add invariant audit tooling, ClassSchedule and deterministic Room Recommendation, then admin analytics and notification UX.

**LATER:** Invoice/Payment after contract invariants are proven; RAG assistant; mobile app.

## Remediation and retest result

Applied after the report/classification above:

- FIXED CRITICAL: removed non-transactional rerun from `MongoTransactionManager`; transaction-dependent flows now fail safely when MongoDB is not a replica set.
- FIXED HIGH: Room + Beds deletion now uses the transaction manager.
- FIXED HIGH: dormitory seed reconciles missing numbered Beds up to RoomType capacity without duplicating existing Beds.
- FIXED HIGH: maintenance assignment now loads active MAINTENANCE staff through an admin endpoint and uses a selector instead of asking for `Staff._id`.
- FIXED MEDIUM (explicit raw-ID requirement): RoomChange admin DTO/list and both dashboard pending sections show full name/MSSV and room/bed labels.
- FIXED MEDIUM: maintenance history and cancellation ownership no longer incorrectly require a currently ACTIVE contract; creation/equipment still do.

Post-fix backend build: PASS. Post-fix frontend build: PASS with the same dependency/chunk warnings. Static raw-ID rescan found no direct display pattern in active pages. Runtime seed and E2E remain BLOCKED by the stopped MongoDB service; no runtime PASS is claimed.
