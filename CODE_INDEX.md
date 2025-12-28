# Code Index - Firewood Bank Management System

**Last Updated**: Generated automatically  
**Project**: Community Firewood Bank Management Console  
**Architecture**: Tauri 2 + React + TypeScript + SQLite

---

## 📁 Directory Structure

```
firewoodbank2/
├── src/                          # Frontend React application
│   ├── App.tsx                   # Main React application component
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Global styles
│   ├── vite-env.d.ts            # Vite type definitions
│   ├── assets/
│   │   └── logo.png             # Application logo
│   └── components/
│       └── Nav.tsx              # Navigation component
│
├── src-tauri/                    # Backend Rust application
│   ├── src/
│   │   ├── main.rs              # Main Rust application (1426 lines)
│   │   └── db.rs                # Database initialization module
│   ├── migrations/              # SQLite database migrations
│   │   ├── 0001_init.sql
│   │   ├── 0002_add_work_order_assignees.sql
│   │   ├── 0003_stage5_2_intake.sql
│   │   ├── 0004_audit_and_user_flags.sql
│   │   ├── 0005_add_user_driver_flag.sql
│   │   └── 0006_add_driver_details.sql
│   ├── build.rs                 # Build script
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
│
├── schema/                       # Shared type definitions
│   ├── rust_structs.rs          # Rust struct definitions
│   └── ts_dtos.ts               # TypeScript DTOs/interfaces
│
├── firewoodbank.db              # SQLite database file
├── package.json                 # Node.js dependencies
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── README.md                    # Project readme
├── ROADMAP.md                   # Development roadmap
└── NOTES.md                     # Development notes

```

---

## 🔧 Technology Stack

### Frontend
- **React** 18.3.1
- **TypeScript** 5.5.4
- **Vite** 7.3.0
- **Tauri API** 2.0.0

### Backend
- **Rust** (Edition 2021, Rust 1.76+)
- **Tauri** 2.0
- **SQLx** 0.7 (SQLite, migrations, UUID, chrono)
- **Tokio** 1.40 (async runtime)
- **Serde** 1.0 (serialization)
- **UUID** 1.9
- **Chrono** 0.4 (datetime)
- **Anyhow** 1.0 (error handling)

### Database
- **SQLite** (via SQLx)

---

## 📦 Core Modules

### 1. Frontend (`src/`)

#### `App.tsx`
- Main React application component
- Contains routing/navigation logic
- Manages application state

#### `components/Nav.tsx`
- Navigation component
- Props: `tabs`, `activeTab`, `onSelect`
- Renders tab-based navigation buttons

#### `main.tsx`
- React application entry point
- Renders `App` component into root DOM element

---

### 2. Backend (`src-tauri/src/`)

#### `main.rs` (1426 lines)
Main Rust application file containing:

**App State:**
- `AppState`: Manages SQLite connection pool
- `resolve_database_url()`: Resolves database path from env or defaults

**Database Functions:**
- `audit_db()`: Logs audit events to database

**Input Structures:**
- `ClientInput`: Client creation input
- `ClientUpdateInput`: Client update input
- `InventoryInput`: Inventory item creation input
- `InventoryUpdateInput`: Inventory item update input
- `WorkOrderInput`: Work order creation input
- `WorkOrderUpdateInput`: Work order update input
- `UserUpdateFlagsInput`: User flag updates input
- `DeliveryEventInput`: Delivery event creation input
- `MOTDInput`: Message of the day creation input

**Output Structures:**
- `ClientRow`: Client database row
- `InventoryRow`: Inventory item database row
- `WorkOrderRow`: Work order database row
- `UserRow`: User database row
- `DeliveryEventRow`: Delivery event database row
- `MOTDRow`: MOTD database row

**Tauri Commands (20 total):**

1. **`ping()`** - Test command for Rust↔React bridge
2. **`create_client()`** - Create a new client
3. **`list_clients()`** - List all clients (with role-based filtering)
4. **`check_client_conflict()`** - Check for duplicate clients
5. **`update_client()`** - Update an existing client
6. **`delete_client()`** - Soft delete a client (sets is_deleted flag)
7. **`create_inventory_item()`** - Create a new inventory item
8. **`list_inventory_items()`** - List all inventory items
9. **`update_inventory_item()`** - Update an existing inventory item
10. **`delete_inventory_item()`** - Soft delete an inventory item
11. **`create_work_order()`** - Create a new work order
12. **`list_work_orders()`** - List all work orders
13. **`update_work_order_assignees()`** - Update work order assignees
14. **`update_work_order_status()`** - Update work order status (with inventory adjustments)
15. **`adjust_inventory_for_transition_tx()`** - Internal helper for inventory transitions
16. **`create_delivery_event()`** - Create a delivery event
17. **`list_delivery_events()`** - List delivery events
18. **`list_users()`** - List all users
19. **`update_user_flags()`** - Update user flags (is_driver, hipaa_certified, etc.)
20. **`list_motd()`** - List messages of the day
21. **`create_motd()`** - Create a new message of the day

**Helper Functions:**
- `adjust_inventory_for_transition_tx()`: Handles inventory reservation/release on work order status changes

#### `db.rs`
Database initialization module:
- `init_pool()`: Initializes SQLite connection pool and runs migrations

---

### 3. Schema Definitions (`schema/`)

#### `rust_structs.rs`
Rust struct definitions for core entities:
- `SyncMeta`: Base sync metadata (id, timestamps, version, is_deleted)
- `Address`: Address structure
- `ContactInfo`: Contact information
- `ApprovalStatus`: Enum (Approved, Denied, Pending)
- `Client`: Client entity
- `HeatSourceInfo`: Heat source information
- `WorkOrderStatus`: Enum (Draft, Scheduled, InProgress, Completed, Cancelled)
- `WorkOrder`: Work order entity
- `InvoiceLineItem`: Invoice line item
- `ClientSnapshot`: Client snapshot for invoices
- `InvoiceStatus`: Enum (Draft, Sent, Paid, Void)
- `Invoice`: Invoice entity
- `UserRole`: Enum (Admin, Lead, Staff, Volunteer)
- `User`: User entity
- `InventoryItem`: Inventory item entity
- `DeliveryEventType`: Enum (Delivery, Meeting, Workday)
- `DeliveryEvent`: Delivery event entity
- `ChangeRequestStatus`: Enum (Open, InReview, Approved, Rejected)
- `ChangeRequest`: Change request entity
- `Motd`: Message of the day entity

#### `ts_dtos.ts`
TypeScript interface definitions (matching Rust structs):
- Same entities as Rust structs but with TypeScript naming conventions (camelCase)
- Includes type aliases: `UUID`, `Timestamp`
- All enums converted to TypeScript union types

---

## 🗄️ Database Migrations

### Migration Files
1. **0001_init.sql** - Initial schema creation
2. **0002_add_work_order_assignees.sql** - Work order assignees support
3. **0003_stage5_2_intake.sql** - Stage 5.2 intake enhancements
4. **0004_audit_and_user_flags.sql** - Audit logging and user flags
5. **0005_add_user_driver_flag.sql** - Driver flag support
6. **0006_add_driver_details.sql** - Driver details (license, vehicle, etc.)

---

## 🔑 Key Features

### Role-Based Access Control
- Admin, Lead, Staff, Volunteer roles
- HIPAA-aware PII masking
- Driver-limited views (only assigned deliveries)
- Role-based UI gating

### Audit Logging
- `audit_logs` table tracks all actions
- Records: event, role, actor, timestamp

### Inventory Management
- Inventory items with quantities
- Reserved quantity tracking for scheduled work orders
- Automatic reservation/release on work order status changes
- Reorder thresholds and alerts

### Work Orders
- Linked to clients
- Status workflow: Draft → Scheduled → InProgress → Completed → Cancelled
- Assignee management
- Mileage tracking
- Inventory impact tracking

### Delivery Events
- Calendar-based delivery scheduling
- Linked to work orders
- Type classification (Delivery, Meeting, Workday)
- Color coding support

### Client Management
- Full onboarding form support
- Approval workflow
- Duplicate detection
- Physical and mailing addresses
- Contact information
- Gate combo tracking

### User Management
- User profiles with roles
- Driver license tracking
- Vehicle information
- HIPAA certification flags
- Availability tracking

### Messages of the Day (MOTD)
- System-wide messages
- Time-based activation (active_from, active_to)
- Displayed in login/checklist areas

---

## 🔌 API Surface (Tauri Commands)

All commands are invoked from the frontend using `invoke()` from `@tauri-apps/api`.

### Client Commands
- `create_client(input: ClientInput): Promise<string>` - Returns new client ID
- `list_clients(role?, username?, hipaa_certified?, is_driver?): Promise<ClientRow[]>`
- `check_client_conflict(name, address): Promise<boolean>`
- `update_client(input: ClientUpdateInput): Promise<void>`
- `delete_client(id: string): Promise<void>`

### Inventory Commands
- `create_inventory_item(input: InventoryInput): Promise<string>` - Returns new item ID
- `list_inventory_items(): Promise<InventoryRow[]>`
- `update_inventory_item(input: InventoryUpdateInput): Promise<void>`
- `delete_inventory_item(id: string): Promise<void>`

### Work Order Commands
- `create_work_order(input: WorkOrderInput): Promise<string>` - Returns new work order ID
- `list_work_orders(): Promise<WorkOrderRow[]>`
- `update_work_order_assignees(id, assignees): Promise<void>`
- `update_work_order_status(id, status, mileage?, closed_by?): Promise<void>`

### Delivery Event Commands
- `create_delivery_event(input: DeliveryEventInput): Promise<string>`
- `list_delivery_events(): Promise<DeliveryEventRow[]>`

### User Commands
- `list_users(): Promise<UserRow[]>`
- `update_user_flags(id, input: UserUpdateFlagsInput): Promise<void>`

### MOTD Commands
- `list_motd(): Promise<MOTDRow[]>`
- `create_motd(input: MOTDInput): Promise<string>`

### Utility Commands
- `ping(): string` - Health check/test command

---

## 📝 Development Status

**Current Stage**: Stage 5.2 - Work Order and Intake Hardening  
**Branch Pattern**: `stage-X-[name]`

See `ROADMAP.md` for detailed stage information.

---

## 🚀 Running the Application

### Development
```bash
npm install
npm run dev          # Runs both UI (Vite) and Tauri in parallel
npm run dev:ui       # UI only (http://localhost:5173)
npm run dev:tauri    # Tauri only
```

### Build
```bash
npm run build        # Builds for production
```

### Database
- Database file: `firewoodbank.db` (at project root)
- Can be overridden with `DATABASE_URL` environment variable
- Migrations run automatically on startup via SQLx

---

## 🔍 Code Statistics

- **Rust**: ~1,426 lines (main.rs) + db.rs + structs
- **TypeScript/TSX**: ~200+ lines (App.tsx, components)
- **SQL Migrations**: 6 migration files
- **Tauri Commands**: 20 commands exposed to frontend
- **Database Tables**: Clients, Work Orders, Inventory, Users, Delivery Events, Audit Logs, MOTD

---

## 📚 Additional Documentation

- `README.md` - Basic project overview
- `ROADMAP.md` - Detailed development stages and goals
- `NOTES.md` - Development notes and decisions

---

*This index was generated automatically. Update as the codebase evolves.*

