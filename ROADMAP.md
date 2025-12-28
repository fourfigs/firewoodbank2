# 🔥 Community Firewood Bank Management App - Complete Roadmap

**Repo**: https://github.com/fourfigs/firewoodbank2  
**Status**: 🟢 Stage 5.4 Complete - Ready for Stage 6 (Dashboard + Calendar)  
**Target**: Windows Desktop → Multi-platform sync-ready app

## 🎯 PROJECT GOALS
- Windows desktop-first Tauri 2 app for Firewood Bank operations
- Client onboarding, inventory tracking, work orders, invoices, dashboard
- Sync-ready schema for future cloud + mobile expansion
- Print invoices, driver views, admin tools, change requests

## 🏗️ ARCHITECTURE
Frontend: React + TypeScript + Vite
Backend: Rust + SQLite (SQLx)
Shell: Tauri 2 (Windows → macOS/Linux/Android/iOS)
Sync: UUIDs + createdAt/updatedAt/isDeleted/lastSyncedAt/version


## 📋 DEVELOPMENT WORKFLOW (MANDATORY - Follow Exactly)

1️⃣ BEFORE EACH STAGE:
git checkout -b stage-X-[name]

Paste OVERALL SYSTEM PROMPT in Cursor (pinned)
2️⃣ IMPLEMENTATION:

Model proposes file changes

Copy-paste exact diffs

npm install && tauri dev

3️⃣ VERIFY:

Check "What you should see" matches
Review login screen “Revision checklist” for per-stage behaviors to smoke-test

Test all new UI flows

4️⃣ COMMIT:
git add . && git commit -m "feat(stage-X): [name]"
git push origin stage-X-[name]


## 🗄️ CORE ENTITIES (From your PDF forms + sync-ready)

### **Client** (Onboard.pdf)
id(UUID), clientNumber(55+), clientTitle, name, physicalAddress,
mailingAddress, telephone, email, dateOfOnboarding, howDidTheyHearAboutUs,
referringAgency, approvalStatus(approved/denied/pending), denialReason,
gateCombo, notes, createdAt, updatedAt, createdByUserId, isDeleted


### **WorkOrder** (Order.pdf)  
id(UUID), clientId, clientNumber, clientTitle, clientName, physicalAddress,
mailingAddress, telephone, email, directions, gateCombo,
otherHeatSourceGas/Electric/Other(+text), notes, scheduledDate, status,
createdAt, updatedAt, createdByUserId, isDeleted


### **Invoice** (Invoice.pdf)
id(UUID), workOrderId, invoiceNumber, invoiceDate, lineItems[], subtotal,
tax, total, client snapshot, notes, createdAt, updatedAt, isDeleted


### **Other Entities**
- **User**: name, role(admin/lead/staff/driver), availability, DL status, vehicle
- **InventoryItem**: chainsaws, bar oil, gas, 2-stroke oil, files, helmets, etc + thresholds
- **DeliveryEvent**: type(delivery/meeting/workday), dates, colorCode
- **MOTD**, **ChangeRequest** (all with sync metadata)

## 🚀 STAGES (12 total - Current progress tracked here)

### 🟡 **Stage 0: Schema Design** (Planning)
✅ Create this Roadmap.md + commit
✅ Design sync-ready schema from PDFs
✅ Output: Rust structs + TS DTOs
What you see: Schema definitions ready


### ✅ **Stage 1: Tauri + React Skeleton**
Scaffold Tauri 2 Windows app + React nav shell
Add ping command (test Rust↔React bridge)
What you see: Desktop window w/ Dashboard/Clients/Inventory nav
Branch: stage-1-skeleton


### ✅ **Stage 2: SQLite + Sync Tables**
SQLite migrations for ALL entities w/ sync fields
Rust CRUD for Client/InventoryItem
Tauri commands: createClient/listClients/etc
What you see: DB connection + test commands work
Branch: stage-2-db


### ✅ **Stage 3: Clients Module**
Client list + onboard form aligned to PDFs
Create + approval status + gate combo capture
Placeholder delivery metrics
What you see: Add/edit clients w/ full form
Branch: stage-3-clients


### ✅ **Stage 4: Inventory Module**
chainsaws/bar oil/gas/files/helmets etc + thresholds
Below-threshold warnings + auto order messages
CRUD + "needs restock" view
What you see: Inventory list w/ low-stock alerts
Branch: stage-4-inventory

### 🟢 **Stage 5: Work Orders + Deliveries**
Full Order.pdf form → WorkOrder entity
Auto-create DeliveryEvent on schedule
Client→WorkOrder linking
What you see: Create work orders from clients
Branch: stage-5-workorders

### ✅ **Stage 5.1: Tuning Forms & Access**
Role-based gating for client/workorder/inventory creation
HIPAA-aware PII masking (only admins + certified leads; drivers get address/phone for assigned work)
Volunteer/driver limited views; mileage required to close work orders
Mailer list view; + toggles and icon updates; login role/username flow
What you see: Forms gated by role, PII masked per policy, mileage field on work orders
Branch: stage-5.1-tuningForms
Sub-stages to close gaps:
- 5.1a: Driver delivery-only view (address/contact for assigned deliveries; strip non-delivery workorder PII)
- 5.1b: Persist assignments/mileage/availability/vehicle in backend schema + commands
- 5.1c: Server-side PII enforcement (role checks, driver-limited payloads, audit logging hooks; town and mileage initially derived from client address)
- 5.1d: Volunteer/driver hours + wood-credit calc wired to persisted events (0.75 minutes/mile; delivery assignments mirrored into delivery_events)
- Closing a work order to “completed” requires mileage and records the lead/admin who closed it
- Slice: Audit log persisted (audit_logs table) and MOTD surfaced on login newest→oldest
- ✅ Completed slices:
  - ✅ Client/Inventory edit/delete UI (Stage 2) - COMPLETE
  - ✅ Full onboarding fields + client edit flow (Stage 3) - COMPLETE (client_title is old/unused and should be removed)
  - ✅ "Needs restock" filter + auto-order messaging (Stage 4) - COMPLETE
  - ✅ User CRUD (availability/vehicle/DL/HIPAA) in Worker Directory (Stage 5.1b) - COMPLETE
  - ✅ Audit log viewer/export (Stage 5.1c / 5.4) - COMPLETE (Reports tab with filtering)
  - Note: Town derivation is NOT needed (was an old mistake) - all contact blocks use standard form names

### ✅ Stage Prompts Reference (used and implemented across stages 0–5)
- Stage 0 prompt: Windows desktop–first Tauri 2 + React + TypeScript + SQLite; sync-ready schema/DTOs for User, Client, InventoryItem, WorkOrder, DeliveryEvent, Invoice, MOTD, ChangeRequest; UUID + audit/sync fields; infer fields from Onboard/Order/Invoice; output Rust/SQL + TS DTOs; call out missing/ambiguous.
- Stage 1 prompt: Scaffold Tauri 2 app (Windows), React+TS frontend, nav shell (Dashboard, Clients, Inventory, Work Orders, Admin, Driver placeholder), Tauri `ping` command and React caller; include run commands.
- Stage 2 prompt: Add SQLite/migrations for all entities with sync fields; Rust CRUD for Client/Inventory; Tauri commands create/update/list for both; handle createdAt/updatedAt/isDeleted/UUID.
- Stage 3 prompt: Clients module with search/filter, detail/edit with all onboard fields (title, clientNumber, onboarding date, addresses, phones, email, how heard, referring agency, approvalStatus+denialReason, gateCombo, notes), delivery metrics placeholders, backend wiring.
- Stage 4 prompt: Inventory module with list/detail, CRUD for operational items, fields (name, category, currentQuantity, unit, reorderThreshold, isActive), derived belowThreshold + orderMessage, “Needs restock” view for dashboard/admin.
- Stage 5 prompt: Work Orders + DeliveryEvents with full Order fields, client snapshot/link, addresses/directions/gate combo/heat sources/notes/dateOfOnboarding/scheduledDate/status; DeliveryEvent tied to WorkOrder (type/title/notes/start/end/colorCode); create WorkOrder from Client and auto-create DeliveryEvent when scheduled.

### ✅ **Stage 5.2: Work Order and Intake Hardening**
Tighten intake UX/validation before Stage 6:
- ✅ Split client name into first/last; auto-generate client number from name + entry month + 2 random digits (format: LAST-FIRST-MMYY-RR)
- ✅ Client edit locked to admin/lead (canManage gate)
- ✅ Enforce required: name, address, at least one contact (phone/email/other+specify)
- ✅ Format phone `(###) ###-####` with validation
- ✅ City init-cap formatting
- ✅ State 2-letter uppercase validation
- ✅ ZIP validation `#####` or `#####-####`
- ✅ Wood size dropdown (12/14/16/Other + specify inches integer) and delivery size (1 cord / 1/3 cord / other numeric), carry both on work orders
- ✅ Inventory impact: reserve wood on schedule/in-progress and deduct on completed; release on cancel (reserved_quantity tracking)
- ✅ Driver assignment dropdown (licensed drivers from DB only - DL flag required)
- ✅ Driver availability drives schedule choices (weekly schedule)
- ✅ Status/mileage editable only by lead/admin (driver can enter mileage and mark delivered pending approval)
- ✅ Label work orders with creator display name (not username)
- ✅ Work orders entered by staff and admin only (UI + backend gate)
- ✅ Drivers can add up to four workers/helpers on a delivery (assignees_json)
- ✅ All clients can be workers, all workers can be driver/hipaa/working vehicle flagged, only leads/admins get PII unfiltered, and drivers only see the name, address, and contact info
What you see: Validated intake forms, wood/delivery sizes, inventory reservations, driver assignments with availability
Branch: stage-5.2-intake

### ✅ **Stage 5.3: Worker Directory**
Admin/Lead-only Worker Directory tab:
- ✅ List all workers with name, phone, availability, DL status, vehicle, HIPAA certification
- ✅ Double-click row opens full profile detail for editing
- ✅ Edit availability schedule (weekly checkboxes), driver details, HIPAA cert
- ✅ Tab hidden for non-admin/non-lead
What you see: Worker Directory tab with list and edit profile
Branch: stage-5.3-workers

### ✅ **Stage 5.4: Reports / Audit Log Viewer**
Admin/Lead-only Reports tab for viewing audit logs:
- ✅ Reports tab in navigation (gated to admin/lead roles)
- ✅ Audit log viewer displaying: timestamp, event, role, actor
- ✅ Time-based filtering: Day, 7 Days, Current Month, Year, All Time
- ✅ Table view with sorting
- ✅ Backend: `list_audit_logs` Tauri command with date filtering
What you see: Reports tab with filterable audit log table
Branch: stage-5.4-reports

### ⭕ **Stage 6: Login + Dashboard + Calendar**
Split/unsplit wood summary
2-weeks-at-glance + monthly calendar (color-coded)
Upcoming list + MOTD
Admin: availability + low inventory cards
Dashboard MOTD panel uses the scrollable notes area (like login checklist); newest messages push older down
What you see: Operational dashboard w/ calendar
Branch: stage-6-dashboard

### ⭕ **Stage 7: Users + Change Requests + MOTD**
User profiles + "Request change" modal
Admin change request queue (approve/reject)
MOTD management
What you see: User change workflow + MOTD on dashboard
Branch: stage-7-users-admin


### ⭕ **Stage 8: Invoices + Printing**
Invoice.pdf → Invoice entity
Generate from completed WorkOrder
Tauri print dialog integration
What you see: Print invoices from app
Branch: stage-8-invoices


### ⭕ **Stage 9: Driver Mode (Desktop)**
Today's deliveries list for drivers
Status updates (en route/delivered/issue)
Touch-friendly (mobile-ready)
What you see: Driver view w/ today's route
Branch: stage-9-driver


### ⭕ **Stage 10: HIPAA Compliance Check**
PII masking rules, audit/logging, role verification, release checklist
What you see: Compliance checklist + PII masking confirmed
Branch: stage-10-hipaa

### ⭕ **Stage 11: Desktop Rollout**
Windows packaging hardening; installer/signing checks; smoke tests
What you see: Desktop build ready for field use
Branch: stage-11-desktop

### ⭕ **Stage 12: Sync Hooks**
SyncService abstraction (getPendingChanges/etc)
lastSyncedAt/version fields
Future cloud-ready comments
What you see: No UI change (internal prep)
Branch: stage-12-sync
