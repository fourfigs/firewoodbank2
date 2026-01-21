## Refactoring App.tsx Guide

This guide explains how to split `src/App.tsx` into feature modules with clear ownership, smaller files, and predictable re-render behavior. It is designed to preserve current behavior while improving maintainability.

### Goals
- Reduce `App.tsx` size and cognitive load.
- Isolate feature logic by domain (clients, work orders, inventory, invoices, users, reports).
- Centralize shared UI helpers, formatting, and validation.
- Improve render performance by narrowing state and props per feature.

### High-Level Target Structure
- `src/pages/` for page-level containers (tabs/routes).
- `src/features/` for domain-specific UI and logic.
- `src/components/` for shared generic UI elements.
- `src/hooks/` for shared hooks (data fetching, debounce, memoized selectors).
- `src/state/` for app-level state management and selectors (if needed).

Suggested layout:
- `src/pages/DashboardPage.tsx`
- `src/pages/ClientsPage.tsx`
- `src/pages/WorkOrdersPage.tsx`
- `src/pages/InventoryPage.tsx`
- `src/pages/InvoicesPage.tsx`
- `src/pages/UsersPage.tsx`
- `src/pages/ReportsPage.tsx`
- `src/pages/SettingsPage.tsx` (if present)
- `src/features/clients/*`
- `src/features/workOrders/*`
- `src/features/inventory/*`
- `src/features/invoices/*`
- `src/features/users/*`
- `src/features/reports/*`
- `src/components/shared/*` (buttons, modals, table helpers, etc.)

### Current App.tsx Map (This Repo)
Active tabs:
- `Dashboard`, `Profile`, `Clients`, `Inventory`, `Work Orders`, `Metrics`, `Worker Directory`, `Reports`, `Admin`

Already-extracted components used by `App.tsx`:
- `Nav`, `Dashboard`, `AdminPanel`, `ReportsTab`

Large state groups currently in `App.tsx`:
- Session + login: `session`, `activeTab`, `now`, login form UI.
- Core datasets: `clients`, `inventory`, `workOrders`, `deliveries`, `users`, `motdItems`, `auditLogs`.
- Client UI state: `showClientForm`, `clientForm`, `clientSearch`, `clientSort*`, mailing list sidebar state.
- Inventory UI state: `showInventoryForm`, `inventoryForm`, `showNeedsRestock`.
- Work orders UI state: `showWorkOrderForm`, `workOrderDetail*`, `progressEdits`, `selectedWorkOrder*`.
- Worker directory state: `showWorkerForm`, `workerForm`, `workerDetail*`, `workerAvailSchedule`.
- Profile state: `profileEdit*`, `showPasswordModal`, `passwordForm`.

### Proposed Page Breakout (Concrete)
- `DashboardPage`: uses `Dashboard` component, reads `deliveries`, `inventory`, `motdItems`, `users`, `workOrders`.
- `ProfilePage`: owns `profileEdit*`, `password*`, `profileAvailSchedule` state.
- `ClientsPage`: owns `clientForm`, `clientSearch`, `clientSort*`, mailing list sidebar state.
- `InventoryPage`: owns `inventoryForm`, `showNeedsRestock`.
- `WorkOrdersPage`: owns `workOrderDetail*`, `progressEdits`, `selectedWorkOrder*`.
- `MetricsPage`: owns metrics view state (currently inline).
- `WorkerDirectoryPage`: owns `workerForm`, `workerDetail*`, `workerAvailSchedule`.
- `ReportsPage`: use existing `ReportsTab`.
- `AdminPage`: use existing `AdminPanel`.

### Step 1: Identify Feature Boundaries
In `App.tsx`, mark sections by feature:
- Client CRUD + UI
- Work orders + delivery events
- Inventory items
- Invoices + printing
- User management
- Reports + audit logs
- Admin/Settings

Do a first pass extracting each section into a page component that still receives props from `App.tsx`.

### Step 2: Create Page Containers
For each tab/page, create a container that:
- Owns local UI state (filters, modal visibility).
- Owns local derived data (filtered lists).
- Calls shared data loaders / commands via `src/api/tauri.ts`.

Example container responsibilities:
- `ClientsPage`: search/filter, create/edit modal state, table rendering.
- `WorkOrdersPage`: filters, status transitions, delivery assignment UX.
- `InventoryPage`: reorder logic, reserved quantity display.

### Step 3: Extract Feature Components
Within each page:
- Extract reusable components to `src/features/<feature>/components/`.
- Extract complex forms to `src/features/<feature>/forms/`.
- Extract list/table rendering to `src/features/<feature>/lists/`.

Examples:
- `ClientForm`, `ClientTable`, `WorkOrderForm`, `InvoicePreview`.

### Step 4: Centralize Shared Helpers
Move duplicated helpers out of `App.tsx`:
- Validation: `src/utils/validation.ts`
- Formatting: `src/utils/format.ts`
- UI helpers: `src/components/shared/*`

Audit `App.tsx` for repeated:
- date formatting
- currency formatting
- select option generation
- role/permission checks

### Step 5: Stabilize App State Boundaries
Keep `App.tsx` as a shell that:
- Loads global data (current user, shared lookups).
- Owns top-level navigation state (current tab).
- Provides shared context or props to pages.

Do not keep feature-specific state in `App.tsx`.

### Step 6: Extract Data Loaders and Actions
If `App.tsx` mixes data loading with UI rendering:
- Move data access logic into `src/api/tauri.ts` or a `src/features/<feature>/api.ts`.
- Provide thin wrapper functions for each command.

When refactoring, keep behavior identical:
- Keep the same parameter and return types.
- Keep the same error handling and toast behavior.

### Step 7: Reduce Prop Drilling
If a page needs many shared values:
- Use React context for truly global state (current user, role, permissions).
- Prefer explicit props for feature data to keep dependencies visible.

### Step 8: Incremental Refactor Plan (Suggested Order for This Repo)
Refactor one tab at a time to reduce risk:
1. Extract `DashboardPage` (already isolated component)
2. Extract `ProfilePage` (isolates account + password flows)
3. Extract `ClientsPage` (largest UI chunk)
4. Extract `InventoryPage`
5. Extract `WorkOrdersPage` (largest data/commands usage)
6. Extract `MetricsPage`
7. Extract `WorkerDirectoryPage`
8. Extract `ReportsPage` (already isolated component)
9. Extract `AdminPage` (already isolated component)

After each extraction:
- Ensure UI matches current behavior.
- Verify commands and modals still work.

### Step 9: Update Imports and Exports
Use barrel exports for features:
- `src/features/clients/index.ts`
- `src/features/workOrders/index.ts`

Keep public surface small:
- Export page component and types needed by `App.tsx`.

### Step 10: Clean Up App.tsx
Once all pages are extracted:
- `App.tsx` should only wire navigation + layout.
- Ensure CSS and global styles remain applied.

### Example Final App.tsx Responsibilities
- Render `Nav`
- Handle route/tab selection
- Render `CurrentPage`
- Provide global error boundary
- Provide global modals (if any)

### Suggested Minimal App.tsx API Shape
Keep `App.tsx` passing only:
- `session`, `setSession`, `activeTab`, `setActiveTab`
- shared datasets and setters (if not moved to page-level loading)
- global error boundary and top-level layout

### Risk Mitigation
- Refactor in small steps and test after each extraction.
- Keep existing component tests passing.
- Use TS types to ensure API compatibility.

### Optional Improvements After Split
- Introduce route-based code splitting for large pages.
- Add a `src/state/` for more structured app state.
- Add feature-level tests.

