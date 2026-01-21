# App.tsx Line Index

This file lists high-level sections in `src/App.tsx` with line numbers for quick navigation.
**Total Lines**: 5,979
**Last Updated**: 2026-01-20

## File Overview
- 1-31: Imports and type imports
- 32-41: `tabs` array (navigation tabs)
- 45-234: `LoginCard` component (login + forgot password flow)
- 236-5976: `App` component (main app shell)
- 5979: Export statement

## App Component Structure
- 237-242: Component setup (useState for activeTab, session)
- 244-393: State declarations (40+ useState hooks for all app state)
- 394-430: Form state initialization
- 431-446: Additional state declarations
- 447-656: Helper functions and form builders
- 657-785: Data loading functions (`loadClients`, `loadInventory`, etc.)
- 786-829: Memoized derived data (`filteredClients`, `visibleTabs`, etc.)
- 830-831: Effects for initial data loading
- 832-889: Render setup (visible tabs, user permissions)

## App Render: Tabs
- 890-907: Dashboard tab render
- 909: Admin tab render (single line component)
- 911-2390: Clients tab render (~1,480 lines - LARGEST SECTION)
- 2391-2762: Inventory tab render (~372 lines)
- 2763-4738: Work Orders tab render (~1,976 lines)
- 4739-4852: Metrics tab render (~114 lines)
- 4853-5803: Worker Directory tab render (~951 lines)
- 5805-5815: Reports tab render (ReportsTab component)

## Key Issues Identified
- **Massive Clients tab**: 1,480 lines (25% of component) - needs extraction
- **Massive Work Orders tab**: 1,976 lines (33% of component) - needs extraction
- **Excessive props drilling**: 40+ state variables passed down
- **Inline styles everywhere**: No centralized styling system
- **Mixed concerns**: Business logic, UI rendering, and state management all in one file
