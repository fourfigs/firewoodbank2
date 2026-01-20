Notable Gaps / Changes Needed (updated after Stage 12 completion)

Completed in Stages 5.2-5.4:
- ✅ Client name split into first/last (Stage 5.2). Numeric client identifiers (formerly `client_number`) have been removed.
- ✅ Address/contact validation (phone format, state, ZIP, city formatting) (Stage 5.2)
- ✅ Wood size and delivery size tracking on work orders (Stage 5.2)
- ✅ Inventory reservation system (reserved_quantity tracking) (Stage 5.2)
- ✅ Driver assignment from DB (DL flag required) (Stage 5.2)
- ✅ Work order creation gated to staff/admin (Stage 5.2)
- ✅ Worker/helper assignments on deliveries (Stage 5.2)
- ✅ Created by display name on work orders (Stage 5.2)
- ✅ Driver availability scheduling with weekly schedule (Stage 5.2)
- ✅ Worker Directory tab for admin/lead (Stage 5.3)
- ✅ Reports tab with audit log viewer and time filtering (Stage 5.4)
- ✅ Inventory reservation validation added (2025-12-28) - prevents reserved_quantity exceeding available on-hand (backend validation in `adjust_inventory_for_transition_tx`).

Remaining Items:
- ✅ client_title field removed from DTOs (types.ts, ts_dtos.ts, rust_structs.rs, App.tsx). Database column retained for backwards compatibility.
- Inventory creation gating to be enforced with user CRUD/users stage (if needed)

Current Status:
- Stage 5.2: ✅ COMPLETE
- Stage 5.3: ✅ COMPLETE
- Stage 5.4: ✅ COMPLETE
- Stage 6: ✅ COMPLETE (Dashboard + Calendar + Metrics)
- Stage 7: ✅ COMPLETE (Users, Change Requests, MOTD, Login Refinement)
- Stage 8: ✅ COMPLETE (Invoices + Printing) — `stage-8-invoices`
- Stage 9: ✅ COMPLETE (Driver Mode) — `stage-9-driver`
- Stage 10: ✅ COMPLETE (HIPAA Checklist) — `stage-10-hipaa`
- Stage 11: ✅ COMPLETE (Desktop Rollout checklist) — `stage-11-desktop`
- Stage 12: ✅ COMPLETE (Sync hooks skeleton) — `stage-12-sync`

Notes:
- MOTD is surfaced on login (newest first) via list_motd/create_motd
- Audit logs persist to audit_logs table with filtering by day/7days/month/year/all
- Town derivation for volunteer view is NOT needed (old mistake) - standard contact form names should be used
- Driver availability is now integrated with weekly schedule tracking
- Auth uses `auth_users` with bcrypt hashes; seed logins include `admin/admin`, `lead/lead`, `staff/staff`, `volunteer/volunteer`, and `sketch/Sketching2!`
- For SQLx compile-time checks, run `cargo run --bin bootstrap_db` and set `DATABASE_URL` (URL-encode spaces)

Review & Improvement Suggestions (Program Structure + Workflow):
- ✅ Add a thin API layer (e.g., `src/api/*`) to wrap `invoke()` — implemented in `src/api/tauri.ts`
- ✅ Add form-level validation utilities (city/state/phone/zip) — implemented in `src/utils/validation.ts` and `src/utils/format.ts`
- ✅ Introduce a real auth flow (password reset, change password) and store password hashes only — bcrypt hashes in auth_users, change_password command exists
- ✅ Add lint/format config (ESLint/Prettier) — `.prettierrc` and `eslint.config.js` exist
- ✅ Add centralized error handling — GlobalErrorBoundary component exists
- Split `src/App.tsx` into feature modules (clients, inventory, work orders, invoices, worker directory) and centralize shared UI helpers. (App.tsx is 5000+ lines)
- Replace `window.print()` with a Tauri-side print command for consistent native printing behavior.
- Add `dev` docs for DATABASE_URL encoding and `.env` usage to avoid PowerShell pitfalls.
- Add tests: unit tests for Rust auth + work order status transitions; basic UI smoke tests for critical tabs.
- Standardize role names across UI, Rust, docs, and seeds (remove `lead` role; use `admin/staff/employee/volunteer`). NOTE: `types.ts` uses correct roles but code still references "lead" in 17 places, and `ts_dtos.ts` still has "lead".
- Split `src-tauri/src/main.rs` into command modules (e.g., `commands/users.rs`, `commands/work_orders.rs`) and move shared SQL into `db`/`services` layers. (main.rs is 3000+ lines)
- Add a `src/pages` (or `features`) directory and move tab content components out of `App.tsx` to reduce re-render scope and improve readability.
- Add DB indexes for common filters (work_orders.status, work_orders.scheduled_date, audit_logs.created_at) to keep reports and lists fast. (only is_deleted indexes exist currently)
- Add basic pagination/virtualization for large lists (clients, work orders, audit logs).

Copyable prompts (Stage 0–5) for next agent:
Stage 0 prompt
We are building a Windows desktop–first Tauri 2 + React + TypeScript + SQLite app for a Community Firewood Bank.
Design a sync‑ready schema and DTO set based on three forms: Onboard (Client), Order (WorkOrder), Invoice.
Requirements:

Entities: User, Client, InventoryItem, WorkOrder, DeliveryEvent, Invoice, MOTD, ChangeRequest.

All tables have: id (UUID string), createdAt, updatedAt, createdByUserId, updatedByUserId, isDeleted, and optionally lastSyncedAt, version.

Infer all fields from my forms and list them per entity; call out any missing/ambiguous fields and ask me questions.

Output initial Rust/SQL schema and TypeScript DTOs for these entities.

Keep names and types consistent so we can map to a future Postgres backend.

