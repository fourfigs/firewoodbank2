# App.tsx Line Index

This file lists high-level sections in `src/App.tsx` with line numbers for quick navigation.

## File Overview
- 1-9: Imports
- 11: `tabs` list
- 13: `Role` type
- 15: `UserSession` type
- 24: `ClientRow` type
- 53: `ClientConflictRow` type
- 61: `InventoryRow` type
- 73: `WorkOrderRow` type
- 95: `UserRow` type
- 111: `DeliveryEventRow` type
- 122: `MotdRow` type
- 130: `AuditLogRow` type

## Helper Utilities
- 140-146: `normalizePhone`
- 148: `isValidPhone`
- 149: `normalizeState`
- 150-157: `US_STATES`
- 158-161: `isValidState`
- 162: `normalizePostal`
- 163: `isValidPostal`
- 164-170: `initCapCity`
- 172-181: `safeDate`

## Components
- 183-365: `LoginCard` component (login + forgot password flow)
- 366-3571: `App` component (main app shell)

## App Component Detail
- 367-518: `useState` hooks (app state, forms, flags)
- 438-535: form helpers (`buildBlankClientForm`, `buildBlankInventoryForm`, `resetClientForm`, `resetInventoryForm`)
- 543-611: data loaders (`loadClients`, `loadInventory`, `loadWorkOrders`, `loadDeliveries`, `loadUsers`, `loadAuditLogs`, `loadMotd`, `loadAll`)
- 633-734: memoized derived data (`filteredClients`, `visibleTabs`, `initials`, `userDeliveryHours`)
- 709-718: effects (initial loads + report refresh)

## App Render: Tabs
- 828-838: Dashboard tab render
- 839-842: Admin tab render
- 843-1795: Clients tab render
- 1796-2050: Inventory tab render
- 2051-2977: Work Orders tab render
- 2978-3080: Metrics tab render
- 3081-3440: Worker Directory tab render
- 3441-3571: Reports tab render
