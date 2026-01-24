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
- Auth uses `auth_users` with bcrypt hashes; seed logins include `admin/admin`, `staff/staff`, `employee/employee`, `volunteer/volunteer`, and `sketch/Sketching2!`
- For SQLx compile-time checks, run `cargo run --bin bootstrap_db` and set `DATABASE_URL` (URL-encode spaces)

Review & Improvement Suggestions (Program Structure + Workflow):
- ✅ Add a thin API layer (e.g., `src/api/*`) to wrap `invoke()` — implemented in `src/api/tauri.ts`
- ✅ Add form-level validation utilities (city/state/phone/zip) — implemented in `src/utils/validation.ts` and `src/utils/format.ts`
- ✅ Introduce a real auth flow (password reset, change password) and store password hashes only — bcrypt hashes in auth_users, change_password command exists
- ✅ Add lint/format config (ESLint/Prettier) — `.prettierrc` and `eslint.config.js` exist
- ✅ Add centralized error handling — GlobalErrorBoundary component exists
- Split `src/App.tsx` into feature modules (clients, inventory, work orders, invoices, worker directory) and centralize shared UI helpers. (App.tsx is 5000+ lines)
- Replace `window.print()` with a Tauri-side print command for consistent native printing behavior.
- ✅ Add `dev` docs for DATABASE_URL encoding and `.env` usage — documented in README.md with Windows path encoding table and SQLx bootstrap instructions
- Add tests: unit tests for Rust auth + work order status transitions; basic UI smoke tests for critical tabs.
- ✅ Standardize role names across UI, Rust, docs, and seeds — roles are now `admin/lead/staff/employee/volunteer`. The `lead` role is used for team leads with elevated permissions (can view PII if HIPAA certified).
- Split `src-tauri/src/main.rs` into command modules (e.g., `commands/users.rs`, `commands/work_orders.rs`) and move shared SQL into `db`/`services` layers. (main.rs is 3000+ lines)
- Add a `src/pages` (or `features`) directory and move tab content components out of `App.tsx` to reduce re-render scope and improve readability.
- ✅ Add DB indexes for common filters — migration 0016 adds indexes on work_orders.status, scheduled_date, audit_logs.created_at, delivery_events.start_date, clients.name
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

NEW NOTES 1/22
DASHBOARD- when clicking the plus to add an event, have the scheduling slide in under the calendar

    change notes from the team to Updates

PROFILE- make the information display in a more friendly layout. have the new friendly layout with the current info on the left and work history/upcoming deliveries and user stats above that
Clients Tab-
    if profile details are open and you do anything else (change tabs, open another client, create a new client, etc) close the details pane. this should apply any time you open a details pane so include workorders and workers and any other details.

    put the view details button on the right side of of the client , inline. put a small + button on the left side. this plus is to create a workorder.

    pressing esc while any detail panes are open, will close it

    pressing esc while newsletter sidebar is open 

    fix the tab order to tab in a sensible order of fields

    this is saved for something completely unrtelated. remind me to give this address to jessica when I have you process this file: waltonfamilyfoundation.org

INVENTORY
    needs a details pane when item is double clicked. staff/admin can edit quantity.

    add up and down arrows by item quantity to add or remove stock

    the tools do not have a threshold

    add tabs to sort according to item type.

    if a new item is type other, add a new category for the type entered (if other is selected, and I add something with type clown supplies, it would create a new tab and add clown supplies to the drop down. this is just an example. clown supplies is not a real category for this app)

    any items that need restocked should appear on both the dashboard as well as the inventory page

    any items with type Tool will be listed in a collapsable left sidebar like the newsletter

WORKORDERS
    schedule date should be blank until scheduled with a driver assigned

    workorder details should open as a sidebar like other detail panes

    if staff/admin the status should be a dropdown

    the driver list should populate with all available drivers with DL and driver flags

    if the client is also a worker, and they were assigned to the delivery, add those hours to the workers profile.

    if a worker is created with the same details as a client, ask if they are the same and link them for tracking purposes

    when a workorder is made for a client who is also a worker, track the amount of wood tracked in the worker and client profile.

    make the workorder number convention be Month 3 letter abbreviation (example Dec)last 2 of year (example 25) then the number of the order sequential as 2 integers (example 01 for the first order 34 for the 34th order) so it is mmmyy##

METRICS
    estimated value should be calculated differently, each cord of split wood is worth $450, unsplit is ??$250?? (see if you can locate info for this number)

    in the future, there will be receipts for items entered, these will be added to costs

FINANCES
    When hours are added for admin/staff/employees, ask if these are billed hours or in-kind donation hours

    an volunteer hour is valued at $31, this can be its own column next to donations, with a totals column after that

WORKER DIRECTORY
    if a worker is a client or vice versa, put an icon on that worker and client account to show this

    if a worker suggests a change, it should show on the dashboard of staff and admins. when the staff/admin opens it to view, it should show the old profile on left and new on right with any changes highlighted

    in worker details, place the worker metrics under their name

    worker onboardiung should have first, last, DOB, physical address, mailing address same checkbox (mailing address fields showing only if unchecked), DOB, and the driver/hippa information.

    anyone who is a driver should have a special color, same with hipaa certified. if both, top half one and bottom the other color to show they have both

    each worker should be displayed like the first 2 lines :
        -Name Bold, phone, credentials, schedule, hours, view details
    
    in the details sidebar, include a work history at the bottom.

    admin and staff should see an add hours button on everyone aside from admins

    each volunteer hour can be counted as $31 in kind donation, tracked in metrics as in-kind volunteer hours. These are seperate from any in-kind hours from admin, staff, employees. a checkbox on add hours to declare inkind if checked

    profiles should have a dispute hours

    profiles can build a wood credit if they are a client and a volunteer. 10 hours is equal to a cord of wood (for now). Track this as a volunteer wood credit and convert the hours to cords to the hundredths
REPORTS
    clean up the reports. it only needs to track changes, not when pages are listed.

    rename the reports with clear names for people to understand

    only visible to staff/admin

ADMIN
    MOTD is now updates, and can be added from dashboard if staff or admin. Only add Updates from a + on the Notes from the Team

    change requests should be in a staff tab only visible for staff/admin.

    make the admin tab contain admin duties

STAFF
    Make a staff page with staff things

always remember to commit each section, and push with each section (staff, admin, workers....etc) completion.