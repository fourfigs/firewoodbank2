# 🔥 Firewood Bank Management System

A desktop-first Tauri application for managing Community Firewood Bank operations including client onboarding, inventory tracking, work orders, deliveries, and invoicing.

**Current Status**: Stage 12 Complete (see `ROADMAP.md` for branches)  
**Repository**: https://github.com/fourfigs/firewoodbank2

---

## 📋 Overview

This application provides a comprehensive management console for firewood bank operations, supporting:

- **Client Management**: Onboarding, approval workflows, contact information, addresses
- **Inventory Tracking**: Equipment and supplies with reorder thresholds and reservation tracking
- **Work Orders**: Delivery scheduling, status tracking, mileage recording, worker assignments
- **Invoicing**: Draft invoices generated from completed work orders (Stage 8 branch)
- **Delivery Events**: Calendar-based delivery scheduling with assignments
- **User Management**: Role-based access (Admin, Lead, Staff, Volunteer/Driver) with HIPAA compliance features
- **Driver Mode**: Driver-facing updates for today’s deliveries (Stage 9 branch)
- **Audit Logging**: Complete activity tracking
- **Messages of the Day**: System-wide messaging

---

## 🏗️ Technology Stack

### Frontend

- **React** 18.3.1
- **TypeScript** 5.5.4
- **Vite** 7.3.0 (build tool)
- **Tauri API** 2.0.0

### Backend

- **Rust** (Edition 2021, Rust 1.76+)
- **Tauri** 2.0
- **SQLx** 0.7 (SQLite with migrations)
- **Tokio** 1.40 (async runtime)
- **Serde** 1.0 (serialization)
- **UUID** 1.9
- **Chrono** 0.4 (datetime handling)
- **bcrypt** 0.15 (password hashing)

### Database

- **SQLite** (via SQLx) with automatic migrations

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.76+ (install via [rustup](https://rustup.rs/))
- **Tauri CLI** (installed automatically via npm)
- **MSVC Build Tools** (Windows): Visual Studio Build Tools w/ C++ workload

### Installation

1. Clone the repository:

```bash
git clone https://github.com/fourfigs/firewoodbank2.git
cd firewoodbank2
```

2. Install dependencies:

```bash
npm install
```

3. Bootstrap the database (required for SQLx compile-time checks):

```bash
cd src-tauri
cargo run --bin bootstrap_db
```

4. Run in development mode (PowerShell):

```bash
$env:DATABASE_URL="sqlite:///C:/firewood%20bank/firewoodbank2/firewoodbank.db"
npm run dev
```

This will:

- Start the Vite dev server on `http://localhost:5173`
- Launch the Tauri application window
- Automatically run database migrations on startup

**PowerShell note:** If you see a `npm.ps1` execution policy error, run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Default Logins (Seeded)

- `admin` / `admin`
- `lead` / `lead`
- `staff` / `staff`
- `volunteer` / `volunteer`
- `sketch` / `Sketching2!` (admin)

### Build for Production

```bash
npm run build
```

The built application will be in `src-tauri/target/release/`.

---

## 📁 Project Structure

```
firewoodbank2/
├── src/                    # React frontend
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # React entry point
│   ├── components/        # React components
│   └── assets/            # Static assets
│
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs       # Main Rust application (Tauri commands)
│   │   └── db.rs         # Database initialization
│   ├── migrations/        # SQLite migrations
│   └── tauri.conf.json   # Tauri configuration
│
├── schema/                # Shared type definitions
│   ├── rust_structs.rs   # Rust structs
│   └── ts_dtos.ts        # TypeScript interfaces
│
├── firewoodbank.db       # SQLite database (created on first run)
└── CODE_INDEX.md         # Detailed code index
```

---

## 🗄️ Database

The application uses SQLite with automatic migrations. The database file (`firewoodbank.db`) is created at the project root on first run. Authentication logins are stored in the `auth_users` table (bcrypt-hashed).

### Migrations

Migrations are automatically applied on startup. Current migrations:

- `0001_init.sql` - Initial schema (clients, work orders, inventory, users, etc.)
- `0002_add_work_order_assignees.sql` - Work order assignees support
- `0003_stage5_2_intake.sql` - Wood size, delivery size, reservations
- `0004_audit_and_user_flags.sql` - Audit logs and HIPAA flags
- `0005_add_user_driver_flag.sql` - Driver capability flags
- `0006_add_driver_details.sql` - Driver license details
- `0007_add_user_availability_schedule.sql` - Weekly availability schedule
- `0008_add_client_wood_size_directions.sql` - Client wood size/directions
- `0009_add_client_first_last_name.sql` - Client first/last split
- `0010_remove_client_number.sql` - Remove client_number
- `0011_add_user_logins_and_addresses.sql` - Login table + worker addresses
- `0012_add_auth_user_unique.sql` - Unique login per worker

### Environment Variables

You can override the database location by setting:

```bash
DATABASE_URL=sqlite:///path/to/your/database.db
```

On Windows paths with spaces, URL-encode them, e.g.:
```bash
DATABASE_URL=sqlite:///C:/firewood%20bank/firewoodbank2/firewoodbank.db
```

---

## 👥 User Roles & Permissions

### Admin

- Full access to all features
- Can view all PII (Personally Identifiable Information)
- Can manage workers, clients, inventory, work orders
- Can create and manage MOTD

### Lead

- Can view PII if HIPAA certified
- Can manage clients, inventory, work orders
- Can assign drivers and close work orders
- Limited worker management

### Staff

- Can create and edit clients, inventory items
- Can create work orders
- Cannot view PII without HIPAA certification
- Cannot manage workers (must request changes)

### Volunteer/Driver

- Limited view: only assigned deliveries
- Can see name, address, and contact info for assigned work
- Can update delivery status for assigned deliveries
- Cannot view client PII for non-assigned work

---

## 🔌 API Reference

The application exposes Tauri commands that can be invoked from the frontend. See `CODE_INDEX.md` for a complete list of commands.

### Key Commands

**Clients:**

- `create_client`, `list_clients`, `update_client`, `delete_client`, `check_client_conflict`

**Inventory:**

- `create_inventory_item`, `list_inventory_items`, `update_inventory_item`, `delete_inventory_item`

**Work Orders:**

- `create_work_order`, `list_work_orders`, `update_work_order_status`, `update_work_order_assignees`

**Users/Auth:**

- `list_users`, `update_user_flags`, `create_user`, `login_user`, `ensure_user_exists`

**Invoices:**

- `list_invoices`, `create_invoice_from_work_order` (Stage 8 branch)

**Delivery Events:**

- `create_delivery_event`, `list_delivery_events`

**MOTD:**

- `list_motd`, `create_motd`

---

## 📚 Documentation

- **ROADMAP.md** - Detailed development roadmap and stage information
- **NOTES.md** - Development notes and known gaps
- **CODE_INDEX.md** - Comprehensive code structure and API reference

---

## 🔒 Security & Privacy

- **HIPAA Compliance**: PII masking based on role and HIPAA certification status
- **Audit Logging**: All actions are logged with role, actor, and timestamp
- **Role-Based Access**: UI and backend enforcement of permissions
- **Driver Data Isolation**: Drivers only see data for assigned deliveries
- **Password Hashing**: Logins are stored as bcrypt hashes in `auth_users`

---

## 🛣️ Development Roadmap

See `ROADMAP.md` for the complete development roadmap. Current stage: **Stage 12 Complete**

**Completed Stages:**

- ✅ Stage 0: Schema Design
- ✅ Stage 1: Tauri + React Skeleton
- ✅ Stage 2: SQLite + Sync Tables
- ✅ Stage 3: Clients Module
- ✅ Stage 4: Inventory Module
- ✅ Stage 5: Work Orders + Deliveries
- ✅ Stage 5.1: Tuning Forms & Access
- ✅ Stage 5.2: Work Order and Intake Hardening
- ✅ Stage 5.3: Worker Directory
- ✅ Stage 5.4: Reports / Audit Log Viewer
- ✅ Stage 6: Login + Dashboard + Calendar
- ✅ Stage 7: Users + Change Requests + MOTD (including login redesign)

**Completed Later Stages (by branch):**

- ✅ Stage 8: Invoices + Printing (`stage-8-invoices`)
- ✅ Stage 9: Driver Mode (Desktop) (`stage-9-driver`)
- ✅ Stage 10: HIPAA Compliance Check (`stage-10-hipaa`)
- ✅ Stage 11: Desktop Rollout (`stage-11-desktop`)
- ✅ Stage 12: Sync Hooks (`stage-12-sync`)

---

## 🤝 Contributing

This is a private project. For questions or issues, please contact the repository maintainers.

---

## 📝 License

[Add license information here]

---

## 🙏 Acknowledgments

Built for Community Firewood Bank operations management.
