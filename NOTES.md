Notable Gaps / Changes Needed (updated for Stage 5.2 completion)

Completed in Stage 5.2:
- ✅ Client name split into first/last with auto-generated client numbers
- ✅ Address/contact validation (phone format, state, ZIP, city formatting)
- ✅ Wood size and delivery size tracking on work orders
- ✅ Inventory reservation system (reserved_quantity tracking)
- ✅ Driver assignment from DB (DL flag required)
- ✅ Work order creation gated to staff/admin
- ✅ Worker/helper assignments on deliveries
- ✅ Created by display name on work orders

Remaining Gaps:
- Stage 2: ✅ COMPLETE - All CRUD UI implemented (update/delete for clients and inventory)
- Stage 3: ✅ COMPLETE - All onboarding fields in edit flow (client_title is old/unused and should be removed from schema)
- Stage 4: ✅ COMPLETE - "Needs restock" filter and auto-order messaging implemented
- Stage 5.1b: ✅ COMPLETE - Worker Directory CRUD fully implemented
- Stage 5.1c: ✅ COMPLETE - Audit logging infrastructure (audit persisted to audit_logs table). Note: Town derivation was an old mistake and should NOT be implemented - all contact blocks use standard form names.
- Stage 5.1d: ✅ COMPLETE - Volunteer/driver hours + wood-credit calc (0.75 minutes/mile; displayed on Dashboard for volunteers/drivers)
- Stage 5.4: ✅ COMPLETE - Reports tab with audit log viewer (filter by day, 7 days, current month, year, all time)
- Stage 5.2: Driver availability integration with schedule choices (pending).
- Inventory creation gating to be enforced with user CRUD/users stage.

Notes:
- client_title field exists in schema but is old/unused - should be removed from database and code
- Town derivation for volunteer view is NOT needed (old mistake) - standard contact form names should be used

Current Status:
- MOTD is surfaced on login (newest first) via list_motd/create_motd.
- Audit logs persist to audit_logs table.
- Stage 5.2 mostly complete (driver availability scheduling pending).

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

Client detail/edit view with all onboard form fields (clientNumber, onboarding date, addresses, phones, email, how heard, referring agency, approvalStatus + denialReason, gateCombo, notes). Note: client_title is old/unused and should be removed.

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