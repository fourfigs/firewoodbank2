# 🔥 Community Firewood Bank - App.tsx Complete Index

**Updated: January 22, 2026** - Comprehensive management system with financial tracking, improved status handling, and community impact metrics.

**⚠️ Navigation Note**: Line numbers may shift during development. Use Ctrl+F search for specific functions, or use the section headers as search terms. For the most current navigation, search for the comments added throughout the code that reference this ToC.

## 📋 Quick Navigation Guide

Use Ctrl+G in your editor and enter the line number to jump directly to any section.

---

## 📁 File Structure Overview

### Core Imports & Setup
- **1-15**: React imports, components, API, types
- **16**: Navigation tabs configuration (Dashboard, Profile, Clients, Inventory, Work Orders, Metrics, Finance, Worker Directory, Reports, Admin)
- **17**: Role type definitions
- **19**: UserSession interface

### Type Definitions (Types moved to types.ts)
- **21-227**: All data model types (ClientRow, WorkOrderRow, ExpenseRow, DonationRow, etc.)

### Utility Functions
- **229-280**: Data normalization (phone, state, postal, city formatting)
- **282-310**: Date/time utilities and validation helpers

---

## 🔐 Authentication & Login

### LoginCard Component
- **312-478**: Login form, forgot password, demo credentials display

---

## 🏢 Main Application (App Component)

### State Management (useState hooks)
- **480-350**: Core app state (clients, work orders, inventory, users, sessions)
- **351-380**: Form state management (client forms, work order forms, etc.)
- **381-400**: UI state (modals, filters, selections, errors)

### Data Loading Functions
- **402-480**: Individual loaders (`loadClients`, `loadInventory`, `loadWorkOrders`, etc.)
- **481-500**: Composite loaders (`loadAll`, `loadWorkOrderStatusHistory`)

### Derived Data & Memoization
- **502-580**: Filtered data (`filteredClients`, `visibleTabs`, `userDeliveryHours`)
- **582-650**: Complex computed values and validation helpers

### Event Handlers & Business Logic
- **652-750**: Form submissions, CRUD operations, status updates
- **752-820**: Modal management and UI interactions

### Effects & Lifecycle
- **822-860**: useEffect hooks for data loading and side effects

---

## 🎨 UI Rendering (Main Render Function)

### Header & Navigation
- **862-920**: App header, user info, logout functionality

### Tab-Based Content Rendering

#### 🏠 Dashboard Tab
- **1483-1580**: Overview cards, upcoming deliveries, metrics summary

#### 👤 Profile Tab
- **1581-1880**: User profile management, password changes, availability

#### 👥 Clients Tab
- **1881-2380**: Client list, search/filter, onboarding forms, approval workflow

#### 📦 Inventory Tab
- **2381-2680**: Equipment tracking, reorder alerts, CRUD operations

#### 🚛 Work Orders Tab
- **2681-3680**: Work order creation, scheduling, driver assignments, status updates

#### 📊 Metrics Tab
- **5856-5955**: Community impact metrics, operational KPIs, resource utilization

#### 💰 Finance Tab
- **5956-6055**: Expense tracking, donation management, budget analysis, financial reports

#### 👷 Worker Directory Tab
- **6056-6555**: Staff management, role assignments, driver licensing

#### 📋 Reports Tab
- **6556-6655**: Audit logs, compliance checklists, system monitoring

#### ⚙️ Admin Tab
- **6656-6755**: System administration, change requests, MOTD management

### Modal Components
- **3951-4500**: Work order details, status history, form modals
- **4501-5000**: Password reset, confirmation dialogs

### Login Screen
- **5001-5100**: Login interface, MOTD display, branding

---

## 🔧 Key Features & Functionality

### Status Management (Fixed)
- **Work order status transitions**: Proper validation, role-based permissions
- **Status history tracking**: Complete audit trail of all status changes
- **Smart scheduling**: Automatic status updates when dates are set

### Financial Tracking (New)
- **Expense management**: Categorized spending with receipt support
- **Donation tracking**: Revenue from various sources
- **Time entry system**: Volunteer and paid hours attribution
- **Budget analysis**: Annual budgets vs. actual spending

### Community Impact Metrics
- **Real-time dashboards**: Households served, wood distributed
- **Operational efficiency**: Completion rates, volunteer engagement
- **Financial transparency**: Revenue/expense tracking, net position

### Enhanced Security & Compliance
- **Role-based access**: Granular permissions for different user types
- **PII protection**: HIPAA-aware data masking
- **Audit logging**: Complete activity tracking
- **Data validation**: Comprehensive input validation and business rules

---

## 🚀 Recent Major Updates (2026)

### Status Handling Overhaul
- Fixed overly restrictive status transitions
- Added proper business logic validation
- Implemented status history tracking
- Created role-based permission system

### Financial Management System
- Complete expense and donation tracking
- Budget analysis and reporting
- Time entry system for volunteer attribution
- Comprehensive financial dashboards

### Enhanced Metrics & Reporting
- Real-time community impact metrics
- Operational efficiency KPIs
- Financial transparency dashboards
- Historical trend analysis

### Cross-Platform Improvements
- Better file path handling for Windows/macOS/Linux
- Enhanced error handling and user feedback
- Improved mobile responsiveness

---

## 🛠️ Development Notes

- **Line numbers change frequently** - Use search (Ctrl+F) for specific functions
- **Component extraction needed** - App.tsx is ~7200 lines, should be split into feature modules
- **Type safety improved** - All major types now in dedicated types.ts file
- **Performance optimized** - Heavy use of useMemo for expensive computations

---

## 📚 Related Files

- `src/types.ts` - All type definitions
- `src/components/` - Extracted components
- `src-tauri/src/main.rs` - Backend API and business logic
- `ROADMAP.md` - Development history and future plans
- `CODE_INDEX.md` - Detailed API reference
