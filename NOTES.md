Notable Gaps / Changes Needed (updated after Stage 5.4 completion)

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

Remaining Items:
- client_title field exists in schema but is old/unused - should be removed from database and code
- Inventory creation gating to be enforced with user CRUD/users stage (if needed)
- ✅ Inventory reservation validation added (2025-12-28) - prevents reserved_quantity exceeding available on-hand (backend validation in `adjust_inventory_for_transition_tx`).

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

Stage 1 prompt
Implement Stage 1: scaffold the Windows desktop Tauri app with React + TypeScript.
Tasks:

Create a Tauri 2 project targeting Windows.

Set up React + TypeScript frontend.

Add a navigation shell with pages: Dashboard, Clients, Inventory, Work Orders, Admin (and a placeholder Driver view).

Add a basic Tauri command ping that returns JSON and show a React component that calls it.
Show me the key files and edits and how to run the app (commands).

Stage 2 prompt
Implement Stage 2: SQLite integration and sync‑ready tables.
Tasks:

Add SQLite to the Tauri backend and configure migrations.

Create migrations for: User, Client, InventoryItem, WorkOrder, DeliveryEvent, Invoice, MOTD, ChangeRequest with sync fields.

Implement Rust data access for Clients and InventoryItems (CRUD).

Expose Tauri commands: createClient, updateClient, listClients, createInventoryItem, updateInventoryItem, listInventoryItems, using DTOs.

Ensure createdAt/updatedAt/isDeleted and UUIDs are handled correctly.

Stage 3 prompt
Implement Stage 3: Clients module.
Using the existing Client schema and Tauri commands, build:

Client list with search/filter.

Client detail/edit view with all onboard form fields (onboarding date, addresses, phones, email, how heard, referring agency, approvalStatus + denialReason, gateCombo, notes). Note: client_title is old/unused and should be removed. Numeric client identifiers (formerly `client_number`) have been removed from schema and UI.

Placeholders for delivery metrics (week/month/year/all‑time) derived from DeliveryEvent.
Wire up create/edit to the backend and update metadata fields automatically.

Stage 4 prompt
Implement Stage 4: Inventory module.
Using InventoryItem schema and commands, build:

Inventory list and detail views.

CRUD for items like chainsaws, bar oil, gas, 2‑stroke oil, files, helmets, helmetsWithVisorsMufflers, gloves, chaps.

Fields per item: name, category, currentQuantity, unit, reorderThreshold, isActive.

Derived: belowThreshold flag and generated orderMessage.

Expose a “Needs restock” view for later use on the dashboard/admin page.

Stage 5 prompt
Implement Stage 5: Work Orders and DeliveryEvents.
Based on the Order form, build:

WorkOrder list and detail screens with all fields (client link, client snapshot, addresses, directions, gate combo, heat source options, notes, dateOfOnboarding, scheduledDate, status).

DeliveryEvent entity tied to WorkOrders (type, title, notes, start/end, colorCode).

Ability to create a WorkOrder from a Client and auto‑create a DeliveryEvent when scheduled.