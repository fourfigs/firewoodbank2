# 🔥 Firewood Bank Management System

A desktop-first Tauri application for managing Community Firewood Bank operations including client onboarding, inventory tracking, work orders, deliveries, and invoicing.

**Current Status**: Stage 5.2 - Work Order and Intake Hardening  
**Repository**: https://github.com/fourfigs/firewoodbank2

---

## 📋 Overview

This application provides a comprehensive management console for firewood bank operations, supporting:

- **Client Management**: Onboarding, approval workflows, contact information, addresses
- **Inventory Tracking**: Equipment and supplies with reorder thresholds and reservation tracking
- **Work Orders**: Delivery scheduling, status tracking, mileage recording, worker assignments
- **Delivery Events**: Calendar-based delivery scheduling with assignments
- **User Management**: Role-based access (Admin, Lead, Staff, Volunteer/Driver) with HIPAA compliance features
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

### Database
- **SQLite** (via SQLx) with automatic migrations

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.76+ (install via [rustup](https://rustup.rs/))
- **Tauri CLI** (installed automatically via npm)

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

3. Run in development mode:
```bash
npm run dev
```

This will:
- Start the Vite dev server on `http://localhost:5173`
- Launch the Tauri application window
- Automatically run database migrations on startup

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

The application uses SQLite with automatic migrations. The database file (`firewoodbank.db`) is created at the project root on first run.

### Migrations

Migrations are automatically applied on startup. Current migrations:
- `0001_init.sql` - Initial schema (clients, work orders, inventory, users, etc.)
- `0002_add_work_order_assignees.sql` - Work order assignees support
- `0003_stage5_2_intake.sql` - Wood size, delivery size, reservations
- `0004_audit_and_user_flags.sql` - Audit logs and HIPAA flags
- `0005_add_user_driver_flag.sql` - Driver capability flags
- `0006_add_driver_details.sql` - Driver license details

### Environment Variables

You can override the database location by setting:
```bash
DATABASE_URL=sqlite:///path/to/your/database.db
```

---

## 👥 User Roles & Permissions

### Admin
- Full access to all features
- Can view all PII (Personally Identifiable Information)
- Can manage users, clients, inventory, work orders
- Can create and manage MOTD

### Lead
- Can view PII if HIPAA certified
- Can manage clients, inventory, work orders
- Can assign drivers and close work orders
- Limited user management

### Staff
- Can create and edit clients, inventory items
- Can create work orders
- Cannot view PII without HIPAA certification
- Cannot manage users

### Volunteer/Driver
- Limited view: only assigned deliveries
- Can see name, address, and contact info for assigned work
- Can add mileage and update delivery status
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

**Users:**
- `list_users`, `update_user_flags`

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

---

## 🛣️ Development Roadmap

See `ROADMAP.md` for the complete development roadmap. Current stage: **Stage 5.2**

**Completed Stages:**
- ✅ Stage 0: Schema Design
- ✅ Stage 1: Tauri + React Skeleton
- ✅ Stage 2: SQLite + Sync Tables
- ✅ Stage 3: Clients Module
- ✅ Stage 4: Inventory Module
- ✅ Stage 5: Work Orders + Deliveries
- ✅ Stage 5.1: Tuning Forms & Access
- ✅ Stage 5.2: Work Order and Intake Hardening (mostly complete)

**Upcoming Stages:**
- ⏳ Stage 5.3: Worker Directory
- ⭕ Stage 6: Login + Dashboard + Calendar
- ⭕ Stage 7: Users + Change Requests + MOTD
- ⭕ Stage 8: Invoices + Printing
- ⭕ Stage 9: Driver Mode (Desktop)
- ⭕ Stage 10: HIPAA Compliance Check
- ⭕ Stage 11: Desktop Rollout
- ⭕ Stage 12: Sync Hooks

---

## 🤝 Contributing

This is a private project. For questions or issues, please contact the repository maintainers.

---

## 📝 License

[Add license information here]

---

## 🙏 Acknowledgments

Built for Community Firewood Bank operations management.
