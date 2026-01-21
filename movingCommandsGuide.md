## Moving Commands Guide

This guide explains how to split `src-tauri/src/main.rs` into command modules, while keeping command registration and behavior stable.

### Goals
- Reduce `main.rs` size by moving commands into module files.
- Keep command names and signatures unchanged.
- Improve testability and separation between API, business logic, and SQL.

### Target Structure
- `src-tauri/src/main.rs` remains the Tauri app entry point and command registration only.
- `src-tauri/src/commands/` holds feature modules.
- `src-tauri/src/db/` or `src-tauri/src/services/` holds shared SQL logic.

Suggested layout:
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/commands/auth.rs`
- `src-tauri/src/commands/clients.rs`
- `src-tauri/src/commands/work_orders.rs`
- `src-tauri/src/commands/inventory.rs`
- `src-tauri/src/commands/invoices.rs`
- `src-tauri/src/commands/reports.rs`
- `src-tauri/src/commands/users.rs`
- `src-tauri/src/services/mod.rs`
- `src-tauri/src/services/inventory.rs`
- `src-tauri/src/services/work_orders.rs`

### Current Command List (From generate_handler)
Commands currently registered in `src-tauri/src/main.rs`:
- Core: `ping`
- Clients: `create_client`, `list_clients`, `check_client_conflict`, `update_client`, `delete_client`
- Inventory: `create_inventory_item`, `list_inventory_items`, `update_inventory_item`, `delete_inventory_item`
- Work orders: `create_work_order`, `list_work_orders`, `update_work_order_assignees`, `update_work_order_schedule`, `update_work_order_status`
- Deliveries: `create_delivery_event`, `list_delivery_events`
- Users: `list_users`, `create_user`, `delete_user`, `ensure_user_exists`, `update_user_flags`
- Drivers: `get_available_drivers` (can live in `users` or `work_orders`)
- Auth: `login_user`, `change_password`, `reset_password`
- Invoices: `list_invoices`, `create_invoice_from_work_order`, `print_invoice`
- Change requests: `create_change_request`, `list_change_requests`, `resolve_change_request`, `list_pending_changes`
- MOTD: `list_motd`, `create_motd`, `delete_motd`
- Reports/Audit: `list_audit_logs`

### Suggested Module Mapping (This Repo)
- `commands/core.rs`: `ping`
- `commands/clients.rs`: client CRUD + conflict checks
- `commands/inventory.rs`: inventory CRUD
- `commands/work_orders.rs`: work order CRUD + status/assignees + delivery event commands
- `commands/users.rs`: `list_users`, `create_user`, `delete_user`, `ensure_user_exists`, `update_user_flags`, `get_available_drivers`
- `commands/auth.rs`: `login_user`, `change_password`, `reset_password`
- `commands/invoices.rs`: invoice list/create/print
- `commands/change_requests.rs`: change request commands + `list_pending_changes`
- `commands/motd.rs`: MOTD commands
- `commands/reports.rs`: `list_audit_logs`

### Step 1: Create the Command Modules
Create `src-tauri/src/commands/mod.rs`:
- Re-export each feature module with `pub mod <feature>;`.
- Optionally define a `pub fn all_commands()` helper returning a tuple of command fns.

Example:
- `pub mod clients;`
- `pub mod work_orders;`

### Step 2: Move Commands One Feature at a Time
Pick a feature boundary (e.g., clients):
- Cut the command functions from `main.rs`.
- Paste into `src-tauri/src/commands/clients.rs`.
- Add necessary `use` statements and shared types.
- Keep the function signature identical.

### Step 3: Keep Shared Types Accessible
If a command uses:
- DTO structs
- shared helper functions
- app state

Move those into:
- `src-tauri/src/types.rs` (for shared DTOs)
- `src-tauri/src/services/*` (for shared logic)
- Keep `AppState` in `main.rs` or move to `src-tauri/src/state.rs`

### Step 4: Consolidate SQL Queries
Move complex SQL into `services`:
- Keep raw queries near the logic that uses them.
- Avoid duplicating SQL in multiple command files.

Example:
- `commands/work_orders.rs` calls `services::work_orders::update_status(...)`.
- `services/work_orders.rs` contains the SQL and transaction.

### Step 5: Update Command Registration
In `main.rs`, replace inline functions with module references:
- `use commands::clients::*;`
- `use commands::work_orders::*;`

Then register:
- `tauri::generate_handler![list_clients, create_client, ...]`

Keep command names unchanged to avoid breaking frontend calls.

### Step 6: Update Frontend Command Imports
Frontend uses `invokeTauri` from `src/api/tauri.ts`:
- Keep the string command names identical.
- If you rename Rust functions, update the frontend calls in `src/App.tsx` and `src/components/*`.

### Step 6: Maintain AppState Access
Commands that use `State<'_, AppState>` should keep the same pattern.
If you move `AppState`:
- Update imports to `use crate::state::AppState;`
- Keep field names unchanged.

### Step 7: Extract Shared Helpers
Functions used across commands:
- password hashing
- role checks
- audit log creation

Move to:
- `src-tauri/src/services/auth.rs`
- `src-tauri/src/services/audit.rs`

### Step 8: Verify Compilation
After moving each feature:
- `cargo check`
- `cargo test` (if present)
- `npm run dev` for end-to-end verification

### Step 9: Avoid Cycles
Keep module dependencies one-way:
- `commands/*` depend on `services/*`
- `services/*` depend on `db.rs` or low-level helpers
- `main.rs` depends on `commands/*`

### Step 10: Suggested Move Order
Move commands in this order to reduce conflicts:
1. Auth + user helpers
2. Clients
3. Work orders
4. Inventory
5. Invoices
6. Reports + audit logs

### Notes for This Codebase
- `sqlx::migrate!()` runs in `db.rs` and is called during app init.
- Use `resolve_database_url()` unchanged.
- Maintain logging and audit behavior.

### Troubleshooting
- If Tauri can’t find a command, check `generate_handler!` list.
- If SQLx compile-time errors appear, re-run `cargo run --bin bootstrap_db`.
- If you hit circular imports, move shared helpers into `services` or a `utils` module.

