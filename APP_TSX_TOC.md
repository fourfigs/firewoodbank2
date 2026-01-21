# App.tsx Line Index

This file lists high-level sections in `src/App.tsx` with line numbers for quick navigation.

## File Overview
- 1-9: Imports
- 11: `tabs` list
- 13: `Role` type
- 15: `UserSession` type
- 26: `ClientRow` type
- 55: `ClientConflictRow` type
- 63: `InventoryRow` type
- 75: `WorkOrderRow` type
- 97: `UserRow` type
- 123: `LoginResponse` type
- 134: `DeliveryEventRow` type
- 145: `MotdRow` type
- 153: `AuditLogRow` type

## Helper Utilities
- 163-169: `normalizePhone`
- 171: `isValidPhone`
- 172: `normalizeState`
- 173-180: `US_STATES`
- 181-184: `isValidState`
- 185: `normalizePostal`
- 186: `isValidPostal`
- 187-194: `initCapCity`
- 195-204: `safeDate`
- 206: `isSameDay`

## Components
- 208-375: `LoginCard` component (login + forgot password flow)
- 377-4127: `App` component (main app shell)

## App Component Detail
- 378-560: `useState` hooks (app state, forms, flags)
- 558-644: form helpers (`buildBlankClientForm`, `buildBlankInventoryForm`, `resetClientForm`, `resetInventoryForm`)
- 579-647: data loaders (`loadClients`, `loadInventory`, `loadWorkOrders`, `loadDeliveries`, `loadUsers`, `loadAuditLogs`, `loadMotd`, `loadAll`)
- 689-867: memoized derived data (`filteredClients`, `visibleTabs`, `initials`, `userDeliveryHours`, `deliveredOrdersForClient`)
- 741-775: effects (initial loads + report refresh)

## App Render: Tabs
- 968-978: Dashboard tab render
- 979-982: Admin tab render
- 983-1998: Clients tab render
- 1999-2253: Inventory tab render
- 2254-3268: Work Orders tab render
- 3269-3371: Metrics tab render
- 3372-3984: Worker Directory tab render
- 3985-4127: Reports tab render
