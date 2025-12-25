# 🔥 Community Firewood Bank Management App - Complete Roadmap

**Repo**: https://github.com/fourfigs/firewoodbank2  
**Status**: 🟢 Stage 1 - Skeleton (current)  
**Target**: Windows Desktop → Multi-platform sync-ready app

## 🎯 PROJECT GOALS
- Windows desktop-first Tauri 2 app for Firewood Bank operations
- Client onboarding, inventory tracking, work orders, invoices, dashboard
- Sync-ready schema for future cloud + mobile expansion
- Print invoices, driver views, admin tools, change requests

## 🏗️ ARCHITECTURE
Frontend: React + TypeScript + Tailwind/Vite
Backend: Rust + SQLite (SQLx/SeaORM)
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

## 🚀 STAGES (10 total - Current progress tracked here)

### 🟡 **Stage 0: Schema Design** (Planning)
✅ Create this Roadmap.md + commit
✅ Design sync-ready schema from PDFs
✅ Output: Rust structs + TS DTOs
What you see: Schema definitions ready


### 🟢 **Stage 1: Tauri + React Skeleton**
Scaffold Tauri 2 Windows app + React nav shell
Add ping command (test Rust↔React bridge)
What you see: Desktop window w/ Dashboard/Clients/Inventory nav
Branch: stage-1-skeleton


### ⭕ **Stage 2: SQLite + Sync Tables**
SQLite migrations for ALL entities w/ sync fields
Rust CRUD for Client/InventoryItem
Tauri commands: createClient/listClients/etc
What you see: DB connection + test commands work
Branch: stage-2-db


### ⭕ **Stage 3: Clients Module**
Client list + full onboard form (all PDF fields)
Create/edit/search + approval status
Placeholder delivery metrics
What you see: Add/edit clients w/ full form
Branch: stage-3-clients


### ⭕ **Stage 4: Inventory Module**
chainsaws/bar oil/gas/files/helmets etc + thresholds
Below-threshold warnings + auto order messages
CRUD + "needs restock" view
What you see: Inventory list w/ low-stock alerts
Branch: stage-4-inventory

### ⭕ **Stage 5: Work Orders + Deliveries**
Full Order.pdf form → WorkOrder entity
Auto-create DeliveryEvent on schedule
Client→WorkOrder linking
What you see: Create work orders from clients
Branch: stage-5-workorders

### ⭕ **Stage 6: Dashboard + Calendar**
Split/unsplit wood summary
2-weeks-at-glance + monthly calendar (color-coded)
Upcoming list + MOTD
Admin: availability + low inventory cards
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


### ⭕ **Stage 10: Sync Hooks**
SyncService abstraction (getPendingChanges/etc)
lastSyncedAt/version fields
Future cloud-ready comments
What you see: No UI change (internal prep)
Branch: stage-10-sync


Say: "STAGE 0: Schema design"