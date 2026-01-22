/**
 * 🔥 Community Firewood Bank - Main Application Component
 *
 * This is the main App.tsx file containing the complete firewood bank management system.
 * For easy navigation, see APP_TSX_TOC.md for a detailed line-by-line index of all sections.
 *
 * Key Features:
 * - Client onboarding and management
 * - Work order scheduling and tracking
 * - Inventory management with reorder alerts
 * - Financial tracking (expenses, donations, budgets)
 * - Comprehensive metrics and reporting
 * - Role-based access control with HIPAA compliance
 * - Status history and audit logging
 *
 * Recent Major Updates (2026):
 * - Complete work order status handling overhaul
 * - Financial management system (expenses, donations, time tracking)
 * - Enhanced community impact metrics
 * - Cross-platform improvements
 *
 * File Size: ~7200 lines (consider splitting into feature modules)
 * See APP_TSX_TOC.md for navigation assistance.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

import { invokeTauri } from "./api/tauri";
import Nav from "./components/Nav";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import ReportsTab from "./components/ReportsTab";
import ProfileSummary from "./components/ProfileSummary.tsx";
import WorkOrdersTable from "./components/WorkOrdersTable.tsx";
import ComprehensiveMetrics from "./components/ComprehensiveMetrics.tsx";
import FinancialDashboard from "./components/FinancialDashboard.tsx";
import WorkOrderStatusDropdown from "./components/WorkOrderStatusDropdown.tsx";
import logo from "./assets/logo.png";
import firewoodIcon from "./assets/logo.png";
import "./index.css";
import {
  AuditLogRow,
  BudgetCategoryRow,
  ClientApprovalHistoryRow,
  ClientCommunicationRow,
  ClientConflictRow,
  ClientFeedbackRow,
  ClientRow,
  DeliveryEventRow,
  DonationRow,
  ExpenseRow,
  InventoryRow,
  LoginResponse,
  MotdRow,
  TimeEntryRow,
  UserRow,
  UserSession,
  WorkOrderRow,
  WorkOrderStatusHistoryRow,
} from "./types";
import { initCapCity, isSameDay, normalizePhone, normalizeState, safeDate } from "./utils/format";
import {
  normalizeAndValidatePhone,
  normalizeAndValidatePostal,
  normalizeAndValidateState,
  normalizeCity,
} from "./utils/validation";

// Main navigation tabs - see APP_TSX_TOC.md for section line numbers
const tabs = [
  "Dashboard",        // Lines ~922-1050: Overview, metrics, deliveries
  "Profile",          // Lines ~1051-1350: User profile, password, availability
  "Clients",          // Lines ~1351-1850: Client management, onboarding, approvals
  "Inventory",        // Lines ~1851-2150: Equipment tracking, reorder alerts
  "Work Orders",      // Lines ~2151-3150: Scheduling, assignments, status updates
  "Metrics",          // Lines ~3151-3250: Community impact, operational KPIs
  "Finance",          // Lines ~3251-3350: Expenses, donations, budget analysis
  "Worker Directory", // Lines ~3351-3750: Staff management, role assignments
  "Reports",          // Lines ~3751-3850: Audit logs, compliance checklists
  "Admin",            // Lines ~3851-3950: System administration, change requests
];

// Client numbers removed — no generation function needed anymore.

function LoginCard({ onLogin }: { onLogin: (session: UserSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  // Forgot Password State
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const isMounted = useRef(true);

  // Toggle login-mode class on body
  useEffect(() => {
    document.body.classList.add("login-mode");
    return () => {
      document.body.classList.remove("login-mode");
      isMounted.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginError(null);
    setCapsLockOn(false);
    try {
      const response = await invokeTauri<LoginResponse>("login_user", {
        input: { username, password },
      });
      onLogin({
        userId: response.user_id,
        name: response.name,
        username: response.username,
        role: response.role,
        hipaaCertified: response.hipaa_certified === 1,
        isDriver: response.is_driver === 1,
        email: response.email ?? undefined,
        telephone: response.telephone ?? null,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Login failed. Check your username and password.";
      setLoginError(message);
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    invokeTauri("request_password_reset", {
      input: {
        identifier: forgotEmail.trim(),
      },
    })
      .catch(() => {
        if (isMounted.current) {
          setResetMessage("We could not submit your reset request. Please contact an admin.");
        }
      })
      .finally(() => {
        if (isMounted.current) {
          setResetMessage((prev) =>
            prev ?? `If an account exists for "${forgotEmail}", a reset code has been sent.`,
          );
          setSubmitting(false);
        }
      });
  };

  const handleCapsLockCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const modifierState = e.getModifierState?.("CapsLock") ?? false;
    setCapsLockOn(modifierState);
  };

  return (
    <div className="login-card-content">
      {isForgot ? (
        // Forgot Password View
        <div className="fade-in">
          <h2>Lost Password</h2>
          <p className="subtitle" style={{ marginBottom: 20 }}>
            Enter your username or email address and we will send you a reset code.
          </p>
          {resetMessage && (
            <div
              className="pill"
              style={{
                display: "block",
                marginBottom: 20,
                background: "#f1f8f1",
                color: "#2d6b3d",
              }}
            >
              {resetMessage}
            </div>
          )}
          <form onSubmit={handleForgotSubmit}>
            <div className="login-field">
              <label>Username or Email</label>
              <input
                required
                autoComplete="username"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  setResetMessage(null);
                }}
                placeholder="user@example.com"
              />
            </div>
            <button className="login-btn" type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send Reset Code"}
            </button>
            <div className="login-options" style={{ justifyContent: "center", marginTop: 16 }}>
              <button 
                className="login-link" 
                type="button" 
                onClick={() => {
                  setIsForgot(false);
                  setResetMessage(null);
                  setLoginError(null);
                  setSubmitting(false);
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      ) : (
        // Login View
        <div className="fade-in">
          <h2>Sign In</h2>
          <div
            className="badge"
            style={{
              marginBottom: 24,
              background: "#e8f5e9",
              color: "var(--brand-green)",
              textAlign: "center",
              display: "block",
            }}
          >
            💡 Demo: admin/admin, staff/staff, employee/employee, volunteer/volunteer
          </div>
          {loginError && (
            <div
              className="pill"
              style={{
                display: "block",
                marginBottom: 16,
                background: "#fbe2e2",
                color: "#b3261e",
              }}
              aria-live="polite"
            >
              {loginError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                autoFocus
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (loginError) setLoginError(null);
                }}
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                onKeyUp={handleCapsLockCheck}
              />
              {capsLockOn && (
                <div className="muted" style={{ marginTop: 6, color: "#b3261e" }}>
                  Caps Lock is on.
                </div>
              )}
            </div>

            <button className="login-btn" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>
            
            <div className="login-options" style={{ justifyContent: "center", marginTop: 16 }}>
                 <button
                   className="login-link"
                   type="button"
                   onClick={() => {
                     setIsForgot(true);
                     setLoginError(null);
                     setSubmitting(false);
                   }}
                 >
                   Lost Password?
                 </button>
                 <button
                   className="login-link"
                   type="button"
                   onClick={() => setShowPassword((prev) => !prev)}
                 >
                   {showPassword ? "Hide password" : "Show password"}
                 </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="login-footer-links">
        <a href="https://nm-era.org" target="_blank" rel="noreferrer">
          nm-era.org
        </a>
          <span className="separator">•</span>
          <a href="mailto:organize@nm-era.org">organize@nm-era.org</a>
      </div>
    </div>
  );
}

function App() {
  // ===== STATE MANAGEMENT =====
  // See APP_TSX_TOC.md for detailed breakdown of state variables and their purposes

  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [session, setSession] = useState<UserSession | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryEventRow[]>([]);
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(50);
  const [workOrdersPage, setWorkOrdersPage] = useState(1);
  const [workOrdersPageSize, setWorkOrdersPageSize] = useState(50);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
  const [newWorkOrderId, setNewWorkOrderId] = useState<string>("");
  const [newWorkOrderEntryDate, setNewWorkOrderEntryDate] = useState<string>("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [workOrderError, setWorkOrderError] = useState<string | null>(null);
  const [progressEdits, setProgressEdits] = useState<
    Record<string, { status: string; mileage: string; hours: string }>
  >({});
  const [_driverEdits, _setDriverEdits] = useState<Record<string, { mileage: string }>>({});
  const [selectedWorker, setSelectedWorker] = useState<UserRow | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerDetailOpen, setWorkerDetailOpen] = useState(false);
  const [workerDetailEditMode, setWorkerDetailEditMode] = useState(false);
  const [workerEditMailingSameAsPhysical, setWorkerEditMailingSameAsPhysical] = useState(true);
  const [workerEdit, setWorkerEdit] = useState<Partial<UserRow> | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [workerAvailSchedule, setWorkerAvailSchedule] = useState<Record<string, boolean>>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [showNeedsRestock, setShowNeedsRestock] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditLogFilter, setAuditLogFilter] = useState<string>("all");

  // Financial tracking state
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryRow[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategoryRow[]>([]);
  const [mailingListSidebarOpen, setMailingListSidebarOpen] = useState(false);
  const [mailingListFilter, setMailingListFilter] = useState<string>("all"); // "all", "mail", "email", "both"
  const [clientDetailSidebarOpen, setClientDetailSidebarOpen] = useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<ClientRow | null>(null);
  const [clientSortField, setClientSortField] = useState<string>("first_name"); // "first_name", "last_name", "phone", "state", "approval_status"
  const [clientSortDirection, setClientSortDirection] = useState<"asc" | "desc">("asc");
  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedSearchFilters, setAdvancedSearchFilters] = useState({
    search_term: "",
    approval_status: "",
    referring_agency: "",
    date_from: "",
    date_to: "",
    has_email: undefined as boolean | undefined,
    has_phone: undefined as boolean | undefined,
  });
  // Client detail tracking state
  const [clientApprovalHistory, setClientApprovalHistory] = useState<ClientApprovalHistoryRow[]>([]);
  const [clientCommunications, setClientCommunications] = useState<ClientCommunicationRow[]>([]);
  const [clientFeedback, setClientFeedback] = useState<ClientFeedbackRow[]>([]);
  // Communication and feedback form state
  const [showCommunicationForm, setShowCommunicationForm] = useState(false);
  const [communicationForm, setCommunicationForm] = useState({
    communication_type: "phone",
    direction: "outbound",
    subject: "",
    message: "",
    notes: "",
  });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    feedback_type: "satisfaction",
    rating: 5,
    comments: "",
    work_order_id: "",
  });
  const [motdItems, setMotdItems] = useState<MotdRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderRow | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [workOrderDetailOpen, setWorkOrderDetailOpen] = useState(false);
  const [workOrderDetailEdit, setWorkOrderDetailEdit] = useState<{
    scheduled_date: string;
    assignees: string[];
    helpers: string[];
  } | null>(null);
  const [workOrderDetailError, setWorkOrderDetailError] = useState<string | null>(null);
  const [workOrderStatusHistory, setWorkOrderStatusHistory] = useState<any[]>([]);

  // ===== DATA LOADING FUNCTIONS =====
  // See APP_TSX_TOC.md for complete list of loaders and their line numbers

  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileEdit, setProfileEdit] = useState({
    email: "",
    telephone: "",
    physical_address_line1: "",
    physical_address_line2: "",
    physical_address_city: "",
    physical_address_state: "",
    physical_address_postal_code: "",
    mailing_same_as_physical: true,
    mailing_address_line1: "",
    mailing_address_line2: "",
    mailing_address_city: "",
    mailing_address_state: "",
    mailing_address_postal_code: "",
    availability_notes: "",
    vehicle: "",
    driver_license_status: "",
    driver_license_number: "",
    driver_license_expires_on: "",
    is_driver: false,
    hipaa_certified: false,
  });
  const [profileAvailSchedule, setProfileAvailSchedule] = useState<Record<string, boolean>>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });

  // Worker form state (for adding new workers in Worker Directory tab)
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [workerPasswordReset, setWorkerPasswordReset] = useState("");
  const [workerForm, setWorkerForm] = useState<{
    name: string;
    email: string;
    telephone: string;
    username: string;
    password: string;
    physical_address_line1: string;
    physical_address_line2: string;
    physical_address_city: string;
    physical_address_state: string;
    physical_address_postal_code: string;
    mailing_same_as_physical: boolean;
    mailing_address_line1: string;
    mailing_address_line2: string;
    mailing_address_city: string;
    mailing_address_state: string;
    mailing_address_postal_code: string;
    role: string;
    is_driver: boolean;
  }>({
    name: "",
    email: "",
    telephone: "",
    username: "",
    password: "",
    physical_address_line1: "",
    physical_address_line2: "",
    physical_address_city: "",
    physical_address_state: "",
    physical_address_postal_code: "",
    mailing_same_as_physical: true,
    mailing_address_line1: "",
    mailing_address_line2: "",
    mailing_address_city: "",
    mailing_address_state: "",
    mailing_address_postal_code: "",
    role: "volunteer",
    is_driver: false,
  });
  const [workerFormError, setWorkerFormError] = useState<string | null>(null);

  // User creation modal state
  // (Removed UserFormModal)

  const [_revisionSidebarOpen, _setRevisionSidebarOpen] = useState(false);

  const buildBlankClientForm = () => ({
    first_name: "",
    last_name: "",
    date_of_onboarding: "", // Will be generated after creation
    approval_expires_on: "",
    last_reapproval_date: "",
    requires_reapproval: false,
    physical_address_line1: "",
    physical_address_line2: "",
    physical_address_city: "",
    physical_address_state: "",
    physical_address_postal_code: "",
    mailing_same_as_physical: true,
    mailing_address_line1: "",
    mailing_address_line2: "",
    mailing_address_city: "",
    mailing_address_state: "",
    mailing_address_postal_code: "",
    telephone: "",
    email: "",
    opt_out_email: false, // Opt out of email mailing list
    // Emergency contact
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    // Household information
    household_size: "",
    household_income_range: "",
    household_composition: "",
    // Delivery preferences
    preferred_delivery_times: "",
    delivery_restrictions: "",
    preferred_driver_id: "",
    seasonal_delivery_pattern: "",
    how_did_they_hear_about_us: "",
    referring_agency: "",
    approval_status: "pending",
    denial_reason: "",
    gate_combo: "",
    notes: "",
    wood_size_label: "",
    wood_size_other: "",
    directions: "",
  });

  const INVENTORY_CATEGORIES = ["Wood", "Tools", "Gas", "Other"] as const;

  const buildBlankInventoryForm = () => ({
    name: "",
    category: "",
    customCategory: "",
    quantity_on_hand: 0,
    unit: "pcs",
    reorder_threshold: 0,
    reorder_amount: 0,
    notes: "",
  });

  const [clientForm, setClientForm] = useState(buildBlankClientForm());

  const [inventoryForm, setInventoryForm] = useState(buildBlankInventoryForm);

  const formatDateTimeLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes(),
    )}`;
  };

  const toDateTimeLocalInput = (value?: string | null) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.includes("T")) {
      return trimmed.length >= 16 ? trimmed.slice(0, 16) : trimmed;
    }
    const withT = trimmed.replace(" ", "T");
    if (withT.includes("T") && withT.length >= 16) {
      return withT.slice(0, 16);
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : formatDateTimeLocal(parsed);
  };

  const loadWorkOrderStatusHistory = async (workOrderId: string) => {
    try {
      const data = await invokeTauri<WorkOrderStatusHistoryRow[]>("list_work_order_status_history", {
        work_order_id: workOrderId,
      });
      setWorkOrderStatusHistory(data);
    } catch {
      console.error("Error loading work order status history.");
      setWorkOrderStatusHistory([]);
    }
  };

  const closeWorkOrderDetail = () => {
    setWorkOrderDetailOpen(false);
    setWorkOrderDetailError(null);
    setWorkOrderDetailEdit(null);
  };

  const openWorkOrderDetail = (wo: WorkOrderRow) => {
    setSelectedWorkOrderId(wo.id);
    setSelectedWorkOrder(wo);
    setWorkOrderDetailOpen(true);
    setWorkOrderDetailError(null);
    loadWorkOrderStatusHistory(wo.id);
    const parsedAssignees = (() => {
      try {
        const arr = JSON.parse(wo.assignees_json ?? "[]");
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    })();
    const driverNames = new Set(
      users.filter((u) => !!u.driver_license_status).map((u) => u.name),
    );
    const assignees = parsedAssignees.filter((name) => driverNames.has(name));
    const helpers = parsedAssignees.filter((name) => !driverNames.has(name));
    setWorkOrderDetailEdit({
      scheduled_date: toDateTimeLocalInput(wo.scheduled_date),
      assignees,
      helpers,
    });
  };

  const [workOrderForm, setWorkOrderForm] = useState({
    client_id: "",
    scheduled_date: "",
    status: "received",
    gate_combo: "",
    notes: "",
    other_heat_source_gas: false,
    other_heat_source_electric: false,
    other_heat_source_other: "",
    mileage: "",
    work_hours: "",
    mailingSameAsPhysical: true,
    assignees: [] as string[],
    helpers: [] as string[],
    delivery_size_choice: "f250",
    delivery_size_other: "",
    delivery_size_other_cords: "",
    pickup_delivery_type: "delivery",
    pickup_quantity_mode: "cords",
    pickup_quantity_cords: "",
    pickup_length: "",
    pickup_width: "",
    pickup_height: "",
    pickup_units: "ft",
    paired_order_id: "",
  });

  const [workOrderNewClientEnabled, setWorkOrderNewClientEnabled] = useState(false);
  const [workOrderNewClient, setWorkOrderNewClient] = useState({
    first_name: "",
    last_name: "",
    date_of_onboarding: new Date().toISOString().slice(0, 10),
    physical_address_line1: "",
    physical_address_city: "",
    physical_address_state: "",
    physical_address_postal_code: "",
    telephone: "",
    email: "",
    how_did_they_hear_about_us: "",
    wood_size_label: "",
    wood_size_other: "",
  });

  const [_deliveryForm, _setDeliveryForm] = useState({
    title: "",
    description: "",
    event_type: "delivery",
    work_order_id: "",
    start_date: "",
    end_date: "",
    color_code: "#e67f1e",
  });

  const resetClientForm = () => {
    setEditingClientId(null);
    setClientForm(buildBlankClientForm());
    setShowClientForm(false);
    setClientError(null);
  };

  const resetInventoryForm = () => {
    setEditingInventoryId(null);
    setInventoryForm(buildBlankInventoryForm());
    setShowInventoryForm(false);
  };

  const loadClients = async () => {
    // Use advanced search if filters are active, otherwise use regular list
    const hasActiveFilters = 
      advancedSearchFilters.search_term.trim() ||
      advancedSearchFilters.approval_status ||
      advancedSearchFilters.referring_agency ||
      advancedSearchFilters.date_from ||
      advancedSearchFilters.date_to ||
      advancedSearchFilters.has_email !== undefined ||
      advancedSearchFilters.has_phone !== undefined;

    if (hasActiveFilters) {
      const data = await invokeTauri<ClientRow[]>("search_clients", {
        search_term: advancedSearchFilters.search_term.trim() || null,
        approval_status: advancedSearchFilters.approval_status || null,
        referring_agency: advancedSearchFilters.referring_agency || null,
        date_from: advancedSearchFilters.date_from || null,
        date_to: advancedSearchFilters.date_to || null,
        has_email: advancedSearchFilters.has_email,
        has_phone: advancedSearchFilters.has_phone,
      });
      setClients(data);
    } else {
      const data = await invokeTauri<ClientRow[]>("list_clients", {
        role: session?.role ?? null,
        username: session?.username ?? null,
        hipaa_certified: session?.hipaaCertified ?? false,
        is_driver: session?.isDriver ?? false,
      });
      setClients(data);
    }
  };

  const loadClientApprovalHistory = async (clientId: string) => {
    try {
      const data = await invokeTauri<ClientApprovalHistoryRow[]>("list_client_approval_history", {
        client_id: clientId,
      });
      setClientApprovalHistory(data);
    } catch {
      console.error("Error loading approval history.");
      setClientApprovalHistory([]);
    }
  };

  const loadClientCommunications = async (clientId: string) => {
    try {
      const data = await invokeTauri<ClientCommunicationRow[]>("list_client_communications", {
        client_id: clientId,
      });
      setClientCommunications(data);
    } catch {
      console.error("Error loading communications.");
      setClientCommunications([]);
    }
  };

  const loadClientFeedback = async (clientId: string) => {
    try {
      const data = await invokeTauri<ClientFeedbackRow[]>("list_client_feedback", {
        client_id: clientId,
      });
      setClientFeedback(data);
    } catch {
      console.error("Error loading feedback.");
      setClientFeedback([]);
    }
  };

  const loadInventory = async () => {
    const data = await invokeTauri<InventoryRow[]>("list_inventory_items");
    setInventory(data);
  };

  const loadWorkOrders = async () => {
    const data = await invokeTauri<WorkOrderRow[]>("list_work_orders", {
      role: session?.role ?? null,
      username: session?.username ?? null,
      hipaa_certified: session?.hipaaCertified ?? false,
      is_driver: session?.isDriver ?? false,
    });
    setWorkOrders(data);
    const nextProgress: Record<string, { status: string; mileage: string; hours: string }> = {};
    data.forEach((wo) => {
      nextProgress[wo.id] = {
        status: wo.status ?? "scheduled",
        mileage: wo.mileage != null ? String(wo.mileage) : "",
        hours: wo.work_hours != null ? String(wo.work_hours) : "",
      };
    });
    setProgressEdits(nextProgress);
  };

  const loadDeliveries = async () => {
    const data = await invokeTauri<DeliveryEventRow[]>("list_delivery_events", {
      role: session?.role ?? null,
      username: session?.username ?? null,
      hipaa_certified: session?.hipaaCertified ?? false,
      is_driver: session?.isDriver ?? false,
    });
    setDeliveries(data);
  };

  const createScheduleEvent = async (input: {
    title: string;
    description?: string | null;
    event_type: string;
    start_date: string;
    end_date?: string | null;
    color_code?: string | null;
  }) => {
    await invokeTauri("create_delivery_event", {
      input,
      role: session?.role ?? null,
      actor: session?.username ?? null,
    });
    await loadDeliveries();
  };

  const loadUsers = async () => {
    const data = await invokeTauri<UserRow[]>("list_users");
    const mapped = data.map((u) => ({
      ...u,
      is_driver: !!u.is_driver,
      // hipaa_certified is already a number (0 or 1) from backend
    }));
    setUsers(mapped);
  };

  const openWorkerDetail = (
    u: { id: string; name: string; role: string } & Partial<Omit<UserRow, "id" | "name" | "role">>,
  ) => {
    setSelectedWorkerId(u.id);
    setSelectedWorker({ ...u, role: u.role as UserRow["role"] } as UserRow);
    setWorkerDetailOpen(true);
    setWorkerDetailEditMode(false);
    setWorkerEditMailingSameAsPhysical(!u.mailing_address_line1?.trim());
    setWorkerEdit({
      email: u.email ?? "",
      telephone: u.telephone ?? "",
      physical_address_line1: u.physical_address_line1 ?? "",
      physical_address_line2: u.physical_address_line2 ?? "",
      physical_address_city: u.physical_address_city ?? "",
      physical_address_state: u.physical_address_state ?? "",
      physical_address_postal_code: u.physical_address_postal_code ?? "",
      mailing_address_line1: u.mailing_address_line1 ?? "",
      mailing_address_line2: u.mailing_address_line2 ?? "",
      mailing_address_city: u.mailing_address_city ?? "",
      mailing_address_state: u.mailing_address_state ?? "",
      mailing_address_postal_code: u.mailing_address_postal_code ?? "",
      availability_notes: u.availability_notes ?? "",
      vehicle: u.vehicle ?? "",
      driver_license_status: u.driver_license_status ?? "",
      driver_license_number: u.driver_license_number ?? "",
      driver_license_expires_on: u.driver_license_expires_on ?? "",
      is_driver: !!u.is_driver,
      hipaa_certified: u.hipaa_certified,
    });
    if (u.availability_schedule) {
      try {
        const parsed = JSON.parse(u.availability_schedule);
        setWorkerAvailSchedule(parsed);
      } catch {
        setWorkerAvailSchedule({
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
        });
      }
    } else {
      setWorkerAvailSchedule({
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      });
    }
    setWorkerError(null);
  };

  const loadAuditLogs = async () => {
    const data = await invokeTauri<AuditLogRow[]>("list_audit_logs", {
      filter: auditLogFilter,
    });
    setAuditLogs(data);
  };

  const loadMotd = async () => {
    try {
      const items = await invokeTauri<MotdRow[]>("list_motd", { active_only: true });
      // Backend returns newest first, but ensure ordering just in case.
      items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      setMotdItems(items);
    } catch {
      console.error("Error loading message of the day.");
    }
  };

  const loadExpenses = async () => {
    const data = await invokeTauri<ExpenseRow[]>("list_expenses", {});
    setExpenses(data);
  };

  const loadDonations = async () => {
    const data = await invokeTauri<DonationRow[]>("list_donations", {});
    setDonations(data);
  };

  const loadTimeEntries = async () => {
    const data = await invokeTauri<TimeEntryRow[]>("list_time_entries", {});
    setTimeEntries(data);
  };

  const loadBudgetCategories = async () => {
    const data = await invokeTauri<BudgetCategoryRow[]>("list_budget_categories", {});
    setBudgetCategories(data);
  };

  const loadAll = async () => {
    setBusy(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (
        session?.role === "admin" ||
        session?.role === "lead" ||
        session?.role === "staff" ||
        session?.role === "employee"
      ) {
        await invokeTauri("ensure_user_exists", {
          input: {
            name: session.name,
            email: session.email ?? null,
            telephone: session.telephone ?? null,
            physical_address_line1: null,
            physical_address_line2: null,
            physical_address_city: null,
            physical_address_state: null,
            physical_address_postal_code: null,
            mailing_address_line1: null,
            mailing_address_line2: null,
            mailing_address_city: null,
            mailing_address_state: null,
            mailing_address_postal_code: null,
            role: session.role,
            is_driver: session.isDriver ?? false,
            hipaa_certified: session.hipaaCertified ?? false,
          },
        });
        tasks.push(loadClients(), loadInventory(), loadUsers());
      }
      if (session?.role === "admin" || session?.role === "lead") {
        tasks.push(loadAuditLogs(), loadExpenses(), loadDonations(), loadTimeEntries(), loadBudgetCategories());
      }
      tasks.push(loadWorkOrders(), loadDeliveries(), loadMotd());
      await Promise.all(tasks);
    } finally {
      setBusy(false);
    }
  };

  const isAdmin = session?.role === "admin";
  const isLead = session?.role === "lead";
  const isStaffLike = session?.role === "staff" || session?.role === "employee";
  const canManage = isAdmin || isLead;
  const isDriver = session?.isDriver ?? false;
  const canCreateWorkOrders = isAdmin || isStaffLike;
  const workerDetailValues = workerEdit ?? selectedWorker;
  const canViewPII =
    isAdmin || (isLead && session.hipaaCertified);
  const canViewClientPII = canViewPII || isDriver;
  const profileUser = useMemo(
    () => (session ? users.find((u) => u.id === session.userId) ?? null : null),
    [session, users],
  );
  const profileWorkEvents = useMemo(() => {
    if (!session) return [];
    const uname = (session.username ?? "").toLowerCase();
    const displayName = (session.name ?? "").toLowerCase();
    return deliveries.filter((d) => {
      let assigned: string[] = [];
      try {
        const parsed = JSON.parse(d.assigned_user_ids_json ?? "[]");
        if (Array.isArray(parsed)) {
          assigned = parsed
            .map((x) => (typeof x === "string" ? x.toLowerCase() : ""))
            .filter(Boolean);
        }
      } catch {
        assigned = [];
      }
      return assigned.includes(uname) || (displayName && assigned.includes(displayName));
    });
  }, [deliveries, session]);
  const profileWorkByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    profileWorkEvents.forEach((ev) => {
      const date = new Date(ev.start_date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`;
      const type = (ev.event_type ?? "delivery").toLowerCase();
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)?.add(type);
    });
    return map;
  }, [profileWorkEvents]);
  const profileHourTotals = useMemo(() => {
    if (!session) return { weekly: 0, monthly: 0, total: 0 };
    const uname = (session.username ?? "").toLowerCase();
    const displayName = (session.name ?? "").toLowerCase();
    const nowDate = new Date();
    const weekStart = new Date(nowDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const monthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1);

    let weekly = 0;
    let monthly = 0;
    let total = 0;

    workOrders.forEach((wo) => {
      if ((wo.status ?? "").toLowerCase() !== "completed") return;
      if (wo.work_hours == null) return;
      let assignees: string[] = [];
      try {
        const parsed = JSON.parse(wo.assignees_json ?? "[]");
        if (Array.isArray(parsed)) {
          assignees = parsed
            .map((x) => (typeof x === "string" ? x.toLowerCase() : ""))
            .filter(Boolean);
        }
      } catch {
        assignees = [];
      }
      const matched = assignees.includes(uname) || (displayName && assignees.includes(displayName));
      if (!matched) return;
      const hours = Number(wo.work_hours) || 0;
      total += hours;
      const dateValue = new Date(wo.scheduled_date ?? wo.created_at ?? "");
      if (!Number.isNaN(dateValue.getTime())) {
        if (dateValue >= weekStart && dateValue < weekEnd) weekly += hours;
        if (dateValue >= monthStart && dateValue < monthEnd) monthly += hours;
      }
    });

    return { weekly, monthly, total };
  }, [session, workOrders]);
  const profileCalendarDays = useMemo(() => {
    const base = new Date();
    const year = base.getFullYear();
    const month = base.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ date: Date | null; key: string }> = [];
    for (let i = 0; i < startDay; i += 1) {
      days.push({ date: null, key: `blank-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      days.push({ date, key: `day-${day}` });
    }
    return days;
  }, []);

  const startProfileEdit = () => {
    const source = profileUser;
    setProfileEdit({
      email: source?.email ?? session?.email ?? "",
      telephone: source?.telephone ?? session?.telephone ?? "",
      physical_address_line1: source?.physical_address_line1 ?? "",
      physical_address_line2: source?.physical_address_line2 ?? "",
      physical_address_city: source?.physical_address_city ?? "",
      physical_address_state: source?.physical_address_state ?? "",
      physical_address_postal_code: source?.physical_address_postal_code ?? "",
      mailing_same_as_physical: !source?.mailing_address_line1?.trim(),
      mailing_address_line1: source?.mailing_address_line1 ?? "",
      mailing_address_line2: source?.mailing_address_line2 ?? "",
      mailing_address_city: source?.mailing_address_city ?? "",
      mailing_address_state: source?.mailing_address_state ?? "",
      mailing_address_postal_code: source?.mailing_address_postal_code ?? "",
      availability_notes: source?.availability_notes ?? "",
      vehicle: source?.vehicle ?? "",
      driver_license_status: source?.driver_license_status ?? "",
      driver_license_number: source?.driver_license_number ?? "",
      driver_license_expires_on: source?.driver_license_expires_on?.slice(0, 10) ?? "",
      is_driver: !!source?.is_driver,
      hipaa_certified: !!source?.hipaa_certified,
    });
    if (source?.availability_schedule) {
      try {
        const parsed = JSON.parse(source.availability_schedule);
        setProfileAvailSchedule({
          monday: !!parsed.monday,
          tuesday: !!parsed.tuesday,
          wednesday: !!parsed.wednesday,
          thursday: !!parsed.thursday,
          friday: !!parsed.friday,
          saturday: !!parsed.saturday,
          sunday: !!parsed.sunday,
        });
      } catch {
        setProfileAvailSchedule({
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
        });
      }
    } else {
      setProfileAvailSchedule({
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      });
    }
    setProfileEditMode(true);
  };

  const submitProfileChangeRequest = async () => {
    if (!session) return;
    const changes: string[] = [];
    const pushChange = (label: string, before?: string | null, after?: string | null) => {
      const prev = (before ?? "").trim();
      const next = (after ?? "").trim();
      if (prev !== next) changes.push(`${label}: "${prev || "—"}" → "${next || "—"}"`);
    };
    pushChange("Email", profileUser?.email, profileEdit.email);
    pushChange("Phone", profileUser?.telephone, profileEdit.telephone);
    pushChange(
      "Physical Address Line 1",
      profileUser?.physical_address_line1,
      profileEdit.physical_address_line1,
    );
    pushChange(
      "Physical Address Line 2",
      profileUser?.physical_address_line2,
      profileEdit.physical_address_line2,
    );
    pushChange(
      "Physical City",
      profileUser?.physical_address_city,
      profileEdit.physical_address_city,
    );
    pushChange(
      "Physical State",
      profileUser?.physical_address_state,
      profileEdit.physical_address_state,
    );
    pushChange(
      "Physical ZIP",
      profileUser?.physical_address_postal_code,
      profileEdit.physical_address_postal_code,
    );
    const mailingSame = profileEdit.mailing_same_as_physical;
    const mailingLine1 = mailingSame
      ? profileEdit.physical_address_line1
      : profileEdit.mailing_address_line1;
    const mailingLine2 = mailingSame
      ? profileEdit.physical_address_line2
      : profileEdit.mailing_address_line2;
    const mailingCity = mailingSame
      ? profileEdit.physical_address_city
      : profileEdit.mailing_address_city;
    const mailingState = mailingSame
      ? profileEdit.physical_address_state
      : profileEdit.mailing_address_state;
    const mailingPostal = mailingSame
      ? profileEdit.physical_address_postal_code
      : profileEdit.mailing_address_postal_code;
    pushChange(
      "Mailing Address Line 1",
      profileUser?.mailing_address_line1,
      mailingLine1,
    );
    pushChange(
      "Mailing Address Line 2",
      profileUser?.mailing_address_line2,
      mailingLine2,
    );
    pushChange("Mailing City", profileUser?.mailing_address_city, mailingCity);
    pushChange("Mailing State", profileUser?.mailing_address_state, mailingState);
    pushChange("Mailing ZIP", profileUser?.mailing_address_postal_code, mailingPostal);
    pushChange("Availability Notes", profileUser?.availability_notes, profileEdit.availability_notes);
    const scheduleSummary = Object.keys(profileAvailSchedule)
      .filter((d) => profileAvailSchedule[d])
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
      .join(", ");
    const previousSchedule = profileUser?.availability_schedule
      ? (() => {
          try {
            const parsed = JSON.parse(profileUser.availability_schedule);
            return Object.keys(parsed)
              .filter((d) => parsed[d])
              .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
              .join(", ");
          } catch {
            return "";
          }
        })()
      : "";
    pushChange("Availability Schedule", previousSchedule, scheduleSummary);
    pushChange("Vehicle", profileUser?.vehicle, profileEdit.vehicle);
    pushChange(
      "Driver License Status",
      profileUser?.driver_license_status,
      profileEdit.driver_license_status,
    );
    pushChange(
      "Driver License Number",
      profileUser?.driver_license_number,
      profileEdit.driver_license_number,
    );
    pushChange(
      "Driver License Expiration",
      profileUser?.driver_license_expires_on?.slice(0, 10),
      profileEdit.driver_license_expires_on,
    );
    pushChange("Driver", profileUser?.is_driver ? "Yes" : "No", profileEdit.is_driver ? "Yes" : "No");
    pushChange(
      "HIPAA Certified",
      profileUser?.hipaa_certified ? "Yes" : "No",
      profileEdit.hipaa_certified ? "Yes" : "No",
    );

    const description = changes.length
      ? changes.join("\n")
      : "No changes detected. Requested review of profile.";
    setBusy(true);
    try {
      await invokeTauri("create_change_request", {
        input: {
          title: "Profile update request",
          description,
          requested_by_user_id: session.username ?? session.userId ?? session.name,
        },
      });
      setProfileEditMode(false);
    } finally {
      setBusy(false);
    }
  };
  const filteredClients = useMemo(() => {
    let filtered = clients.filter((c) => {
      // If advanced search is active, clients are already filtered by backend
      if (showAdvancedSearch) {
        // Just apply local search term filter if any
        if (!advancedSearchFilters.search_term.trim()) return true;
        const term = advancedSearchFilters.search_term.toLowerCase();
        return (
          c.name.toLowerCase().includes(term) ||
          c.physical_address_city.toLowerCase().includes(term) ||
          (c.email && c.email.toLowerCase().includes(term)) ||
          (c.telephone && c.telephone.toLowerCase().includes(term)) ||
          (c.physical_address_line1 && c.physical_address_line1.toLowerCase().includes(term)) ||
          (c.notes && c.notes.toLowerCase().includes(term))
        );
      }
      // Simple search
      if (!clientSearch.trim()) return true;
      const term = clientSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) || c.physical_address_city.toLowerCase().includes(term)
      );
    });

    // Helper to extract first name from full name
    const getFirstName = (name: string) => {
      const parts = name.trim().split(" ");
      return parts[0]?.toLowerCase() || "";
    };

    // Helper to extract last name from full name
    const getLastName = (name: string) => {
      const parts = name.trim().split(" ");
      return parts.slice(1).join(" ").toLowerCase() || "";
    };

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (clientSortField) {
        case "first_name":
          aVal = getFirstName(a.name);
          bVal = getFirstName(b.name);
          break;
        case "last_name":
          aVal = getLastName(a.name);
          bVal = getLastName(b.name);
          break;
        case "phone":
          aVal = (a.telephone || "").toLowerCase();
          bVal = (b.telephone || "").toLowerCase();
          break;
        case "city":
          aVal = (a.physical_address_city || "").toLowerCase();
          bVal = (b.physical_address_city || "").toLowerCase();
          break;
        case "state":
          aVal = (a.physical_address_state || "").toLowerCase();
          bVal = (b.physical_address_state || "").toLowerCase();
          break;
        case "approval_status":
          aVal = a.approval_status.toLowerCase();
          bVal = b.approval_status.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return clientSortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [clients, clientSearch, clientSortField, clientSortDirection, showAdvancedSearch, advancedSearchFilters]);
  const clientPageCount = useMemo(
    () => Math.max(1, Math.ceil(filteredClients.length / clientPageSize)),
    [filteredClients.length, clientPageSize],
  );
  const pagedClients = useMemo(() => {
    const start = (clientPage - 1) * clientPageSize;
    return filteredClients.slice(start, start + clientPageSize);
  }, [filteredClients, clientPage, clientPageSize]);
  useEffect(() => {
    setClientPage(1);
  }, [clientSearch, clientSortField, clientSortDirection, showAdvancedSearch]);
  useEffect(() => {
    if (clientPage > clientPageCount) {
      setClientPage(clientPageCount);
    }
  }, [clientPage, clientPageCount]);

  const visibleWorkOrders = useMemo(() => {
    if (!session) return [];
    if (session.role === "volunteer") {
      return workOrders.filter((wo) => {
        const arr = (() => {
          try {
            return JSON.parse(wo.assignees_json ?? "[]");
          } catch {
            return [];
          }
        })();
        return session.username ? Array.isArray(arr) && arr.includes(session.username) : false;
      });
    }
    return workOrders;
  }, [session, workOrders]);
  const workOrdersPageCount = useMemo(
    () => Math.max(1, Math.ceil(visibleWorkOrders.length / workOrdersPageSize)),
    [visibleWorkOrders.length, workOrdersPageSize],
  );
  const pagedWorkOrders = useMemo(() => {
    const start = (workOrdersPage - 1) * workOrdersPageSize;
    return visibleWorkOrders.slice(start, start + workOrdersPageSize);
  }, [visibleWorkOrders, workOrdersPage, workOrdersPageSize]);
  useEffect(() => {
    setWorkOrdersPage(1);
  }, [session?.role, session?.username, workOrders.length]);
  useEffect(() => {
    if (workOrdersPage > workOrdersPageCount) {
      setWorkOrdersPage(workOrdersPageCount);
    }
  }, [workOrdersPage, workOrdersPageCount]);
  const visibleTabs = useMemo(() => {
    if (!session) return tabs.filter((t) => t !== "Worker Directory" && t !== "Reports" && t !== "Finance");
    if (session.role === "volunteer") return ["Dashboard", "Profile", "Work Orders"];
    if (session.role === "staff" || session.role === "employee")
      return ["Dashboard", "Profile", "Clients", "Inventory", "Work Orders", "Metrics"];
    // admin / lead - include Finance tab
    if (session.role === "admin" || session.role === "lead") return tabs;
    return tabs.filter((t) => t !== "Admin");
  }, [session]);

  useEffect(() => {
    if (session) {
      loadAll();
    } else {
      // Load MOTD even if not logged in (for login screen)
      loadMotd();
    }
  }, [session]);

  useEffect(() => {
    if (
      session &&
      (session.role === "admin" || session.role === "lead") &&
      activeTab === "Reports"
    ) {
      loadAuditLogs();
    }
  }, [auditLogFilter, activeTab, session]);

  useEffect(() => {
    if (
      session &&
      (session.role === "admin" || session.role === "lead") &&
      activeTab === "Finance"
    ) {
      loadExpenses();
      loadDonations();
      loadTimeEntries();
      loadBudgetCategories();
    }
  }, [activeTab, session]);

  const _initials = useMemo(() => {
    if (!session?.name) return "FB";
    const parts = session.name.split(" ").filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }, [session]);

  const workerDirectoryUsers = useMemo(() => {
    const base = [...users];
    if (
      session &&
      (session.role === "admin" ||
        session.role === "staff" ||
        session.role === "employee" ||
        session.role === "lead")
    ) {
      const exists = base.some(
        (u) => u.name.trim().toLowerCase() === session.name.trim().toLowerCase(),
      );
      if (!exists) {
        base.unshift({
          id: `session-${session.username || session.name}`,
          name: session.name,
          email: session.email ?? null,
          telephone: session.telephone ?? null,
          physical_address_line1: null,
          physical_address_line2: null,
          physical_address_city: null,
          physical_address_state: null,
          physical_address_postal_code: null,
          mailing_address_line1: null,
          mailing_address_line2: null,
          mailing_address_city: null,
          mailing_address_state: null,
          mailing_address_postal_code: null,
          role: session.role,
          availability_notes: null,
          availability_schedule: null,
          driver_license_status: null,
          driver_license_number: null,
          driver_license_expires_on: null,
          vehicle: null,
          is_driver: session.isDriver ?? false,
          hipaa_certified: session.hipaaCertified ? 1 : 0,
        });
      }
    }
    return base;
  }, [session, users]);

  const userDeliveryHours = useMemo(() => {
    if (!session?.username) return { hours: 0, deliveries: 0, woodCreditCords: 0 };
    const uname = session.username.toLowerCase();
    const displayLower = (session.name ?? "").toLowerCase();
    const defaultHours = 1.5;
    const milesPerHourFactor = 0.75 / 60; // 0.75 minutes per mile => hours per mile
    const mileageByWorkOrder: Record<string, number | undefined> = {};
    const deliverySizeByWorkOrder: Record<string, number | undefined> = {};
    workOrders.forEach((wo) => {
      mileageByWorkOrder[wo.id] = typeof wo.mileage === "number" ? wo.mileage : undefined;
      deliverySizeByWorkOrder[wo.id] =
        typeof wo.delivery_size_cords === "number" ? wo.delivery_size_cords : undefined;
    });
    let totalHours = 0;
    let totalDeliveries = 0;
    let totalWoodCords = 0;
    deliveries.forEach((d) => {
      let assigned: string[] = [];
      try {
        const arr = JSON.parse(d.assigned_user_ids_json ?? "[]");
        if (Array.isArray(arr)) {
          assigned = arr.map((x) => (typeof x === "string" ? x.toLowerCase() : "")).filter(Boolean);
        }
      } catch {
        assigned = [];
      }
      const matched =
        assigned.includes(uname) || (displayLower.length > 0 && assigned.includes(displayLower));
      if (matched) {
        totalDeliveries += 1;
        const miles = d.work_order_id ? mileageByWorkOrder[d.work_order_id] : undefined;
        const deliverySize = d.work_order_id ? deliverySizeByWorkOrder[d.work_order_id] : undefined;
        if (typeof miles === "number" && miles >= 0) {
          totalHours += Math.max(0.1, miles * milesPerHourFactor);
        } else {
          totalHours += defaultHours;
        }
        totalWoodCords +=
          typeof deliverySize === "number" && deliverySize > 0 ? deliverySize : 0.33;
      }
    });
    return { hours: totalHours, deliveries: totalDeliveries, woodCreditCords: totalWoodCords };
  }, [deliveries, workOrders, session?.username, session?.name]);

  const deliveredOrdersForClient = useMemo(() => {
    if (!selectedClientForDetail) return [];
    const name = selectedClientForDetail.name.trim().toLowerCase();
    return workOrders.filter((wo) => {
      const woName = (wo.client_name ?? "").trim().toLowerCase();
      return woName === name && (wo.status ?? "").toLowerCase() === "completed";
    });
  }, [selectedClientForDetail, workOrders]);

  const workOrdersById = useMemo(() => {
    const map = new Map<string, WorkOrderRow>();
    workOrders.forEach((wo) => map.set(wo.id, wo));
    return map;
  }, [workOrders]);

  // Available half-order work orders for pairing (unscheduled F-250 1/2 orders)
  const availableHalfOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const isHalf = wo.delivery_size_label === "Ford F-250 1/2";
      const isUnpaired = !wo.paired_order_id;
      const isActive = !["completed", "cancelled", "picked_up"].includes((wo.status || "").toLowerCase());
      return isHalf && isUnpaired && isActive;
    });
  }, [workOrders]);

  const driverDeliveries = useMemo(() => {
    if (!session) return [];
    const today = new Date();
    const uname = (session.username ?? "").toLowerCase();
    const displayName = (session.name ?? "").toLowerCase();
    return deliveries
      .filter((d) => (d.event_type ?? "").toLowerCase() === "delivery")
      .filter((d) => {
        try {
          return isSameDay(new Date(d.start_date), today);
        } catch {
          return false;
        }
      })
      .filter((d) => {
        let assigned: string[] = [];
        try {
          const parsed = JSON.parse(d.assigned_user_ids_json ?? "[]");
          if (Array.isArray(parsed)) {
            assigned = parsed
              .map((x) => (typeof x === "string" ? x.toLowerCase() : ""))
              .filter(Boolean);
          }
        } catch {
          assigned = [];
        }
        return assigned.includes(uname) || (displayName && assigned.includes(displayName));
      })
      .map((d) => ({
        delivery: d,
        workOrder: d.work_order_id ? workOrdersById.get(d.work_order_id) : undefined,
      }));
  }, [deliveries, session, workOrdersById]);

  // ===== MAIN RENDER =====
  // See APP_TSX_TOC.md for detailed breakdown of each tab's rendering section

  return (
    <div className="app">
      {session && (
        <header className="header">
          <div className="brand-lockup">
            <div className="brand-mark">
              <img
                src={firewoodIcon}
                alt="Firewood Bank"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            </div>
            <div className="brand-text">
              <h1>Community Firewood Bank</h1>
              <p className="subtitle">Keeping Eachother Warm</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="badge" style={{ alignSelf: "center" }}>
              {now.toLocaleString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            {session && (
              <div className="badge" style={{ alignSelf: "center" }}>
                User: {session.username ?? session.name}
              </div>
            )}
            {session && (
              <button className="ghost" onClick={() => setSession(null)}>
                Sign out
              </button>
            )}
          </div>
        </header>
      )}

      {session ? (
        <>
          <Nav tabs={visibleTabs} activeTab={activeTab} onSelect={setActiveTab} />

          <main
            className="main"
            style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
          >
            <section
              className="card"
              style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
            >
              <h2 style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {activeTab}
                {busy && <span className="badge">Loading…</span>}
              </h2>
              <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
                {activeTab === "Dashboard" && session && (
                  <Dashboard
                    session={session}
                    deliveries={deliveries}
                    inventory={inventory}
                    motdItems={motdItems}
                    users={users}
                    userDeliveryHours={userDeliveryHours}
                    workOrders={workOrders}
                    onCreateScheduleEvent={createScheduleEvent}
                    onWorkerSelect={(user) => {
                      if (
                        session?.role === "admin" ||
                        session?.role === "staff" ||
                        session?.role === "employee" ||
                        session?.role === "lead"
                      ) {
                        openWorkerDetail(user);
                        setActiveTab("Worker Directory");
                      }
                    }}
                    onOpenOrderSelect={(wo) => {
                      openWorkOrderDetail(wo);
                      setActiveTab("Work Orders");
                    }}
                  />
                )}

                {activeTab === "Admin" && session && <AdminPanel session={session} />}

                {activeTab === "Profile" && session && (
                  <div className="stack">
                    <div className="card">
                      <div className="list-head">
                        <h3>Your Profile</h3>
                      </div>
                      <ProfileSummary
                        weekly={profileHourTotals.weekly}
                        monthly={profileHourTotals.monthly}
                        total={profileHourTotals.total}
                      />
                      {profileEditMode ? (
                        <div className="stack">
                          <div>
                            <strong>Name:</strong> {profileUser?.name ?? session.name}
                          </div>
                          <div>
                            <strong>Username:</strong> {session.username}
                          </div>
                          <div>
                            <strong>Role:</strong> {profileUser?.role ?? session.role}
                          </div>
                          <label>
                            Email
                            <input
                              value={profileEdit.email}
                              onChange={(e) =>
                                setProfileEdit({ ...profileEdit, email: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Phone
                            <input
                              value={profileEdit.telephone}
                              onChange={(e) =>
                                setProfileEdit({ ...profileEdit, telephone: e.target.value })
                              }
                              onBlur={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  telephone: normalizePhone(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            Address Line 1
                            <input
                              value={profileEdit.physical_address_line1}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  physical_address_line1: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Address Line 2
                            <input
                              value={profileEdit.physical_address_line2}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  physical_address_line2: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            City
                            <input
                              value={profileEdit.physical_address_city}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  physical_address_city: e.target.value,
                                })
                              }
                              onBlur={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  physical_address_city: initCapCity(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            State
                            <input
                              value={profileEdit.physical_address_state}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  physical_address_state: e.target.value,
                                })
                              }
                              onBlur={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  physical_address_state: normalizeState(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            ZIP
                            <input
                              value={profileEdit.physical_address_postal_code}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  physical_address_postal_code: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={profileEdit.mailing_same_as_physical}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  mailing_same_as_physical: e.target.checked,
                                })
                              }
                            />
                            Mailing same as physical
                          </label>
                          {!profileEdit.mailing_same_as_physical && (
                            <>
                              <label>
                                Mailing Line 1
                                <input
                                  value={profileEdit.mailing_address_line1}
                                  onChange={(e) =>
                                    setProfileEdit({
                                      ...profileEdit,
                                      mailing_address_line1: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Mailing Line 2
                                <input
                                  value={profileEdit.mailing_address_line2}
                                  onChange={(e) =>
                                    setProfileEdit({
                                      ...profileEdit,
                                      mailing_address_line2: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Mailing City
                                <input
                                  value={profileEdit.mailing_address_city}
                                  onChange={(e) =>
                                    setProfileEdit({
                                      ...profileEdit,
                                      mailing_address_city: e.target.value,
                                    })
                                  }
                                  onBlur={(e) =>
                                    setProfileEdit({
                                      ...profileEdit,
                                      mailing_address_city: initCapCity(e.target.value),
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Mailing State
                                <input
                                  value={profileEdit.mailing_address_state}
                                  onChange={(e) =>
                                    setProfileEdit({
                                      ...profileEdit,
                                      mailing_address_state: e.target.value,
                                    })
                                  }
                                  onBlur={(e) =>
                                    setProfileEdit({
                                      ...profileEdit,
                                      mailing_address_state: normalizeState(e.target.value),
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Mailing ZIP
                                <input
                                  value={profileEdit.mailing_address_postal_code}
                                  onChange={(e) =>
                                    setProfileEdit({
                                      ...profileEdit,
                                      mailing_address_postal_code: e.target.value,
                                    })
                                  }
                                />
                              </label>
                            </>
                          )}
                          <label>
                            Availability Notes
                            <input
                              value={profileEdit.availability_notes}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  availability_notes: e.target.value,
                                })
                              }
                            />
                          </label>
                          <div>
                            <strong>Weekly Availability Schedule:</strong>
                            <div
                              style={{
                                display: "flex",
                                gap: "1rem",
                                flexWrap: "wrap",
                                marginTop: "0.5rem",
                              }}
                            >
                              {Object.keys(profileAvailSchedule).map((day) => (
                                <label
                                  key={day}
                                  className="checkbox"
                                  style={{ display: "flex", alignItems: "center" }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={profileAvailSchedule[day]}
                                    onChange={(e) =>
                                      setProfileAvailSchedule({
                                        ...profileAvailSchedule,
                                        [day]: e.target.checked,
                                      })
                                    }
                                  />
                                  <span
                                    style={{ marginLeft: "0.25rem", textTransform: "capitalize" }}
                                  >
                                    {day}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <label>
                            Vehicle
                            <input
                              value={profileEdit.vehicle}
                              onChange={(e) =>
                                setProfileEdit({ ...profileEdit, vehicle: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Driver License Status
                            <input
                              value={profileEdit.driver_license_status}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  driver_license_status: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Driver License Number
                            <input
                              value={profileEdit.driver_license_number}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  driver_license_number: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Driver License Expiration
                            <input
                              type="date"
                              value={profileEdit.driver_license_expires_on}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  driver_license_expires_on: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={profileEdit.is_driver}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  is_driver: e.target.checked,
                                })
                              }
                            />
                            Driver
                          </label>
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={profileEdit.hipaa_certified}
                              onChange={(e) =>
                                setProfileEdit({
                                  ...profileEdit,
                                  hipaa_certified: e.target.checked,
                                })
                              }
                            />
                            HIPAA certified
                          </label>
                        </div>
                      ) : (
                        <div className="stack">
                          <div>
                            <strong>Name:</strong> {profileUser?.name ?? session.name}
                          </div>
                          <div>
                            <strong>Username:</strong> {session.username}
                          </div>
                          <div>
                            <strong>Role:</strong> {profileUser?.role ?? session.role}
                          </div>
                          <div>
                            <strong>Email:</strong> {profileUser?.email ?? session.email ?? "—"}
                          </div>
                          <div>
                            <strong>Phone:</strong> {profileUser?.telephone ?? session.telephone ?? "—"}
                          </div>
                          <div>
                            <strong>Physical Address:</strong>{" "}
                            {profileUser?.physical_address_line1
                              ? `${profileUser.physical_address_line1}${profileUser.physical_address_line2 ? `, ${profileUser.physical_address_line2}` : ""}, ${profileUser.physical_address_city ?? ""}, ${profileUser.physical_address_state ?? ""} ${profileUser.physical_address_postal_code ?? ""}`
                              : "—"}
                          </div>
                          <div>
                            <strong>Mailing Address:</strong>{" "}
                            {profileUser?.mailing_address_line1
                              ? `${profileUser.mailing_address_line1}${profileUser.mailing_address_line2 ? `, ${profileUser.mailing_address_line2}` : ""}, ${profileUser.mailing_address_city ?? ""}, ${profileUser.mailing_address_state ?? ""} ${profileUser.mailing_address_postal_code ?? ""}`
                              : "—"}
                          </div>
                          <div>
                            <strong>Availability Notes:</strong>{" "}
                            {profileUser?.availability_notes ?? "—"}
                          </div>
                          <div>
                            <strong>Availability Schedule:</strong>{" "}
                            {profileUser?.availability_schedule
                              ? (() => {
                                  try {
                                    const parsed = JSON.parse(profileUser.availability_schedule);
                                    const days = Object.keys(parsed).filter((d) => parsed[d]);
                                    return days.length
                                      ? days.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")
                                      : "None set";
                                  } catch {
                                    return "None set";
                                  }
                                })()
                              : "None set"}
                          </div>
                          <div>
                            <strong>Driver License Status:</strong>{" "}
                            {profileUser?.driver_license_status ?? "—"}
                          </div>
                          <div>
                            <strong>Driver License Number:</strong>{" "}
                            {profileUser?.driver_license_number ?? "—"}
                          </div>
                          <div>
                            <strong>Driver License Expiration:</strong>{" "}
                            {profileUser?.driver_license_expires_on
                              ? profileUser.driver_license_expires_on.slice(0, 10)
                              : "—"}
                          </div>
                          <div>
                            <strong>Vehicle:</strong> {profileUser?.vehicle ?? "—"}
                          </div>
                          <div>
                            <strong>Driver:</strong> {profileUser?.is_driver ? "Yes" : "No"}
                          </div>
                          <div>
                            <strong>HIPAA Certified:</strong>{" "}
                            {profileUser?.hipaa_certified ? "Yes" : "No"}
                          </div>
                        </div>
                      )}
                      <div
                        style={{
                          borderTop: "1px solid #eee",
                          marginTop: "1rem",
                          paddingTop: "0.75rem",
                          display: "flex",
                          gap: "0.5rem",
                        }}
                      >
                        {profileEditMode ? (
                          <>
                            <button
                              className="ping"
                              type="button"
                              disabled={busy}
                              onClick={submitProfileChangeRequest}
                            >
                              Submit Change Request
                            </button>
                            <button
                              className="ghost"
                              type="button"
                              onClick={() => setProfileEditMode(false)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="ghost" type="button" onClick={startProfileEdit}>
                              Request Change
                            </button>
                            <button
                              className="ghost"
                              type="button"
                              onClick={() => setShowPasswordModal(true)}
                            >
                              Change Password
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="card">
                      <div className="list-head">
                        <h3>Work Calendar</h3>
                        <div className="muted" style={{ fontSize: "0.85rem" }}>
                          {new Date().toLocaleString(undefined, { month: "long", year: "numeric" })}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: "#e67f1e",
                              display: "inline-block",
                            }}
                          />
                          <span className="muted">Delivering</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: "#2e7d32",
                              display: "inline-block",
                            }}
                          />
                          <span className="muted">Cutting</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: "#1565c0",
                              display: "inline-block",
                            }}
                          />
                          <span className="muted">Splitting</span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(7, 1fr)",
                          gap: "4px",
                          textAlign: "center",
                        }}
                      >
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                          <div
                            key={d}
                            style={{
                              fontWeight: "bold",
                              fontSize: "0.85rem",
                              color: "#666",
                              paddingBottom: "0.5rem",
                            }}
                          >
                            {d}
                          </div>
                        ))}
                        {profileCalendarDays.map((day) => {
                          if (!day.date) return <div key={day.key} style={{ background: "transparent" }} />;
                          const dateKey = `${day.date.getFullYear()}-${String(
                            day.date.getMonth() + 1,
                          ).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
                          const types = profileWorkByDate.get(dateKey);
                          return (
                            <div
                              key={day.key}
                              style={{
                                border: "1px solid #eee",
                                minHeight: "70px",
                                background: "white",
                                padding: "4px",
                                borderRadius: "4px",
                              }}
                            >
                              <div
                                style={{
                                  textAlign: "right",
                                  fontSize: "0.75rem",
                                  color: "#888",
                                  marginBottom: "4px",
                                }}
                              >
                                {day.date.getDate()}
                              </div>
                              {types && types.size > 0 && (
                                <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
                                  {types.has("delivery") && (
                                    <span
                                      title="Delivering"
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "#e67f1e",
                                        display: "inline-block",
                                      }}
                                    />
                                  )}
                                  {types.has("cutting") && (
                                    <span
                                      title="Cutting"
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "#2e7d32",
                                        display: "inline-block",
                                      }}
                                    />
                                  )}
                                  {types.has("splitting") && (
                                    <span
                                      title="Splitting"
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "#1565c0",
                                        display: "inline-block",
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "Clients" && (
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      position: "relative",
                      minHeight: "400px",
                    }}
                  >
                    {/* Left Sidebar - Mailing List */}
                    <div
                      style={{
                        width: mailingListSidebarOpen ? "300px" : "0",
                        overflow: "hidden",
                        transition: "width 0.3s ease",
                        borderRight: mailingListSidebarOpen ? "1px solid #ddd" : "none",
                        paddingRight: mailingListSidebarOpen ? "1rem" : "0",
                      }}
                    >
                      {mailingListSidebarOpen && (() => {
                        // Calculate counts
                        const emailCount = clients.filter(c => !!c.email).length;
                        const newsletterCount = clients.filter(c => !!c.physical_address_line1).length;
                        
                        return (
                        <div className="list-card">
                          <div className="list-head">
                            <h3>Mailing List</h3>
                            <button
                              className="ghost"
                              type="button"
                              onClick={() => setMailingListSidebarOpen(false)}
                              style={{ padding: "0.25rem 0.5rem" }}
                            >
                              ×
                            </button>
                          </div>
                          
                          {/* Filter buttons with icons and counts */}
                          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => setMailingListFilter("all")}
                              style={{
                                padding: "0.4rem 0.75rem",
                                background: mailingListFilter === "all" ? "#e67f1e" : "#f5f5f5",
                                color: mailingListFilter === "all" ? "white" : "#333",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: mailingListFilter === "all" ? "bold" : "normal",
                              }}
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => setMailingListFilter("email")}
                              style={{
                                padding: "0.4rem 0.75rem",
                                background: mailingListFilter === "email" ? "#2196F3" : "#f5f5f5",
                                color: mailingListFilter === "email" ? "white" : "#333",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: mailingListFilter === "email" ? "bold" : "normal",
                              }}
                              title="Email List"
                            >
                              ✉ Email
                            </button>
                            <button
                              type="button"
                              onClick={() => setMailingListFilter("mail")}
                              style={{
                                padding: "0.4rem 0.75rem",
                                background: mailingListFilter === "mail" ? "#4CAF50" : "#f5f5f5",
                                color: mailingListFilter === "mail" ? "white" : "#333",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: mailingListFilter === "mail" ? "bold" : "normal",
                              }}
                              title="Newsletter (Mail)"
                            >
                              📬 Newsletter
                            </button>
                          </div>

                          {/* Count badges */}
                          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
                            <span style={{ 
                              background: "#2196F3", 
                              color: "white", 
                              padding: "0.2rem 0.5rem", 
                              borderRadius: "12px",
                              fontWeight: "bold"
                            }}>
                              ✉ {emailCount} Email
                            </span>
                            <span style={{ 
                              background: "#4CAF50", 
                              color: "white", 
                              padding: "0.2rem 0.5rem", 
                              borderRadius: "12px",
                              fontWeight: "bold"
                            }}>
                              📬 {newsletterCount} Newsletter
                            </span>
                          </div>

                          {canViewClientPII ? (
                            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                              {clients
                                .filter((c) => {
                                  if (mailingListFilter === "all") return true;
                                  const hasEmail = !!c.email;
                                  const hasAddress = !!c.physical_address_line1;
                                  if (mailingListFilter === "mail") return hasAddress;
                                  if (mailingListFilter === "email") return hasEmail;
                                  return true;
                                })
                                .sort((a, b) => {
                                  const dateA = a.date_of_onboarding || a.created_at || "";
                                  const dateB = b.date_of_onboarding || b.created_at || "";
                                  return dateA.localeCompare(dateB);
                                })
                                .map((c) => {
                                  const hasEmail = !!c.email;
                                  const hasNewsletter = !!c.physical_address_line1;
                                  return (
                                    <div 
                                      key={`mailer-${c.id}`}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "0.4rem 0",
                                        borderBottom: "1px solid #eee",
                                        fontSize: "0.9rem",
                                      }}
                                    >
                                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {c.name}
                                      </span>
                                      <span style={{ display: "flex", gap: "0.25rem", marginLeft: "0.5rem" }}>
                                        {hasEmail && (
                                          <span title="Email List" style={{ color: "#2196F3" }}>✉</span>
                                        )}
                                        {hasNewsletter && (
                                          <span title="Newsletter" style={{ color: "#4CAF50" }}>📬</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              {!clients.length && (
                                <div className="muted" style={{ padding: "1rem 0" }}>No mailer entries yet.</div>
                              )}
                            </div>
                          ) : (
                            <p className="muted">
                              PII hidden. Admins and HIPAA-certified leads can view mailer list.
                            </p>
                          )}
                        </div>
                        );
                      })()}
                    </div>

                    {/* Main Content */}
                    <div className="stack" style={{ flex: 1 }}>
                      <div className="card muted">
                        <div className="add-header">
                          <button
                            type="button"
                            className="icon-button"
                            title="Start new client (Onboard)"
                            disabled={!canManage}
                            onClick={() => {
                              if (showClientForm) {
                                resetClientForm();
                              } else {
                                setEditingClientId(null);
                                setClientForm(buildBlankClientForm());
                                setClientError(null);
                                setShowClientForm(true);
                              }
                            }}
                          >
                            +
                          </button>
                          <h3>{editingClientId ? "Edit client" : "New client (Onboard)"}</h3>
                        </div>
                        {!canManage && (
                          <p className="muted">Only leads or admins can add clients.</p>
                        )}
                        {showClientForm ? (
                          <>
                            {clientError && (
                              <div
                                className="pill"
                                style={{ background: "#fbe2e2", color: "#b3261e" }}
                              >
                                {clientError}
                              </div>
                            )}
                            <form
                              className="form-grid"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setClientError(null);
                                setBusy(true);
                                try {
                                  const fullName =
                                    `${clientForm.first_name.trim()} ${clientForm.last_name.trim()}`.trim();
                                  const conflicts = await invokeTauri<ClientConflictRow[]>(
                                    "check_client_conflict",
                                    {
                                    name: fullName,
                                    },
                                  );
                                  const conflictAtOtherAddress = conflicts.some((c) => {
                                    const sameAddress =
                                      c.physical_address_line1.toLowerCase() ===
                                        clientForm.physical_address_line1.toLowerCase() &&
                                      c.physical_address_city.toLowerCase() ===
                                        clientForm.physical_address_city.toLowerCase() &&
                                      c.physical_address_state.toLowerCase() ===
                                        clientForm.physical_address_state.toLowerCase();
                                    return !sameAddress;
                                  });
                                  if (conflictAtOtherAddress) {
                                    setClientError(
                                      "Name already exists at a different address. Confirm this is not a duplicate household member.",
                                    );
                                    setBusy(false);
                                    return;
                                  }

                                  // Determine onboarding date
                                  const onboardingDate = editingClientId
                                    ? clientForm.date_of_onboarding
                                    : new Date().toISOString().slice(0, 10);
                                  const stateCheck = normalizeAndValidateState(
                                    clientForm.physical_address_state,
                                    "State",
                                  );
                                  if (stateCheck.error) {
                                    setClientError(stateCheck.error);
                                    setBusy(false);
                                    return;
                                  }
                                  const postalCheck = normalizeAndValidatePostal(
                                    clientForm.physical_address_postal_code,
                                    "Postal code",
                                  );
                                  if (postalCheck.error) {
                                    setClientError(postalCheck.error);
                                    setBusy(false);
                                    return;
                                  }
                                  const normalizedCity = normalizeCity(
                                    clientForm.physical_address_city,
                                  );
                                  const phoneCheck = normalizeAndValidatePhone(
                                    clientForm.telephone || "",
                                  );
                                  if (phoneCheck.error) {
                                    setClientError(phoneCheck.error);
                                    setBusy(false);
                                    return;
                                  }
                                  // Handle email opt-out: if opted out, don't include email in mailing list
                                  // But still require at least one contact method
                                  const trimmedEmail = clientForm.email.trim();
                                  const finalEmail = clientForm.opt_out_email
                                    ? null
                                    : trimmedEmail || null;
                                  if (!phoneCheck.normalized && !trimmedEmail) {
                                    setClientError(
                                      "Provide at least one contact method (phone or email).",
                                    );
                                    setBusy(false);
                                    return;
                                  }
                                  // Validate mailing address: either checkbox is checked OR full mailing address is provided (without line 2)
                                  if (!clientForm.mailing_same_as_physical) {
                                    if (!clientForm.mailing_address_line1?.trim()) {
                                      setClientError(
                                        "Mailing address line 1 is required if mailing address is different from physical address.",
                                      );
                                      setBusy(false);
                                      return;
                                    }
                                    if (!clientForm.mailing_address_city?.trim()) {
                                      setClientError(
                                        "Mailing city is required if mailing address is different from physical address.",
                                      );
                                      setBusy(false);
                                      return;
                                    }
                                    if (!clientForm.mailing_address_state?.trim()) {
                                      setClientError(
                                        "Mailing state is required if mailing address is different from physical address.",
                                      );
                                      setBusy(false);
                                      return;
                                    }
                                    if (!clientForm.mailing_address_postal_code?.trim()) {
                                      setClientError(
                                        "Mailing postal code is required if mailing address is different from physical address.",
                                      );
                                      setBusy(false);
                                      return;
                                    }
                                    // Validate mailing state
                                    const mailingStateCheck = normalizeAndValidateState(
                                      clientForm.mailing_address_state || "",
                                      "Mailing state",
                                    );
                                    if (mailingStateCheck.error) {
                                      setClientError(mailingStateCheck.error);
                                      setBusy(false);
                                      return;
                                    }
                                    // Validate mailing postal code
                                    const mailingPostalCheck = normalizeAndValidatePostal(
                                      clientForm.mailing_address_postal_code,
                                      "Mailing postal code",
                                    );
                                    if (mailingPostalCheck.error) {
                                      setClientError(mailingPostalCheck.error);
                                      setBusy(false);
                                      return;
                                    }
                                  }
                                  // Date will be auto-generated for new clients
                                  const mailing = clientForm.mailing_same_as_physical
                                    ? {
                                      mailing_address_line1: clientForm.physical_address_line1,
                                        mailing_address_line2:
                                          clientForm.physical_address_line2 || null,
                                      mailing_address_city: normalizedCity,
                                        mailing_address_state: stateCheck.normalized,
                                        mailing_address_postal_code: postalCheck.normalized,
                                    }
                                    : {
                                        mailing_address_line1:
                                          clientForm.mailing_address_line1 || null,
                                        mailing_address_line2:
                                          clientForm.mailing_address_line2 || null,
                                        mailing_address_city: clientForm.mailing_address_city
                                          ? initCapCity(clientForm.mailing_address_city)
                                          : null,
                                        mailing_address_state: clientForm.mailing_address_state
                                          ? normalizeAndValidateState(
                                              clientForm.mailing_address_state,
                                            ).normalized
                                          : null,
                                        mailing_address_postal_code:
                                          clientForm.mailing_address_postal_code
                                            ? normalizeAndValidatePostal(
                                                clientForm.mailing_address_postal_code,
                                              ).normalized
                                            : null,
                                    };

                                  // Default status to "pending" if no referring agency
                                  const defaultStatus = clientForm.referring_agency?.trim()
                                    ? clientForm.approval_status || "pending"
                                    : "pending";

                                  const payload = {
                                    ...clientForm,
                                    // name is computed by backend from first_name + last_name
                                    date_of_onboarding: editingClientId
                                      ? clientForm.date_of_onboarding
                                        ? `${clientForm.date_of_onboarding}T00:00:00`
                                        : null
                                      : `${onboardingDate}T00:00:00`,
                                    physical_address_line2:
                                      clientForm.physical_address_line2 || null,
                                    physical_address_city: normalizedCity,
                                    physical_address_state: stateCheck.normalized,
                                    physical_address_postal_code: postalCheck.normalized,
                                    telephone: phoneCheck.normalized || null,
                                    email: finalEmail, // null if opted out, otherwise the email
                                    opt_out_email: clientForm.opt_out_email || false,
                                    // Emergency contact
                                    emergency_contact_name: clientForm.emergency_contact_name?.trim() || null,
                                    emergency_contact_phone: clientForm.emergency_contact_phone?.trim() || null,
                                    emergency_contact_relationship: clientForm.emergency_contact_relationship?.trim() || null,
                                    // Household information
                                    household_size: clientForm.household_size ? parseInt(clientForm.household_size as any) || null : null,
                                    household_income_range: clientForm.household_income_range?.trim() || null,
                                    household_composition: clientForm.household_composition?.trim() || null,
                                    // Delivery preferences
                                    preferred_delivery_times: clientForm.preferred_delivery_times?.trim() || null,
                                    delivery_restrictions: clientForm.delivery_restrictions?.trim() || null,
                                    preferred_driver_id: clientForm.preferred_driver_id?.trim() || null,
                                    seasonal_delivery_pattern: clientForm.seasonal_delivery_pattern?.trim() || null,
                                    gate_combo: clientForm.gate_combo || null,
                                    notes: clientForm.notes || null,
                                    how_did_they_hear_about_us:
                                      clientForm.how_did_they_hear_about_us || null,
                                    referring_agency: clientForm.referring_agency || null,
                                    approval_status: defaultStatus || "pending",
                                    approval_expires_on: clientForm.approval_expires_on
                                      ? `${clientForm.approval_expires_on}T00:00:00`
                                      : null,
                                    last_reapproval_date: clientForm.last_reapproval_date
                                      ? `${clientForm.last_reapproval_date}T00:00:00`
                                      : null,
                                    requires_reapproval: clientForm.requires_reapproval || false,
                                    denial_reason: clientForm.denial_reason || null,
                                    wood_size_label: clientForm.wood_size_label || null,
                                    wood_size_other: clientForm.wood_size_other || null,
                                    directions: clientForm.directions || null,
                                    created_by_user_id: null,
                                    ...mailing,
                                  };

                                  if (editingClientId) {
                                    await invokeTauri("update_client", {
                                      input: {
                                        ...payload,
                                        id: editingClientId,
                                      },
                                      role: session?.role ?? null,
                                      actor: session?.username ?? null,
                                    });
                                  } else {
                                    await invokeTauri("create_client", { input: payload });
                                  }
                                  await loadClients();
                                  resetClientForm();
                                  setShowClientForm(false);
                                  setEditingClientId(null);
                                } catch (error) {
                                  const errorMessage =
                                    error instanceof Error
                                    ? error.message
                                      : typeof error === "string"
                                      ? error
                                      : "Failed to save client. Please try again.";
                                  setClientError(errorMessage);
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              {editingClientId && (
                                <>
                                  <label>
                                    Onboarding date
                                    <input
                                      type="date"
                                      value={clientForm.date_of_onboarding}
                                      onChange={(e) =>
                                        setClientForm({
                                          ...clientForm,
                                          date_of_onboarding: e.target.value,
                                        })
                                      }
                                      disabled={!canManage}
                                    />
                                  </label>
                                  {!canManage && (
                                    <div className="muted">
                                      Only leads/admins can change onboarding date.
                                    </div>
                                  )}
                                </>
                              )}
                              {/* Row 1: First | Last | telephone | email */}
                              {/* Tab order: columns 1-2 first, then 3-4 */}
                              <label>
                                First
                                <input
                                  required
                                  tabIndex={1}
                                  value={clientForm.first_name}
                                  onChange={(e) =>
                                    setClientForm({ ...clientForm, first_name: e.target.value })
                                  }
                                />
                              </label>
                              <label>
                                Last
                                <input
                                  required
                                  tabIndex={2}
                                  value={clientForm.last_name}
                                  onChange={(e) =>
                                    setClientForm({ ...clientForm, last_name: e.target.value })
                                  }
                                />
                              </label>
                              <label>
                                Telephone
                                <input
                                  tabIndex={11}
                                  value={clientForm.telephone}
                                  onChange={(e) =>
                                    setClientForm({ ...clientForm, telephone: e.target.value })
                                  }
                                  onBlur={(e) =>
                                    setClientForm((prev) => ({
                                      ...prev,
                                      telephone: normalizePhone(e.target.value),
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Email
                                <input
                                  type="email"
                                  tabIndex={12}
                                  value={clientForm.email}
                                  onChange={(e) =>
                                    setClientForm({ ...clientForm, email: e.target.value })
                                  }
                                />
                              </label>
                              {/* Row 2: ADDRESS LINE 1 & 2 */}
                              <label className="span-2">
                                Address Line 1
                                <input
                                  required
                                  tabIndex={3}
                                  value={clientForm.physical_address_line1}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      physical_address_line1: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="span-2">
                                Address Line 2
                                <input
                                  tabIndex={4}
                                  value={clientForm.physical_address_line2}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      physical_address_line2: e.target.value,
                                    })
                                  }
                                />
                              </label>

                              {/* Row 3: City, State, Zip, Check */}
                              <label>
                                City
                                <input
                                  required
                                  tabIndex={5}
                                  value={clientForm.physical_address_city}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      physical_address_city: e.target.value,
                                    })
                                  }
                                  onBlur={(e) =>
                                    setClientForm((prev) => ({
                                      ...prev,
                                      physical_address_city: initCapCity(e.target.value),
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                State
                                <input
                                  required
                                  tabIndex={6}
                                  value={clientForm.physical_address_state}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      physical_address_state: e.target.value,
                                    })
                                  }
                                  onBlur={(e) =>
                                    setClientForm((prev) => ({
                                      ...prev,
                                      physical_address_state: normalizeState(e.target.value),
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                ZIP
                                <input
                                  required
                                  tabIndex={7}
                                  value={clientForm.physical_address_postal_code}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      physical_address_postal_code: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="checkbox">
                                <input
                                  type="checkbox"
                                  tabIndex={8}
                                  checked={clientForm.mailing_same_as_physical}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      mailing_same_as_physical: e.target.checked,
                                    })
                                  }
                                />
                                Mailing The Same
                              </label>

                              {/* Row 4: How Did You Hear, Gate Combo */}
                              <label className="span-2">
                                How Did You Hear *
                                <input
                                  required
                                  tabIndex={9}
                                  value={clientForm.how_did_they_hear_about_us}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      how_did_they_hear_about_us: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="span-2">
                                Gate Combo
                                <input
                                  tabIndex={10}
                                  value={clientForm.gate_combo}
                                  onChange={(e) =>
                                    setClientForm({ ...clientForm, gate_combo: e.target.value })
                                  }
                                />
                              </label>

                              {/* Row 5: Notes */}
                              <label className="span-4" style={{ gridColumn: "1 / -1" }}>
                                Notes
                                <textarea
                                  tabIndex={11}
                                  value={clientForm.notes}
                                  onChange={(e) =>
                                    setClientForm({ ...clientForm, notes: e.target.value })
                                  }
                                  rows={4}
                                />
                              </label>

                              {!clientForm.mailing_same_as_physical && (
                                <>
                                  <label className="span-2">
                                    Mailing Line 1
                                    <input
                                      required
                                      tabIndex={12}
                                      value={clientForm.mailing_address_line1}
                                      onChange={(e) =>
                                        setClientForm({
                                          ...clientForm,
                                          mailing_address_line1: e.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="span-2">
                                    Mailing Line 2
                                    <input
                                      tabIndex={13}
                                      value={clientForm.mailing_address_line2}
                                      onChange={(e) =>
                                        setClientForm({
                                          ...clientForm,
                                          mailing_address_line2: e.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  <label>
                                    Mailing City
                                    <input
                                      required
                                      tabIndex={14}
                                      value={clientForm.mailing_address_city}
                                      onChange={(e) =>
                                        setClientForm({
                                          ...clientForm,
                                          mailing_address_city: e.target.value,
                                        })
                                      }
                                      onBlur={(e) =>
                                        setClientForm((prev) => ({
                                          ...prev,
                                          mailing_address_city: initCapCity(e.target.value),
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    Mailing State
                                    <input
                                      required
                                      tabIndex={15}
                                      value={clientForm.mailing_address_state}
                                      onChange={(e) =>
                                        setClientForm({
                                          ...clientForm,
                                          mailing_address_state: e.target.value,
                                        })
                                      }
                                      onBlur={(e) =>
                                        setClientForm((prev) => ({
                                          ...prev,
                                          mailing_address_state: normalizeState(e.target.value),
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    Mailing Postal
                                    <input
                                      required
                                      tabIndex={16}
                                      value={clientForm.mailing_address_postal_code}
                                      onChange={(e) =>
                                        setClientForm({
                                          ...clientForm,
                                          mailing_address_postal_code: e.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                </>
                              )}
                              {/* Wood size and gate combo under notes */}
                              <label>
                                Wood Size *
                                <select
                                  required
                                  tabIndex={18}
                                  value={clientForm.wood_size_label}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      wood_size_label: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">Select size</option>
                                  <option value="12">12 in</option>
                                  <option value="14">14 in</option>
                                  <option value="16">16 in</option>
                                  <option value="other">Other</option>
                                </select>
                              </label>
                              {clientForm.wood_size_label === "other" && (
                                <label>
                                  Wood Size (Other, Inches)
                                  <input
                                    type="number"
                                    min="1"
                                    tabIndex={19}
                                    value={clientForm.wood_size_other}
                                    onChange={(e) =>
                                      setClientForm({
                                        ...clientForm,
                                        wood_size_other: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                              )}
                              {/* Directions (spans all 4 columns, 2 rows) - above divider */}
                              <label style={{ gridColumn: "1 / -1", gridRow: "span 2" }}>
                                Directions
                                <textarea
                                  tabIndex={21}
                                  value={clientForm.directions}
                                  onChange={(e) =>
                                    setClientForm({ ...clientForm, directions: e.target.value })
                                  }
                                  rows={4}
                                  placeholder="Directions to the client's location"
                                />
                              </label>
                              {/* DIVIDER (spans all 4) */}
                              <div
                                style={{
                                  gridColumn: "1 / -1",
                                  borderTop: "1px solid #ddd",
                                  margin: "1rem 0",
                                }}
                              ></div>
                              {/* Below divider: Agency, Acceptance (Approval Status), and Reason info */}
                              <label className="span-2">
                                Referring Agency
                                <input
                                  tabIndex={22}
                                  value={clientForm.referring_agency}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      referring_agency: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Approval Status
                                <select
                                  tabIndex={23}
                                  value={clientForm.approval_status}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      approval_status: e.target.value,
                                    })
                                  }
                                >
                                  <option value="approved">approved</option>
                                  <option value="exception">exception</option>
                                  <option value="pending">pending approval</option>
                                  <option value="volunteer">volunteer</option>
                                  <option value="denied">denied</option>
                                </select>
                              </label>
                              <label>
                                Approval Expires On
                                <input
                                  type="date"
                                  tabIndex={24}
                                  value={clientForm.approval_expires_on}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      approval_expires_on: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="checkbox span-2">
                                <input
                                  type="checkbox"
                                  checked={clientForm.requires_reapproval}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      requires_reapproval: e.target.checked,
                                    })
                                  }
                                />
                                Requires Re-Approval
                              </label>
                              <label>
                                Last Re-Approval Date
                                <input
                                  type="date"
                                  tabIndex={25}
                                  value={clientForm.last_reapproval_date}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      last_reapproval_date: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Reason Qualified Or Not
                                <textarea
                                  tabIndex={26}
                                  value={clientForm.denial_reason || ""}
                                  onChange={(e) =>
                                    setClientForm({ ...clientForm, denial_reason: e.target.value })
                                  }
                                  rows={2}
                                  placeholder={
                                    clientForm.approval_status === "denied"
                                      ? "Denial reason"
                                      : "Qualification notes"
                                  }
                                />
                              </label>
                              <label className="checkbox span-2">
                                <input
                                  type="checkbox"
                                  checked={clientForm.opt_out_email}
                                  onChange={(e) =>
                                    setClientForm({
                                      ...clientForm,
                                      opt_out_email: e.target.checked,
                                    })
                                  }
                                />
                                Opt out of email mailing list (client will still be on mail list)
                              </label>
                              
                              {/* Additional Information Section */}
                              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #ddd", marginTop: "1rem", paddingTop: "1rem" }}>
                                <h4 style={{ marginBottom: "0.75rem" }}>Additional Information (Optional)</h4>
                                
                                {/* Emergency Contact */}
                                <div style={{ marginBottom: "1rem" }}>
                                  <h5 style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "#666" }}>Emergency Contact</h5>
                                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                                    <label>
                                      Name
                                      <input
                                        value={clientForm.emergency_contact_name}
                                        onChange={(e) =>
                                          setClientForm({ ...clientForm, emergency_contact_name: e.target.value })
                                        }
                                      />
                                    </label>
                                    <label>
                                      Phone
                                      <input
                                        value={clientForm.emergency_contact_phone}
                                        onChange={(e) =>
                                          setClientForm({ ...clientForm, emergency_contact_phone: e.target.value })
                                        }
                                        onBlur={(e) =>
                                          setClientForm((prev) => ({
                                            ...prev,
                                            emergency_contact_phone: normalizePhone(e.target.value),
                                          }))
                                        }
                                      />
                                    </label>
                                    <label>
                                      Relationship
                                      <input
                                        value={clientForm.emergency_contact_relationship}
                                        onChange={(e) =>
                                          setClientForm({ ...clientForm, emergency_contact_relationship: e.target.value })
                                        }
                                        placeholder="e.g., Spouse, Parent"
                                      />
                                    </label>
                                  </div>
                                </div>

                                {/* Household Information */}
                                <div style={{ marginBottom: "1rem" }}>
                                  <h5 style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "#666" }}>Household Information</h5>
                                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                                    <label>
                                      Household Size
                                      <input
                                        type="number"
                                        min="1"
                                        value={clientForm.household_size}
                                        onChange={(e) =>
                                          setClientForm({ ...clientForm, household_size: e.target.value })
                                        }
                                      />
                                    </label>
                                    <label>
                                      Income Range
                                      <select
                                        value={clientForm.household_income_range}
                                        onChange={(e) =>
                                          setClientForm({ ...clientForm, household_income_range: e.target.value })
                                        }
                                      >
                                        <option value="">Select range</option>
                                        <option value="under_25k">Under $25,000</option>
                                        <option value="25k_50k">$25,000 - $50,000</option>
                                        <option value="50k_75k">$50,000 - $75,000</option>
                                        <option value="75k_100k">$75,000 - $100,000</option>
                                        <option value="over_100k">Over $100,000</option>
                                      </select>
                                    </label>
                                    <label className="span-2">
                                      Household Composition
                                      <input
                                        value={clientForm.household_composition}
                                        onChange={(e) =>
                                          setClientForm({ ...clientForm, household_composition: e.target.value })
                                        }
                                        placeholder="e.g., 2 adults, 1 child"
                                      />
                                    </label>
                                  </div>
                                </div>

                                {/* Delivery Preferences */}
                                <div style={{ marginBottom: "1rem" }}>
                                  <h5 style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "#666" }}>Delivery Preferences</h5>
                                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                                    <label>
                                      Preferred Delivery Times
                                      <input
                                        value={clientForm.preferred_delivery_times}
                                        onChange={(e) =>
                                          setClientForm({ ...clientForm, preferred_delivery_times: e.target.value })
                                        }
                                        placeholder="e.g., Weekday mornings"
                                      />
                                    </label>
                                    <label>
                                      Seasonal Pattern
                                      <select
                                        value={clientForm.seasonal_delivery_pattern}
                                        onChange={(e) =>
                                          setClientForm({ ...clientForm, seasonal_delivery_pattern: e.target.value })
                                        }
                                      >
                                        <option value="">Select pattern</option>
                                        <option value="winter_only">Winter Only</option>
                                        <option value="year_round">Year Round</option>
                                        <option value="summer_only">Summer Only</option>
                                      </select>
                                    </label>
                                  <label>
                                    Preferred Driver
                                    <select
                                      value={clientForm.preferred_driver_id}
                                      onChange={(e) =>
                                        setClientForm({ ...clientForm, preferred_driver_id: e.target.value })
                                      }
                                    >
                                      <option value="">Any</option>
                                      {users
                                        .filter((u) => !!u.is_driver)
                                        .map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.name}
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                    <label className="span-2">
                                      Delivery Restrictions
                                      <textarea
                                        value={clientForm.delivery_restrictions}
                                        onChange={(e) =>
                                          setClientForm({ ...clientForm, delivery_restrictions: e.target.value })
                                        }
                                        rows={2}
                                        placeholder="Any restrictions or special instructions for delivery"
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>

                              <div className="actions span-2">
                                <button
                                  className="ping"
                                  type="submit"
                                  disabled={busy || !canManage}
                                >
                                  Save client
                                </button>
                                <button
                                  className="ghost"
                                  type="button"
                                  onClick={() => resetClientForm()}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </>
                        ) : (
                          <p className="muted">Press + to add a new client.</p>
                        )}
                      </div>

                      {session?.isDriver && (
                        <div className="list-card">
                          <div className="list-head">
                            <h3>My deliveries</h3>
                            <button
                              className="ghost"
                              onClick={() => {
                                loadDeliveries();
                                loadWorkOrders();
                              }}
                              disabled={busy}
                            >
                              Refresh
                            </button>
                          </div>
                          {(() => {
                            const mine = deliveries.filter((d) => {
                              try {
                                const arr = JSON.parse(d.assigned_user_ids_json ?? "[]");
                                if (Array.isArray(arr)) {
                                  return arr.some((a) =>
                                    typeof a === "string"
                                      ? a.toLowerCase() === (session.username ?? "").toLowerCase()
                                      : false,
                                  );
                                }
                              } catch {
                                return false;
                              }
                              return false;
                            });
                            return (
                              <div className="table">
                                <div className="table-head">
                                  <span>Title</span>
                                  <span>When</span>
                                  <span>Work order</span>
                                  <span>Type</span>
                                </div>
                                {mine.map((d) => (
                                  <div className="table-row" key={d.id}>
                                    <div>
                                      <strong>{d.title}</strong>
                                    </div>
                                    <div>{d.start_date}</div>
                                    <div className="muted">{d.work_order_id ?? "—"}</div>
                                    <div className="pill">{d.event_type}</div>
                                  </div>
                                ))}
                                {!mine.length && (
                                  <div className="table-row">No assigned deliveries.</div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="list-card">
                        <div className="list-head">
                          <h3>Clients ({filteredClients.length})</h3>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <input
                              placeholder="Search name, phone, email, address"
                              value={showAdvancedSearch ? advancedSearchFilters.search_term : clientSearch}
                              onChange={(e) => {
                                if (showAdvancedSearch) {
                                  setAdvancedSearchFilters({ ...advancedSearchFilters, search_term: e.target.value });
                                } else {
                                  setClientSearch(e.target.value);
                                }
                              }}
                              style={{ minWidth: 200 }}
                            />
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => {
                                setShowAdvancedSearch(!showAdvancedSearch);
                                if (!showAdvancedSearch) {
                                  setAdvancedSearchFilters({ ...advancedSearchFilters, search_term: clientSearch });
                                }
                              }}
                              style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                            >
                              {showAdvancedSearch ? "Simple" : "Advanced"} Search
                            </button>
                            {showAdvancedSearch && (
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => {
                                  setAdvancedSearchFilters({
                                    search_term: "",
                                    approval_status: "",
                                    referring_agency: "",
                                    date_from: "",
                                    date_to: "",
                                    has_email: undefined,
                                    has_phone: undefined,
                                  });
                                  setClientSearch("");
                                  loadClients();
                                }}
                                style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                              >
                                Clear
                              </button>
                            )}
                            <label className="muted">
                              Rows
                              <select
                                value={clientPageSize}
                                onChange={(e) => {
                                  setClientPageSize(Number(e.target.value));
                                  setClientPage(1);
                                }}
                                style={{ marginLeft: 6 }}
                              >
                                {[25, 50, 100].map((size) => (
                                  <option key={size} value={size}>
                                    {size}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              className="ghost"
                              type="button"
                            onClick={() => setClientPage((p: number) => Math.max(1, p - 1))}
                              disabled={clientPage <= 1}
                            >
                              Prev
                            </button>
                            <span className="muted">
                              Page {clientPage} of {clientPageCount}
                            </span>
                            <button
                              className="ghost"
                              type="button"
                              onClick={() =>
                                setClientPage((p: number) => Math.min(clientPageCount, p + 1))
                              }
                              disabled={clientPage >= clientPageCount}
                            >
                              Next
                            </button>
                            <button className="ghost" onClick={loadClients} disabled={busy}>
                              Refresh
                            </button>
                          </div>
                        </div>
                        {showAdvancedSearch && (
                          <div
                            className="card muted"
                            style={{ marginBottom: "0.75rem", padding: "0.75rem 1rem" }}
                          >
                            <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                              <label>
                                Approval Status
                                <select
                                  value={advancedSearchFilters.approval_status}
                                  onChange={(e) =>
                                    setAdvancedSearchFilters({
                                      ...advancedSearchFilters,
                                      approval_status: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">Any</option>
                                  <option value="approved">Approved</option>
                                  <option value="exception">Exception</option>
                                  <option value="pending">Pending</option>
                                  <option value="volunteer">Volunteer</option>
                                  <option value="denied">Denied</option>
                                </select>
                              </label>
                              <label>
                                Referring Agency
                                <input
                                  value={advancedSearchFilters.referring_agency}
                                  onChange={(e) =>
                                    setAdvancedSearchFilters({
                                      ...advancedSearchFilters,
                                      referring_agency: e.target.value,
                                    })
                                  }
                                  placeholder="Agency name"
                                />
                              </label>
                              <label>
                                Date From
                                <input
                                  type="date"
                                  value={advancedSearchFilters.date_from}
                                  onChange={(e) =>
                                    setAdvancedSearchFilters({
                                      ...advancedSearchFilters,
                                      date_from: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Date To
                                <input
                                  type="date"
                                  value={advancedSearchFilters.date_to}
                                  onChange={(e) =>
                                    setAdvancedSearchFilters({
                                      ...advancedSearchFilters,
                                      date_to: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Has Email
                                <select
                                  value={
                                    advancedSearchFilters.has_email === undefined
                                      ? "any"
                                      : advancedSearchFilters.has_email
                                        ? "yes"
                                        : "no"
                                  }
                                  onChange={(e) =>
                                    setAdvancedSearchFilters({
                                      ...advancedSearchFilters,
                                      has_email:
                                        e.target.value === "any"
                                          ? undefined
                                          : e.target.value === "yes",
                                    })
                                  }
                                >
                                  <option value="any">Any</option>
                                  <option value="yes">Yes</option>
                                  <option value="no">No</option>
                                </select>
                              </label>
                              <label>
                                Has Phone
                                <select
                                  value={
                                    advancedSearchFilters.has_phone === undefined
                                      ? "any"
                                      : advancedSearchFilters.has_phone
                                        ? "yes"
                                        : "no"
                                  }
                                  onChange={(e) =>
                                    setAdvancedSearchFilters({
                                      ...advancedSearchFilters,
                                      has_phone:
                                        e.target.value === "any"
                                          ? undefined
                                          : e.target.value === "yes",
                                    })
                                  }
                                >
                                  <option value="any">Any</option>
                                  <option value="yes">Yes</option>
                                  <option value="no">No</option>
                                </select>
                              </label>
                            </div>
                            <div style={{ marginTop: "0.5rem", display: "flex", gap: 8 }}>
                              <button className="ghost" type="button" onClick={loadClients} disabled={busy}>
                                Apply Filters
                              </button>
                              <span className="muted" style={{ alignSelf: "center" }}>
                                Advanced search runs on the server.
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="table">
                          <div className="table-head client-grid">
                            <span
                              style={{ cursor: "pointer", userSelect: "none" }}
                              onClick={() => {
                                if (clientSortField === "first_name") {
                                  setClientSortDirection(
                                    clientSortDirection === "asc" ? "desc" : "asc",
                                  );
                                } else {
                                  setClientSortField("first_name");
                                  setClientSortDirection("asc");
                                }
                              }}
                            >
                              First{" "}
                              {clientSortField === "first_name" &&
                                (clientSortDirection === "asc" ? "↑" : "↓")}
                            </span>
                            <span
                              style={{ cursor: "pointer", userSelect: "none" }}
                              onClick={() => {
                                if (clientSortField === "last_name") {
                                  setClientSortDirection(
                                    clientSortDirection === "asc" ? "desc" : "asc",
                                  );
                                } else {
                                  setClientSortField("last_name");
                                  setClientSortDirection("asc");
                                }
                              }}
                            >
                              Last{" "}
                              {clientSortField === "last_name" &&
                                (clientSortDirection === "asc" ? "↑" : "↓")}
                            </span>
                            <span
                              className="hide-on-mobile"
                              style={{ cursor: "pointer", userSelect: "none" }}
                              onClick={() => {
                                if (clientSortField === "phone") {
                                  setClientSortDirection(
                                    clientSortDirection === "asc" ? "desc" : "asc",
                                  );
                                } else {
                                  setClientSortField("phone");
                                  setClientSortDirection("asc");
                                }
                              }}
                            >
                              Phone{" "}
                              {clientSortField === "phone" &&
                                (clientSortDirection === "asc" ? "↑" : "↓")}
                            </span>
                            <span
                              className="hide-on-mobile"
                              style={{ cursor: "pointer", userSelect: "none" }}
                              onClick={() => {
                                if (clientSortField === "city") {
                                  setClientSortDirection(
                                    clientSortDirection === "asc" ? "desc" : "asc",
                                  );
                                } else {
                                  setClientSortField("city");
                                  setClientSortDirection("asc");
                                }
                              }}
                            >
                              City{" "}
                              {clientSortField === "city" &&
                                (clientSortDirection === "asc" ? "↑" : "↓")}
                            </span>
                            <span
                              className="hide-on-mobile"
                              style={{ cursor: "pointer", userSelect: "none" }}
                              onClick={() => {
                                if (clientSortField === "state") {
                                  setClientSortDirection(
                                    clientSortDirection === "asc" ? "desc" : "asc",
                                  );
                                } else {
                                  setClientSortField("state");
                                  setClientSortDirection("asc");
                                }
                              }}
                            >
                              State{" "}
                              {clientSortField === "state" &&
                                (clientSortDirection === "asc" ? "↑" : "↓")}
                            </span>
                          </div>
                          {pagedClients.map((c) => {
                            const nameParts = c.name.trim().split(" ");
                            const firstName = nameParts[0] || "";
                            const lastName = nameParts.slice(1).join(" ") || "";

                            // Color coding for approval status - light background colors
                            const getStatusColor = (status: string) => {
                              const statusLower = status.toLowerCase();
                              if (statusLower === "approved") return "#d4edda"; // Light green
                              if (statusLower === "exception") return "#fff3cd"; // Light yellow/amber
                              if (statusLower === "pending" || statusLower === "pending approval")
                                return "#d1ecf1"; // Light blue
                              if (statusLower === "volunteer") return "#e2d9f3"; // Light purple
                              if (statusLower === "denied") return "#f8d7da"; // Light red
                              return "#e9ecef"; // Light gray default
                            };

                            const _statusColor = getStatusColor(c.approval_status);

                            return (
                              <div
                                className="table-row client-grid"
                                key={c.id}
                                onClick={() => setSelectedClientId(c.id)}
                                onDoubleClick={() => {
                                  setSelectedClientForDetail(c);
                                  setClientDetailSidebarOpen(true);
                                  // Load related data
                                  loadClientApprovalHistory(c.id);
                                  loadClientCommunications(c.id);
                                  loadClientFeedback(c.id);
                                }}
                                style={{
                                  cursor: "pointer",
                                  backgroundColor:
                                    selectedClientId === c.id ? "#e0e7ff" : undefined,
                                  borderLeft:
                                    selectedClientId === c.id
                                      ? "4px solid #4f46e5"
                                      : "4px solid transparent",
                                }}
                              >
                                <div className="client-cell">
                                  <strong>{firstName}</strong>
                                </div>
                                <div className="client-cell">
                                  <strong>{lastName || "—"}</strong>
                                </div>
                                <div className="client-cell hide-on-mobile">
                                  {canViewClientPII ? (c.telephone ?? "—") : "Hidden"}
                                </div>
                                <div className="client-cell hide-on-mobile">
                                  {canViewClientPII ? c.physical_address_city : "Hidden"}
                                </div>
                                <div className="client-cell hide-on-mobile">
                                  {canViewClientPII ? c.physical_address_state : "Hidden"}
                                </div>
                              </div>
                            );
                          })}
                          {!filteredClients.length && (
                            <div className="table-row">No clients yet.</div>
                          )}
                        </div>
                      </div>

                      {/* Toggle button for mailing list sidebar - Orange rotated tab */}
                      {!mailingListSidebarOpen && (
                        <button
                          type="button"
                          onClick={() => setMailingListSidebarOpen(true)}
                          style={{
                            position: "absolute",
                            left: 0,
                            top: "50%",
                            transform: "translateY(-50%) rotate(-90deg)",
                            transformOrigin: "left center",
                            padding: "0.5rem 1rem",
                            background: "#e67f1e",
                            color: "white",
                            border: "none",
                            borderRadius: "0 0 6px 6px",
                            cursor: "pointer",
                            zIndex: 10,
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            marginLeft: "12px",
                          }}
                          title="Open Mailing List"
                        >
                          Mailing List
                        </button>
                      )}
                    </div>

                    {/* Right Sidebar - Client Detail */}
                    <div
                      style={{
                        width: clientDetailSidebarOpen ? "400px" : "0",
                        overflow: "hidden",
                        transition: "width 0.3s ease",
                        borderLeft: clientDetailSidebarOpen ? "1px solid #ddd" : "none",
                        paddingLeft: clientDetailSidebarOpen ? "1rem" : "0",
                      }}
                    >
                      {clientDetailSidebarOpen && selectedClientForDetail && (() => {
                        // Calculate delivery stats
                        const lastDelivery = deliveredOrdersForClient.length > 0
                          ? deliveredOrdersForClient.sort((a, b) => 
                              (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? "")
                            )[0]
                          : null;
                        const totalCords = deliveredOrdersForClient.reduce((sum, wo) => 
                          sum + (wo.delivery_size_cords ?? 0), 0
                        );
                        
                        return (
                        <div className="card">
                          <div className="list-head">
                            <h3>{selectedClientForDetail.name}</h3>
                            <button
                              className="ghost"
                              type="button"
                              onClick={() => {
                                setClientDetailSidebarOpen(false);
                                setSelectedClientForDetail(null);
                              }}
                              style={{ padding: "0.25rem 0.5rem" }}
                            >
                              ×
                            </button>
                          </div>
                          <div className="stack">
                            {/* Delivery Stats at TOP */}
                            <div style={{ 
                              background: "#fff9f0", 
                              padding: "0.75rem", 
                              borderRadius: "6px",
                              marginBottom: "0.5rem"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                                <strong>Last Delivery:</strong>
                                <span>{lastDelivery ? safeDate(lastDelivery.scheduled_date) : "Never"}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <strong>Total Delivered:</strong>
                                <span style={{ color: "#e67f1e", fontWeight: "bold" }}>
                                  {totalCords.toFixed(1)} cords ({deliveredOrdersForClient.length} orders)
                                </span>
                              </div>
                            </div>

                            {canCreateWorkOrders && (
                              <button
                                className="ghost"
                                style={{
                                  fontSize: "0.8rem",
                                  width: "100%",
                                  textAlign: "left",
                                  justifyContent: "flex-start",
                                }}
                                onClick={() => {
                                  setWorkOrderNewClientEnabled(false);
                                  setWorkOrderForm({
                                    client_id: selectedClientForDetail.id,
                                    scheduled_date: "",
                                    status: "received",
                                    gate_combo: selectedClientForDetail.gate_combo ?? "",
                                    notes: "",
                                    other_heat_source_gas: false,
                                    other_heat_source_electric: false,
                                    other_heat_source_other: "",
                                    mileage: selectedClientForDetail.default_mileage != null
                                      ? String(selectedClientForDetail.default_mileage)
                                      : "",
                                    work_hours: "",
                                    mailingSameAsPhysical: true,
                                    assignees: [],
                                    helpers: [],
                                    delivery_size_choice: "f250",
                                    delivery_size_other: "",
                                    delivery_size_other_cords: "",
                                    pickup_delivery_type: "delivery",
                                    pickup_quantity_mode: "cords",
                                    pickup_quantity_cords: "",
                                    pickup_length: "",
                                    pickup_width: "",
                                    pickup_height: "",
                                    pickup_units: "ft",
                                    paired_order_id: "",
                                  });
                                  setNewWorkOrderId(crypto.randomUUID());
                                  setNewWorkOrderEntryDate(new Date().toISOString());
                                  setShowWorkOrderForm(true);
                                  setActiveTab("Work Orders");
                                  setClientDetailSidebarOpen(false);
                                }}
                              >
                                + New work order for this client
                              </button>
                            )}
                            {selectedClientForDetail.date_of_onboarding && (
                              <div>
                                <strong>Onboarding Date:</strong>{" "}
                                {new Date(
                                  selectedClientForDetail.date_of_onboarding,
                                ).toLocaleDateString()}
                              </div>
                            )}
                            <div>
                              <strong>Approval Status:</strong>{" "}
                              <span className="pill">
                                {selectedClientForDetail.approval_status}
                              </span>
                            </div>
                            {canViewClientPII && (
                              <>
                                <div>
                                  <strong>Email:</strong> {selectedClientForDetail.email ?? "—"}
                                </div>
                                <div>
                                  <strong>Phone:</strong> {selectedClientForDetail.telephone ?? "—"}
                                </div>
                                <div>
                                  <strong>Address:</strong>{" "}
                                  {selectedClientForDetail.physical_address_line1},{" "}
                                  {selectedClientForDetail.physical_address_city},{" "}
                                  {selectedClientForDetail.physical_address_state}{" "}
                                  {selectedClientForDetail.physical_address_postal_code}
                                </div>
                                {selectedClientForDetail.gate_combo && (
                                  <div>
                                    <strong>Gate Combo:</strong>{" "}
                                    {selectedClientForDetail.gate_combo}
                                  </div>
                                )}
                                {selectedClientForDetail.wood_size_label && (
                                  <div>
                                    <strong>Wood Size:</strong>{" "}
                                    {selectedClientForDetail.wood_size_label === "other"
                                      ? selectedClientForDetail.wood_size_other
                                      : selectedClientForDetail.wood_size_label}{" "}
                                    in
                                  </div>
                                )}
                                {selectedClientForDetail.directions && (
                                  <div>
                                    <strong>Directions:</strong>{" "}
                                    <div style={{ marginTop: "0.25rem", whiteSpace: "pre-wrap" }}>
                                      {selectedClientForDetail.directions}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            {selectedClientForDetail.notes && (
                              <div>
                                <strong>Notes:</strong>{" "}
                                <div style={{ marginTop: "0.25rem", whiteSpace: "pre-wrap" }}>
                                  {selectedClientForDetail.notes}
                                </div>
                              </div>
                            )}
                            
                            {/* Additional Information */}
                            {(selectedClientForDetail.emergency_contact_name || 
                              selectedClientForDetail.household_size || 
                              selectedClientForDetail.preferred_delivery_times) && (
                              <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
                                <h4 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Additional Information</h4>
                                {selectedClientForDetail.emergency_contact_name && (
                                  <div style={{ marginBottom: "0.5rem" }}>
                                    <strong>Emergency Contact:</strong> {selectedClientForDetail.emergency_contact_name}
                                    {selectedClientForDetail.emergency_contact_phone && ` - ${selectedClientForDetail.emergency_contact_phone}`}
                                    {selectedClientForDetail.emergency_contact_relationship && ` (${selectedClientForDetail.emergency_contact_relationship})`}
                                  </div>
                                )}
                                {selectedClientForDetail.household_size && (
                                  <div style={{ marginBottom: "0.5rem" }}>
                                    <strong>Household Size:</strong> {selectedClientForDetail.household_size}
                                    {selectedClientForDetail.household_income_range && ` | Income: ${selectedClientForDetail.household_income_range.replace(/_/g, " ")}`}
                                  </div>
                                )}
                                {selectedClientForDetail.preferred_delivery_times && (
                                  <div style={{ marginBottom: "0.5rem" }}>
                                    <strong>Preferred Delivery:</strong> {selectedClientForDetail.preferred_delivery_times}
                                    {selectedClientForDetail.seasonal_delivery_pattern && ` | ${selectedClientForDetail.seasonal_delivery_pattern.replace(/_/g, " ")}`}
                                  </div>
                                )}
                                {selectedClientForDetail.preferred_driver_id && (
                                  <div style={{ marginBottom: "0.5rem" }}>
                                    <strong>Preferred Driver:</strong>{" "}
                                    {users.find((u) => u.id === selectedClientForDetail.preferred_driver_id)?.name ||
                                      "Unknown"}
                                  </div>
                                )}
                                {selectedClientForDetail.delivery_restrictions && (
                                  <div style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
                                    <strong>Restrictions:</strong> {selectedClientForDetail.delivery_restrictions}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Approval History */}
                            {(selectedClientForDetail.approval_date ||
                              selectedClientForDetail.approved_by_user_id ||
                              selectedClientForDetail.approval_expires_on ||
                              selectedClientForDetail.requires_reapproval) && (
                              <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
                                <h4 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Approval Details</h4>
                                {selectedClientForDetail.approval_date && (
                                  <div className="muted" style={{ marginBottom: "0.35rem" }}>
                                    Approved On: {new Date(selectedClientForDetail.approval_date).toLocaleDateString()}
                                  </div>
                                )}
                                {selectedClientForDetail.approved_by_user_id && (
                                  <div className="muted" style={{ marginBottom: "0.35rem" }}>
                                    Approved By: {selectedClientForDetail.approved_by_user_id}
                                  </div>
                                )}
                                {selectedClientForDetail.approval_expires_on && (
                                  <div className="muted" style={{ marginBottom: "0.35rem" }}>
                                    Approval Expires: {new Date(selectedClientForDetail.approval_expires_on).toLocaleDateString()}
                                  </div>
                                )}
                                {selectedClientForDetail.requires_reapproval ? (
                                  <div className="muted">
                                    Requires Re-Approval{selectedClientForDetail.last_reapproval_date
                                      ? ` (last: ${new Date(selectedClientForDetail.last_reapproval_date).toLocaleDateString()})`
                                      : ""}
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {/* Approval History */}
                            {clientApprovalHistory.length > 0 && (
                              <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
                                <h4 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Approval History</h4>
                                <div className="table" style={{ fontSize: "0.85rem" }}>
                                  <div className="table-head">
                                    <span>Date</span>
                                    <span>Status Change</span>
                                    <span>Changed By</span>
                                  </div>
                                  {clientApprovalHistory.slice(0, 5).map((history) => (
                                    <div key={history.id} className="table-row">
                                      <div className="muted">
                                        {new Date(history.created_at).toLocaleDateString()}
                                      </div>
                                      <div>
                                        {history.old_status ? (
                                          <>
                                            <span style={{ textDecoration: "line-through", color: "#b3261e" }}>
                                              {history.old_status}
                                            </span>
                                            {" → "}
                                            <span style={{ fontWeight: "bold", color: "#2d6b3d" }}>
                                              {history.new_status}
                                            </span>
                                          </>
                                        ) : (
                                          <span style={{ fontWeight: "bold" }}>{history.new_status}</span>
                                        )}
                                      </div>
                                      <div className="muted">{history.changed_by_user_id || "System"}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Communications */}
                            <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                <h4 style={{ fontSize: "0.9rem", margin: 0 }}>Communications</h4>
                                {canManage && (
                                  <button
                                    className="ghost"
                                    type="button"
                                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
                                    onClick={() => {
                                      setCommunicationForm({
                                        communication_type: "phone",
                                        direction: "outbound",
                                        subject: "",
                                        message: "",
                                        notes: "",
                                      });
                                      setShowCommunicationForm(true);
                                    }}
                                  >
                                    + Add
                                  </button>
                                )}
                              </div>
                              {clientCommunications.length > 0 ? (
                                <div className="table" style={{ fontSize: "0.85rem" }}>
                                  <div className="table-head">
                                    <span>Date</span>
                                    <span>Type</span>
                                    <span>Direction</span>
                                  </div>
                                  {clientCommunications.slice(0, 5).map((comm) => (
                                    <div key={comm.id} className="table-row" title={comm.subject || comm.notes || ""}>
                                      <div className="muted">
                                        {new Date(comm.created_at).toLocaleDateString()}
                                      </div>
                                      <div>{comm.communication_type}</div>
                                      <div className="muted">{comm.direction}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="muted" style={{ fontSize: "0.85rem" }}>No communications recorded</div>
                              )}
                            </div>

                            {/* Feedback */}
                            <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                <h4 style={{ fontSize: "0.9rem", margin: 0 }}>Feedback</h4>
                                {canManage && (
                                  <button
                                    className="ghost"
                                    type="button"
                                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
                                    onClick={() => {
                                      setFeedbackForm({
                                        feedback_type: "satisfaction",
                                        rating: 5,
                                        comments: "",
                                        work_order_id: "",
                                      });
                                      setShowFeedbackForm(true);
                                    }}
                                  >
                                    + Add
                                  </button>
                                )}
                              </div>
                              {clientFeedback.length > 0 ? (
                                <div className="table" style={{ fontSize: "0.85rem" }}>
                                  <div className="table-head">
                                    <span>Date</span>
                                    <span>Type</span>
                                    <span>Rating</span>
                                    <span>Status</span>
                                  </div>
                                  {clientFeedback.slice(0, 5).map((feedback) => (
                                    <div key={feedback.id} className="table-row" title={feedback.comments || ""}>
                                      <div className="muted">
                                        {new Date(feedback.created_at).toLocaleDateString()}
                                      </div>
                                      <div>{feedback.feedback_type}</div>
                                      <div>
                                        {feedback.rating ? "⭐".repeat(feedback.rating) : "—"}
                                      </div>
                                      <div>
                                        {feedback.responded_to ? (
                                          <span style={{ color: "#2d6b3d" }}>Responded</span>
                                        ) : (
                                          <span style={{ color: "#e67f1e" }}>Pending</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="muted" style={{ fontSize: "0.85rem" }}>No feedback recorded</div>
                              )}
                            </div>

                            <div style={{ marginTop: "0.75rem" }}>
                              <strong>Delivered Work Orders</strong>
                              {deliveredOrdersForClient.length ? (
                                <div className="table" style={{ marginTop: "0.5rem" }}>
                                  <div className="table-head">
                                    <span>Date</span>
                                    <span>Size</span>
                                    <span>Mileage</span>
                          </div>
                                  {deliveredOrdersForClient.map((wo) => (
                                    <div className="table-row" key={`delivered-${wo.id}`}>
                                      <div>{safeDate(wo.scheduled_date)}</div>
                                      <div>{wo.delivery_size_label ?? "—"}</div>
                                      <div>{wo.mileage ?? "—"}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="muted" style={{ marginTop: "0.5rem" }}>
                                  No delivered work orders yet.
                                </div>
                              )}
                            </div>

                            {/* Actions at BOTTOM */}
                            <div style={{ 
                              borderTop: "1px solid #eee", 
                              marginTop: "1rem", 
                              paddingTop: "0.75rem" 
                            }}>
                              {canManage && (
                                <div
                                  style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}
                                >
                                  <button
                                    className="ghost"
                                    type="button"
                                    onClick={() => {
                                      const [first, ...rest] =
                                        selectedClientForDetail.name.split(" ");
                                      const last = rest.join(" ");
                                      setEditingClientId(selectedClientForDetail.id);
                                      setClientForm({
                                        first_name: first,
                                        last_name: last,
                                        date_of_onboarding: selectedClientForDetail.date_of_onboarding
                                          ? selectedClientForDetail.date_of_onboarding.slice(0, 10)
                                          : new Date().toISOString().slice(0, 10),
                                        approval_expires_on: selectedClientForDetail.approval_expires_on
                                          ? selectedClientForDetail.approval_expires_on.slice(0, 10)
                                          : "",
                                        last_reapproval_date: selectedClientForDetail.last_reapproval_date
                                          ? selectedClientForDetail.last_reapproval_date.slice(0, 10)
                                          : "",
                                        requires_reapproval:
                                          (selectedClientForDetail.requires_reapproval ?? 0) === 1,
                                        physical_address_line1:
                                          selectedClientForDetail.physical_address_line1,
                                        physical_address_line2:
                                          selectedClientForDetail.physical_address_line2 ?? "",
                                        physical_address_city:
                                          selectedClientForDetail.physical_address_city,
                                        physical_address_state:
                                          selectedClientForDetail.physical_address_state,
                                        physical_address_postal_code:
                                          selectedClientForDetail.physical_address_postal_code,
                                        mailing_same_as_physical:
                                          !selectedClientForDetail.mailing_address_line1,
                                        mailing_address_line1:
                                          selectedClientForDetail.mailing_address_line1 ?? "",
                                        mailing_address_line2:
                                          selectedClientForDetail.mailing_address_line2 ?? "",
                                        mailing_address_city:
                                          selectedClientForDetail.mailing_address_city ?? "",
                                        mailing_address_state:
                                          selectedClientForDetail.mailing_address_state ?? "",
                                        mailing_address_postal_code:
                                          selectedClientForDetail.mailing_address_postal_code ?? "",
                                        telephone: selectedClientForDetail.telephone ?? "",
                                        email: selectedClientForDetail.email ?? "",
                                        opt_out_email: (selectedClientForDetail.opt_out_email ?? 0) === 1,
                                        // Emergency contact
                                        emergency_contact_name: selectedClientForDetail.emergency_contact_name ?? "",
                                        emergency_contact_phone: selectedClientForDetail.emergency_contact_phone ?? "",
                                        emergency_contact_relationship: selectedClientForDetail.emergency_contact_relationship ?? "",
                                        // Household information
                                        household_size: selectedClientForDetail.household_size?.toString() ?? "",
                                        household_income_range: selectedClientForDetail.household_income_range ?? "",
                                        household_composition: selectedClientForDetail.household_composition ?? "",
                                        // Delivery preferences
                                        preferred_delivery_times: selectedClientForDetail.preferred_delivery_times ?? "",
                                        delivery_restrictions: selectedClientForDetail.delivery_restrictions ?? "",
                                        preferred_driver_id: selectedClientForDetail.preferred_driver_id ?? "",
                                        seasonal_delivery_pattern: selectedClientForDetail.seasonal_delivery_pattern ?? "",
                                        how_did_they_hear_about_us:
                                          selectedClientForDetail.how_did_they_hear_about_us ?? "",
                                        referring_agency:
                                          selectedClientForDetail.referring_agency ?? "",
                                        approval_status: selectedClientForDetail.approval_status,
                                        denial_reason: selectedClientForDetail.denial_reason ?? "",
                                        gate_combo: selectedClientForDetail.gate_combo ?? "",
                                        notes: selectedClientForDetail.notes ?? "",
                                        wood_size_label:
                                          selectedClientForDetail.wood_size_label ?? "",
                                        wood_size_other:
                                          selectedClientForDetail.wood_size_other ?? "",
                                        directions: selectedClientForDetail.directions ?? "",
                                      });
                                      setShowClientForm(true);
                                      setClientDetailSidebarOpen(false);
                                    }}
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="ghost"
                                    type="button"
                                    onClick={async () => {
                                      if (
                                        !window.confirm(
                                          `Delete client ${selectedClientForDetail.name}? This marks them deleted.`,
                                        )
                                      )
                                        return;
                                      setBusy(true);
                                      try {
                                        await invokeTauri("delete_client", {
                                          id: selectedClientForDetail.id,
                                        });
                                        await loadClients();
                                        setClientDetailSidebarOpen(false);
                                        setSelectedClientForDetail(null);
                                      } finally {
                                        setBusy(false);
                                      }
                                    }}
                                    style={{
                                      padding: "0.25rem 0.5rem",
                                      fontSize: "0.85rem",
                                      color: "#b3261e",
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                              {session?.role === "admin" && (
                                <button
                                  className="ghost"
                                  style={{
                                    fontSize: "0.8rem",
                                    width: "100%",
                                    textAlign: "left",
                                    justifyContent: "flex-start",
                                  }}
                                  onClick={() => {
                                    setWorkerForm({
                                      name: selectedClientForDetail.name,
                                      email: selectedClientForDetail.email || "",
                                      telephone: selectedClientForDetail.telephone || "",
                                      username: "",
                                      password: "",
                                      physical_address_line1:
                                        selectedClientForDetail.physical_address_line1 || "",
                                      physical_address_line2:
                                        selectedClientForDetail.physical_address_line2 || "",
                                      physical_address_city:
                                        selectedClientForDetail.physical_address_city || "",
                                      physical_address_state:
                                        selectedClientForDetail.physical_address_state || "",
                                      physical_address_postal_code:
                                        selectedClientForDetail.physical_address_postal_code || "",
                                      mailing_same_as_physical:
                                        !selectedClientForDetail.mailing_address_line1,
                                      mailing_address_line1:
                                        selectedClientForDetail.mailing_address_line1 || "",
                                      mailing_address_line2:
                                        selectedClientForDetail.mailing_address_line2 || "",
                                      mailing_address_city:
                                        selectedClientForDetail.mailing_address_city || "",
                                      mailing_address_state:
                                        selectedClientForDetail.mailing_address_state || "",
                                      mailing_address_postal_code:
                                        selectedClientForDetail.mailing_address_postal_code || "",
                                      role: "volunteer",
                                      is_driver: false,
                                    });
                                    setShowWorkerForm(true);
                                    setActiveTab("Worker Directory");
                                    setClientDetailSidebarOpen(false);
                                  }}
                                >
                                  + Create user account from this client
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {activeTab === "Inventory" && (
                  <div className="stack">
                    <div className="card muted">
                      <div className="add-header">
                        <button
                          type="button"
                          className="icon-button"
                          title="Add inventory item"
                          disabled={!canManage}
                          onClick={() => {
                            if (!canManage) {
                              setInventoryError("Only leads or admins can add inventory.");
                              return;
                            }
                            if (showInventoryForm) {
                              resetInventoryForm();
                            } else {
                              setInventoryForm(buildBlankInventoryForm());
                              setShowInventoryForm(true);
                            }
                          }}
                        >
                          +
                        </button>
                        <h3>{editingInventoryId ? "Edit inventory item" : "Add inventory item"}</h3>
                      </div>
                      {!canManage && (
                        <p className="muted">Only leads or admins can add inventory.</p>
                      )}
                      {showInventoryForm ? (
                        <form
                          className="form-grid"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setInventoryError(null);
                            if (!canManage) {
                              setInventoryError("Only leads or admins can add inventory.");
                              return;
                            }
                            const qty = Number(inventoryForm.quantity_on_hand);
                            if (!Number.isFinite(qty) || qty < 0) {
                              setInventoryError("Quantity must be a valid positive number.");
                              return;
                            }
                            const threshold = Number(inventoryForm.reorder_threshold);
                            if (!Number.isFinite(threshold) || threshold < 0) {
                              setInventoryError("Threshold must be a valid positive number.");
                              return;
                            }

                            setBusy(true);
                            try {
                              // Resolve category: use customCategory if "Other" selected or if category is custom
                              const resolvedCategory =
                                inventoryForm.category === "Other"
                                  ? inventoryForm.customCategory || ""
                                  : inventoryForm.category;

                              const payload = {
                                name: inventoryForm.name,
                                category: resolvedCategory,
                                quantity_on_hand: qty,
                                unit: inventoryForm.unit,
                                reorder_threshold: threshold,
                                reorder_amount:
                                  inventoryForm.reorder_amount === null ||
                                  inventoryForm.reorder_amount === undefined
                                    ? null
                                    : Number(inventoryForm.reorder_amount),
                                notes: inventoryForm.notes,
                                created_by_user_id: null,
                              };
                              if (editingInventoryId) {
                                await invokeTauri("update_inventory_item", {
                                  input: {
                                    ...payload,
                                    id: editingInventoryId,
                                  },
                                  role: session?.role ?? null,
                                  actor: session?.username ?? null,
                                });
                              } else {
                                await invokeTauri("create_inventory_item", {
                                  input: payload,
                                  role: session?.role ?? null,
                                  actor: session?.username ?? null,
                                });
                              }
                              await loadInventory();
                              resetInventoryForm();
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {inventoryError && (
                            <div
                              className="pill"
                              style={{
                                gridColumn: "1/-1",
                                background: "#fbe2e2",
                                color: "#b3261e",
                              }}
                            >
                              {inventoryError}
                            </div>
                          )}
                          <label>
                            Name
                            <input
                              required
                              value={inventoryForm.name}
                              onChange={(e) =>
                                setInventoryForm({ ...inventoryForm, name: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Category
                            <select
                              value={
                                INVENTORY_CATEGORIES.includes(
                                  inventoryForm.category as (typeof INVENTORY_CATEGORIES)[number]
                                )
                                  ? inventoryForm.category
                                  : inventoryForm.category
                                    ? "Other"
                                    : ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "Other") {
                                  setInventoryForm({
                                    ...inventoryForm,
                                    category: "Other",
                                    customCategory: "",
                                  });
                                } else {
                                  setInventoryForm({
                                    ...inventoryForm,
                                    category: val,
                                    customCategory: "",
                                  });
                                }
                              }}
                            >
                              <option value="">Select category...</option>
                              {INVENTORY_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </label>
                          {(inventoryForm.category === "Other" ||
                            (!INVENTORY_CATEGORIES.includes(
                              inventoryForm.category as (typeof INVENTORY_CATEGORIES)[number]
                            ) &&
                              inventoryForm.category !== "")) && (
                            <label>
                              Custom Category
                              <input
                                placeholder="Enter new category name"
                                value={inventoryForm.customCategory || inventoryForm.category === "Other" ? inventoryForm.customCategory : inventoryForm.category}
                                onChange={(e) =>
                                  setInventoryForm({
                                    ...inventoryForm,
                                    customCategory: e.target.value,
                                  })
                                }
                              />
                            </label>
                          )}
                          <label>
                            Qty on hand
                            <input
                              type="number"
                              value={inventoryForm.quantity_on_hand}
                              onChange={(e) =>
                                setInventoryForm({
                                  ...inventoryForm,
                                  quantity_on_hand: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            Unit
                            <input
                              value={inventoryForm.unit}
                              onChange={(e) =>
                                setInventoryForm({ ...inventoryForm, unit: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Reorder threshold
                            <input
                              type="number"
                              value={inventoryForm.reorder_threshold}
                              onChange={(e) =>
                                setInventoryForm({
                                  ...inventoryForm,
                                  reorder_threshold: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            Reorder amount
                            <input
                              type="number"
                              value={inventoryForm.reorder_amount}
                              onChange={(e) =>
                                setInventoryForm({
                                  ...inventoryForm,
                                  reorder_amount: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="span-2">
                            Notes
                            <textarea
                              value={inventoryForm.notes}
                              onChange={(e) =>
                                setInventoryForm({ ...inventoryForm, notes: e.target.value })
                              }
                              rows={2}
                            />
                          </label>
                          <div className="actions span-2">
                            <button className="ping" type="submit" disabled={busy || !canManage}>
                              {editingInventoryId ? "Update item" : "Save item"}
                            </button>
                            <button
                              className="ghost"
                              type="button"
                              onClick={() => resetInventoryForm()}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="muted">Press + to add an inventory item.</p>
                      )}
                    </div>
                    <div className="list-card">
                      <div className="list-head">
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <h3>Inventory ({inventory.length})</h3>
                          <div
                            className="pill"
                            style={{ cursor: "pointer" }}
                            onClick={() => setShowNeedsRestock(false)}
                          >
                            {showNeedsRestock ? "All" : "All ✓"}
                          </div>
                          <div
                            className="pill"
                            style={{ cursor: "pointer" }}
                            onClick={() => setShowNeedsRestock(true)}
                          >
                            {showNeedsRestock ? "Needs restock ✓" : "Needs restock"}
                          </div>
                        </div>
                        <button className="ghost" onClick={loadInventory} disabled={busy}>
                          Refresh
                        </button>
                      </div>
                      <div className="table">
                        <div className="table-head">
                          <span>Item</span>
                          <span>Qty</span>
                          <span>Threshold</span>
                          <span>Notes</span>
                          {canManage && <span>Actions</span>}
                        </div>
                        {(() => {
                          const items = showNeedsRestock
                            ? inventory.filter(
                                (item) => item.quantity_on_hand <= item.reorder_threshold,
                              )
                            : inventory;
                          if (!items.length) {
                            return (
                              <div className="table-row">
                                {showNeedsRestock ? "No items need restock." : "No inventory yet."}
                              </div>
                            );
                          }
                          return items.map((item) => {
                            const low = item.quantity_on_hand <= item.reorder_threshold;
                            const orderAmount =
                              item.reorder_amount != null && item.reorder_amount > 0
                                ? item.reorder_amount
                                : Math.max(
                                    item.reorder_threshold * 2 - item.quantity_on_hand,
                                    item.reorder_threshold,
                                  );
                            return (
                              <div className={`table-row ${low ? "warn" : ""}`} key={item.id}>
                                <div>
                                  <strong>{item.name}</strong>
                                  <div className="muted">{item.category ?? "—"}</div>
                                </div>
                                <div>
                                  {item.quantity_on_hand} {item.unit}
                                  {item.reserved_quantity > 0 && (
                                    <div className="muted">
                                      Reserved: {item.reserved_quantity} {item.unit}
                                    </div>
                                  )}
                                </div>
                                <div>{item.reorder_threshold}</div>
                                <div className="muted">
                                  {item.notes ?? "—"}
                                  {low && (
                                    <div>
                                      <em>Auto-order:</em> Recommend ordering {orderAmount}{" "}
                                      {item.unit} to restock.
                                    </div>
                                  )}
                                </div>
                                {canManage && (
                                  <div className="muted" style={{ display: "flex", gap: 8 }}>
                                    <button
                                      className="ghost"
                                      type="button"
                                      onClick={() => {
                                        setEditingInventoryId(item.id);
                                        const existingCat = item.category ?? "";
                                        const isStandardCategory = INVENTORY_CATEGORIES.includes(
                                          existingCat as (typeof INVENTORY_CATEGORIES)[number]
                                        );
                                        setInventoryForm({
                                          name: item.name,
                                          category: isStandardCategory ? existingCat : (existingCat ? "Other" : ""),
                                          customCategory: isStandardCategory ? "" : existingCat,
                                          quantity_on_hand: item.quantity_on_hand,
                                          unit: item.unit,
                                          reorder_threshold: item.reorder_threshold,
                                          reorder_amount: item.reorder_amount ?? 0,
                                          notes: item.notes ?? "",
                                        });
                                        setShowInventoryForm(true);
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="ghost"
                                      type="button"
                                      onClick={async () => {
                                        if (
                                          !window.confirm(
                                            `Delete ${item.name}? This marks it deleted.`,
                                          )
                                        )
                                          return;
                                        setBusy(true);
                                        try {
                                          await invokeTauri("delete_inventory_item", {
                                            id: item.id,
                                          });
                                          await loadInventory();
                                        } finally {
                                          setBusy(false);
                                        }
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "Work Orders" && (
                  <div className="stack">
                    {isDriver && (
                      <div className="card muted">
                        <div className="list-head">
                          <h3>Driver Mode - Today's Deliveries</h3>
                        </div>
                        {!driverDeliveries.length && (
                          <div className="muted">No deliveries assigned for today.</div>
                        )}
                        {driverDeliveries.map(({ delivery, workOrder }) => (
                          <div
                            key={`driver-${delivery.id}`}
                            className="list-card"
                            style={{ marginBottom: 12 }}
                          >
                            <div
                              style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
                            >
                              <div>
                                <strong>{workOrder?.client_name ?? delivery.title}</strong>
                                <div className="muted">
                                  {workOrder?.physical_address_line1 ?? "Address not available"}{" "}
                                  {workOrder?.physical_address_city ?? ""}{" "}
                                  {workOrder?.physical_address_state ?? ""}{" "}
                                  {workOrder?.physical_address_postal_code ?? ""}
                                </div>
                                <div className="muted">Phone: {workOrder?.telephone ?? "—"}</div>
                              </div>
                              <div className="pill">{workOrder?.status ?? "scheduled"}</div>
                            </div>
                            <div
                              style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}
                            >
                              <select
                                value={
                                  progressEdits[workOrder?.id ?? ""]?.status ??
                                  workOrder?.status ??
                                  "in_progress"
                                }
                                onChange={(e) => {
                                  if (!workOrder?.id) return;
                                  setProgressEdits({
                                    ...progressEdits,
                                    [workOrder.id]: {
                                      status: e.target.value,
                                      mileage: progressEdits[workOrder.id]?.mileage ?? "",
                                      hours: progressEdits[workOrder.id]?.hours ?? "",
                                    },
                                  });
                                }}
                              >
                                <option value="in_progress">en route</option>
                                <option value="delivered">delivered</option>
                                <option value="issue">issue</option>
                              </select>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="Mileage"
                                value={
                                  workOrder?.id ? (progressEdits[workOrder.id]?.mileage ?? "") : ""
                                }
                                onChange={(e) => {
                                  if (!workOrder?.id) return;
                                  setProgressEdits({
                                    ...progressEdits,
                                    [workOrder.id]: {
                                      status:
                                        progressEdits[workOrder.id]?.status ?? workOrder.status,
                                      mileage: e.target.value,
                                      hours: progressEdits[workOrder.id]?.hours ?? "",
                                    },
                                  });
                                }}
                                style={{ width: 120 }}
                              />
                              <button
                                className="ping"
                                type="button"
                                disabled={!workOrder?.id || busy}
                                onClick={async () => {
                                  if (!workOrder?.id) return;
                                  const edit = progressEdits[workOrder.id] ?? {
                                    status: "in_progress",
                                    mileage: "",
                                    hours: "",
                                  };
                                  setBusy(true);
                                  try {
                                    await invokeTauri("update_work_order_status", {
                                      input: {
                                        work_order_id: workOrder.id,
                                        status: edit.status,
                                        mileage: edit.mileage === "" ? null : Number(edit.mileage),
                                        is_driver: true,
                                      },
                                      role: session?.role ?? null,
                                      actor: session?.username ?? null,
                                    });
                                    await loadWorkOrders();
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                Update status
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="card muted">
                      <div className="add-header">
                        <button
                          type="button"
                          className="icon-button"
                          title="Schedule work order"
                          disabled={!canCreateWorkOrders}
                          onClick={() => {
                            if (showWorkOrderForm) {
                              setShowWorkOrderForm(false);
                              setWorkOrderError(null);
                            } else {
                              setWorkOrderForm({
                                client_id: "",
                                scheduled_date: formatDateTimeLocal(new Date()),
                                status: "received",
                                gate_combo: "",
                                notes: "",
                                other_heat_source_gas: false,
                                other_heat_source_electric: false,
                                other_heat_source_other: "",
                                mileage: "",
                                work_hours: "",
                                mailingSameAsPhysical: true,
                                assignees: [],
                                helpers: [],
                                delivery_size_choice: "f250",
                                delivery_size_other: "",
                                delivery_size_other_cords: "",
                                pickup_delivery_type: "delivery",
                                pickup_quantity_mode: "cords",
                                pickup_quantity_cords: "",
                                pickup_length: "",
                                pickup_width: "",
                                pickup_height: "",
                                pickup_units: "ft",
                                paired_order_id: "",
                              });
                              setWorkOrderNewClientEnabled(false);
                              setWorkOrderNewClient({
                                first_name: "",
                                last_name: "",
                                date_of_onboarding: new Date().toISOString().slice(0, 10),
                                physical_address_line1: "",
                                physical_address_city: "",
                                physical_address_state: "",
                                physical_address_postal_code: "",
                                telephone: "",
                                email: "",
                                how_did_they_hear_about_us: "",
                                wood_size_label: "",
                                wood_size_other: "",
                              });
                              setWorkOrderError(null);
                              // Generate preview Order ID and entry date
                              setNewWorkOrderId(crypto.randomUUID());
                              setNewWorkOrderEntryDate(new Date().toISOString());
                              setShowWorkOrderForm(true);
                            }
                          }}
                        >
                          +
                        </button>
                        <h3>Schedule work order</h3>
                      </div>
                      {!canCreateWorkOrders && (
                        <p className="muted">Only staff/employee or admins can add work orders.</p>
                      )}
                      {showWorkOrderForm ? (
                        <>
                          {/* Entry Date and Order ID display */}
                          <div
                            style={{
                              display: "flex",
                              gap: "1rem",
                              background: "#f5f5f5",
                              padding: "0.75rem 1rem",
                              borderRadius: "6px",
                              marginBottom: "0.5rem",
                              fontSize: "0.9rem",
                            }}
                          >
                            <div>
                              <strong>Entry Date:</strong>{" "}
                              {new Date(newWorkOrderEntryDate).toLocaleDateString()}{" "}
                              {new Date(newWorkOrderEntryDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div style={{ color: "#666" }}>|</div>
                            <div>
                              <strong>Order ID:</strong>{" "}
                              <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                                {newWorkOrderId.slice(0, 8).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          {workOrderError && (
                            <div
                              className="pill"
                              style={{ background: "#fbe2e2", color: "#b3261e" }}
                            >
                              {workOrderError}
                            </div>
                          )}
                          <form
                            className="stack"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              setWorkOrderError(null);
                              const mileageValue =
                                workOrderForm.mileage === "" ? null : Number(workOrderForm.mileage);
                              if (mileageValue !== null && Number.isNaN(mileageValue)) {
                                setWorkOrderError("Mileage must be a number.");
                                return;
                              }
                              const hoursValue =
                                workOrderForm.work_hours === "" ? null : Number(workOrderForm.work_hours);
                              if (hoursValue !== null && Number.isNaN(hoursValue)) {
                                setWorkOrderError("Work hours must be a number.");
                                return;
                              }
                              const isLeadAdmin =
                                session?.role === "lead" || session?.role === "admin";
                              const statusNeedsDriver = [
                                "scheduled",
                                "in_progress",
                                "completed",
                              ].includes(workOrderForm.status);
                              if (statusNeedsDriver && workOrderForm.assignees.length === 0) {
                                setWorkOrderError(
                                  "Assign at least one available driver for scheduled or in-progress work.",
                                );
                                return;
                              }
                              if (statusNeedsDriver && !workOrderForm.scheduled_date) {
                                setWorkOrderError(
                                  "Pick a scheduled date/time when assigning a driver.",
                                );
                                return;
                              }
                              if (
                                workOrderForm.scheduled_date &&
                                workOrderForm.assignees.length > 0
                              ) {
                                const scheduledDay = (() => {
                                  try {
                                    const d = new Date(workOrderForm.scheduled_date);
                                    return d
                                      .toLocaleDateString("en-US", { weekday: "short" })
                                      .toLowerCase();
                                  } catch {
                                    return "";
                                  }
                                })();
                                if (scheduledDay) {
                                  const unavailable = users
                                    .filter((u) => workOrderForm.assignees.includes(u.name))
                                    .filter((u) => {
                                      const note = (u.availability_notes ?? "").toLowerCase();
                                      const mentionsDay =
                                        note.includes(scheduledDay) ||
                                        note.includes(scheduledDay.replace(".", "")) ||
                                        note.includes("any");
                                      const flaggedUnavailable =
                                        note.includes("unavailable") || note.includes("off");
                                      return flaggedUnavailable && mentionsDay;
                                    })
                                    .map((u) => u.name);
                                  if (unavailable.length) {
                                    setWorkOrderError(
                                      `Selected driver(s) are marked unavailable on that day: ${unavailable.join(", ")}.`,
                                    );
                                    return;
                                  }
                                }
                              }
                              let targetClient =
                                clients.find((c) => c.id === workOrderForm.client_id) || null;
                              if (!targetClient && !workOrderNewClientEnabled) {
                                setWorkOrderError(
                                  "Work orders require a client. Select or create a client first.",
                                );
                                return;
                              }
                              if (workOrderForm.status === "completed" && mileageValue === null) {
                                setWorkOrderError("Mileage is required to close an order.");
                                return;
                              }
                              if (
                                workOrderForm.status === "completed" &&
                                isLeadAdmin &&
                                hoursValue === null
                              ) {
                                setWorkOrderError("Work hours are required to close an order.");
                                return;
                              }
                              // Optional: create a new client inline for this work order.
                              if (!targetClient && workOrderNewClientEnabled) {
                                const nc = workOrderNewClient;
                                if (
                                  !nc.first_name ||
                                  !nc.last_name ||
                                  !nc.date_of_onboarding ||
                                  !nc.physical_address_line1 ||
                                  !nc.physical_address_city ||
                                  !nc.physical_address_state
                                ) {
                                  setWorkOrderError(
                                    "Please fill first/last name, onboarding date, and address for the new client.",
                                  );
                                  return;
                                }
                                const ncStateCheck = normalizeAndValidateState(
                                  nc.physical_address_state,
                                  "New client state",
                                );
                                if (ncStateCheck.error) {
                                  setWorkOrderError(ncStateCheck.error);
                                  return;
                                }
                                const ncPostalCheck = normalizeAndValidatePostal(
                                  nc.physical_address_postal_code,
                                  "New client postal code",
                                  true,
                                );
                                if (ncPostalCheck.error) {
                                  setWorkOrderError(ncPostalCheck.error);
                                  return;
                                }
                                const ncCity = normalizeCity(nc.physical_address_city);
                                const ncPhoneCheck = normalizeAndValidatePhone(nc.telephone || "");
                                if (ncPhoneCheck.error) {
                                  setWorkOrderError(ncPhoneCheck.error);
                                  return;
                                }
                                const ncEmail = nc.email.trim();
                                if (!ncPhoneCheck.normalized && !ncEmail) {
                                  setWorkOrderError(
                                    "Provide at least one contact (phone/email) for the new client.",
                                  );
                                  return;
                                }
                                const ncDate = nc.date_of_onboarding;
                                if (!ncDate) {
                                  setWorkOrderError("New client onboarding date is required.");
                                  return;
                                }
                                const fullName =
                                  `${nc.first_name.trim()} ${nc.last_name.trim()}`.trim();
                                const conflicts = await invokeTauri<ClientConflictRow[]>(
                                  "check_client_conflict",
                                  {
                                  name: fullName,
                                  },
                                );
                                const conflictAtOtherAddress = conflicts.some((c) => {
                                  const sameAddress =
                                    c.physical_address_line1.toLowerCase() ===
                                      nc.physical_address_line1.toLowerCase() &&
                                    c.physical_address_city.toLowerCase() ===
                                      nc.physical_address_city.toLowerCase() &&
                                    c.physical_address_state.toLowerCase() ===
                                      nc.physical_address_state.toLowerCase();
                                  return !sameAddress;
                                });
                                if (conflictAtOtherAddress) {
                                  setWorkOrderError(
                                    "Name already exists at a different address. Verify before creating.",
                                  );
                                  return;
                                }

                                const newClientId = await invokeTauri<string>("create_client", {
                                  input: {
                                    name: fullName,
                                    physical_address_line1: nc.physical_address_line1,
                                    physical_address_line2: null,
                                    physical_address_city: ncCity,
                                    physical_address_state: ncStateCheck.normalized,
                                    physical_address_postal_code: ncPostalCheck.normalized,
                                    date_of_onboarding: `${ncDate}T00:00:00`,
                                    mailing_address_line1: null,
                                    mailing_address_line2: null,
                                    mailing_address_city: null,
                                    mailing_address_state: null,
                                    mailing_address_postal_code: null,
                                    telephone: ncPhoneCheck.normalized || null,
                                    email: ncEmail || null,
                                    how_did_they_hear_about_us: nc.how_did_they_hear_about_us || null,
                                    referring_agency: null,
                                    approval_status: "pending",
                                    denial_reason: null,
                                    gate_combo: null,
                                    notes: null,
                                    wood_size_label: nc.wood_size_label || null,
                                    wood_size_other: nc.wood_size_other || null,
                                    created_by_user_id: null,
                                  },
                                });
                                await loadClients();
                                targetClient = {
                                  id: newClientId,
                                  name: fullName,
                                  email: nc.email || null,
                                  telephone: nc.telephone || null,
                                  approval_status: "pending",
                                  physical_address_line1: nc.physical_address_line1,
                                  physical_address_line2: null,
                                  physical_address_city: nc.physical_address_city,
                                  physical_address_state: nc.physical_address_state,
                                  physical_address_postal_code:
                                    nc.physical_address_postal_code || "",
                                  mailing_address_line1: null,
                                  mailing_address_line2: null,
                                  mailing_address_city: null,
                                  mailing_address_state: null,
                                  mailing_address_postal_code: null,
                                  gate_combo: null,
                                  notes: null,
                                  wood_size_label: nc.wood_size_label || null,
                                  wood_size_other: nc.wood_size_other || null,
                                };
                              }

                              if (!targetClient) {
                                setWorkOrderError(
                                  "Select a client or create a new one for this work order.",
                                );
                                return;
                              }

                              if (!canCreateWorkOrders) {
                                setWorkOrderError("Only staff/employee or admin can create work orders.");
                                return;
                              }

                              const deliveryChoice = workOrderForm.delivery_size_choice;
                              const pickupType = workOrderForm.pickup_delivery_type;
                              let deliverySizeCords: number | null = null;
                              let deliverySizeLabel: string | null = null;
                              if (pickupType === "delivery") {
                                if (deliveryChoice === "f250") {
                                deliverySizeCords = 1;
                                  deliverySizeLabel = "Ford F-250";
                                } else if (deliveryChoice === "f250_half") {
                                  deliverySizeCords = 0.5;
                                  deliverySizeLabel = "Ford F-250 1/2";
                                } else if (deliveryChoice === "toyota") {
                                deliverySizeCords = 0.33;
                                  deliverySizeLabel = "Toyota";
                              } else {
                                  const details = workOrderForm.delivery_size_other.trim();
                                  const cordsRaw = workOrderForm.delivery_size_other_cords.trim();
                                  const cordsParsed = Number(cordsRaw);
                                  if (!details) {
                                    setWorkOrderError("Enter delivery vehicle details for Other.");
                                  return;
                                }
                                  if (!Number.isFinite(cordsParsed) || cordsParsed <= 0) {
                                    setWorkOrderError("Enter a valid cord amount for Other.");
                                    return;
                                  }
                                  deliverySizeCords = cordsParsed;
                                  deliverySizeLabel = details;
                                }
                              }

                              let pickupQuantityCords: number | null = null;
                              let pickupLength: number | null = null;
                              let pickupWidth: number | null = null;
                              let pickupHeight: number | null = null;
                              let pickupUnits: string | null = null;
                              if (workOrderForm.status === "picked_up") {
                                if (workOrderForm.pickup_quantity_mode === "cords") {
                                  const cordsParsed = Number(
                                    workOrderForm.pickup_quantity_cords.trim(),
                                  );
                                  if (!Number.isFinite(cordsParsed) || cordsParsed <= 0) {
                                    setWorkOrderError(
                                      "Enter a valid pickup quantity in cords.",
                                    );
                                    return;
                                  }
                                  pickupQuantityCords = cordsParsed;
                                } else {
                                  const lengthRaw = Number(
                                    workOrderForm.pickup_length.trim(),
                                  );
                                  const widthRaw = Number(
                                    workOrderForm.pickup_width.trim(),
                                  );
                                  const heightRaw = Number(
                                    workOrderForm.pickup_height.trim(),
                                  );
                                  if (
                                    !Number.isFinite(lengthRaw) ||
                                    !Number.isFinite(widthRaw) ||
                                    !Number.isFinite(heightRaw) ||
                                    lengthRaw <= 0 ||
                                    widthRaw <= 0 ||
                                    heightRaw <= 0
                                  ) {
                                    setWorkOrderError(
                                      "Enter valid pickup dimensions.",
                                    );
                                    return;
                                  }
                                  pickupUnits = workOrderForm.pickup_units;
                                  pickupLength = lengthRaw;
                                  pickupWidth = widthRaw;
                                  pickupHeight = heightRaw;
                                  const scale = pickupUnits === "in" ? 1 / 12 : 1;
                                  const lengthFt = lengthRaw * scale;
                                  const widthFt = widthRaw * scale;
                                  const heightFt = heightRaw * scale;
                                  pickupQuantityCords =
                                    (lengthFt * widthFt * heightFt) / 128;
                                }
                              }

                              setBusy(true);
                              try {
                                try {
                                  await invokeTauri("create_work_order", {
                                    input: {
                                      client_id: targetClient.id,
                                      client_name: targetClient.name,
                                      physical_address_line1: targetClient.physical_address_line1,
                                      physical_address_line2: targetClient.physical_address_line2,
                                      physical_address_city: targetClient.physical_address_city,
                                      physical_address_state: targetClient.physical_address_state,
                                      physical_address_postal_code:
                                        targetClient.physical_address_postal_code,
                                      mailing_address_line1: workOrderForm.mailingSameAsPhysical
                                        ? targetClient.physical_address_line1
                                        : targetClient.mailing_address_line1,
                                      mailing_address_line2: workOrderForm.mailingSameAsPhysical
                                        ? targetClient.physical_address_line2
                                        : targetClient.mailing_address_line2,
                                      mailing_address_city: workOrderForm.mailingSameAsPhysical
                                        ? targetClient.physical_address_city
                                        : targetClient.mailing_address_city,
                                      mailing_address_state: workOrderForm.mailingSameAsPhysical
                                        ? targetClient.physical_address_state
                                        : targetClient.mailing_address_state,
                                      mailing_address_postal_code:
                                        workOrderForm.mailingSameAsPhysical
                                        ? targetClient.physical_address_postal_code
                                        : targetClient.mailing_address_postal_code,
                                      telephone: targetClient.telephone,
                                      email: targetClient.email,
                                      directions: targetClient.directions || null,
                                      gate_combo:
                                        workOrderForm.gate_combo || targetClient.gate_combo,
                                      mileage: mileageValue,
                                      work_hours: isLeadAdmin ? hoursValue : null,
                                      other_heat_source_gas: workOrderForm.other_heat_source_gas,
                                      other_heat_source_electric:
                                        workOrderForm.other_heat_source_electric,
                                      other_heat_source_other:
                                        workOrderForm.other_heat_source_other || null,
                                      notes: workOrderForm.notes || null,
                                      scheduled_date: workOrderForm.scheduled_date || null,
                                      status: workOrderForm.status,
                                      wood_size_label: targetClient.wood_size_label || null,
                                      wood_size_other: targetClient.wood_size_other || null,
                                      delivery_size_label: deliverySizeLabel,
                                      delivery_size_cords: deliverySizeCords,
                                      pickup_delivery_type: pickupType,
                                      pickup_quantity_cords: pickupQuantityCords,
                                      pickup_length: pickupLength,
                                      pickup_width: pickupWidth,
                                      pickup_height: pickupHeight,
                                      pickup_units: pickupUnits,
                                      assignees_json: JSON.stringify([
                                        ...workOrderForm.assignees,
                                        ...workOrderForm.helpers
                                          .map((h) => h.trim())
                                          .filter((h) => h.length > 0),
                                      ]),
                                      created_by_user_id: null,
                                      created_by_display:
                                        session?.name ?? session?.username ?? null,
                                      paired_order_id: workOrderForm.paired_order_id || null,
                                    },
                                    role: session?.role ?? null,
                                  });
                                } catch (e: any) {
                                  setWorkOrderError(
                                    typeof e === "string"
                                      ? e
                                      : "Failed to create work order: " + JSON.stringify(e),
                                  );
                                  return;
                                }
                                await loadWorkOrders();
                                setWorkOrderForm({
                                  client_id: "",
                                  scheduled_date: "",
                                  status: "received",
                                  gate_combo: "",
                                  notes: "",
                                  other_heat_source_gas: false,
                                  other_heat_source_electric: false,
                                  other_heat_source_other: "",
                                  mileage: "",
                                  work_hours: "",
                                  mailingSameAsPhysical: true,
                                  assignees: [],
                                  helpers: [],
                                  delivery_size_choice: "f250",
                                  delivery_size_other: "",
                                  delivery_size_other_cords: "",
                                  pickup_delivery_type: "delivery",
                                  pickup_quantity_mode: "cords",
                                  pickup_quantity_cords: "",
                                  pickup_length: "",
                                  pickup_width: "",
                                  pickup_height: "",
                                  pickup_units: "ft",
                                  paired_order_id: "",
                                });
                                setWorkOrderNewClient({
                                  first_name: "",
                                  last_name: "",
                                  date_of_onboarding: new Date().toISOString().slice(0, 10),
                                  physical_address_line1: "",
                                  physical_address_city: "",
                                  physical_address_state: "",
                                  physical_address_postal_code: "",
                                  telephone: "",
                                  email: "",
                                  how_did_they_hear_about_us: "",
                                  wood_size_label: "",
                                  wood_size_other: "",
                                });
                                setShowWorkOrderForm(false);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            <div className="form-grid">
                            <label className="span-2">
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                <span>Client</span>
                                <button
                                  type="button"
                                  className="ghost"
                                    style={{ padding: "0 8px", height: "auto", fontSize: "0.8rem" }}
                                    onClick={() =>
                                      setWorkOrderNewClientEnabled(!workOrderNewClientEnabled)
                                    }
                                >
                                    {workOrderNewClientEnabled
                                      ? "Select Existing"
                                      : "+ Add New Client"}
                                </button>
                              </div>
                              {!workOrderNewClientEnabled ? (
                                <select
                                  required
                                  value={workOrderForm.client_id}
                                    onChange={(e) => {
                                      const selectedClient = clients.find((c) => c.id === e.target.value);
                                      setWorkOrderForm({
                                        ...workOrderForm,
                                        client_id: e.target.value,
                                        // Auto-fill mileage from client's default if available and mileage is empty
                                        mileage: workOrderForm.mileage === "" && selectedClient?.default_mileage != null
                                          ? String(selectedClient.default_mileage)
                                          : workOrderForm.mileage,
                                        gate_combo: selectedClient?.gate_combo ?? workOrderForm.gate_combo,
                                      });
                                    }}
                                >
                                  <option value="">Select client</option>
                                  {clients.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                  <div
                                    className="muted"
                                    style={{ fontSize: "0.9rem", padding: "4px 0" }}
                                  >
                                  Filling out new client form below...
                                </div>
                              )}
                            </label>
                            <label>
                                Type
                                <select
                                  value={workOrderForm.pickup_delivery_type}
                                  onChange={(e) =>
                                    setWorkOrderForm({
                                      ...workOrderForm,
                                      pickup_delivery_type: e.target.value,
                                    })
                                  }
                                >
                                  <option value="delivery">delivery</option>
                                  <option value="pickup">pickup</option>
                                </select>
                              </label>
                              {workOrderForm.pickup_delivery_type === "delivery" && (
                                <>
                                  <label>
                                    Delivery vehicle
                              <select
                                value={workOrderForm.delivery_size_choice}
                                      onChange={(e) =>
                                        setWorkOrderForm({
                                          ...workOrderForm,
                                          delivery_size_choice: e.target.value,
                                        })
                                      }
                              >
                                      <option value="f250">Ford F-250</option>
                                      <option value="f250_half">Ford F-250 1/2</option>
                                      <option value="toyota">Toyota</option>
                                <option value="other">Other</option>
                              </select>
                            </label>
                            {workOrderForm.delivery_size_choice === "other" && (
                                    <>
                              <label>
                                        Delivery vehicle (other)
                                        <input
                                          value={workOrderForm.delivery_size_other}
                                          onChange={(e) =>
                                            setWorkOrderForm({
                                              ...workOrderForm,
                                              delivery_size_other: e.target.value,
                                            })
                                          }
                                        />
                                      </label>
                                      <label>
                                        Cord amount
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                          value={workOrderForm.delivery_size_other_cords}
                                  onChange={(e) =>
                                    setWorkOrderForm({
                                      ...workOrderForm,
                                              delivery_size_other_cords: e.target.value,
                                    })
                                  }
                                />
                              </label>
                                    </>
                                  )}
                            {workOrderForm.delivery_size_choice === "f250_half" && (
                              <div
                                className="card"
                                style={{
                                  gridColumn: "1 / -1",
                                  background: "#fff9f0",
                                  border: "1px dashed #e67f1e",
                                  padding: "0.75rem",
                                }}
                              >
                                <strong style={{ color: "#e67f1e" }}>Half Load Pairing</strong>
                                <p className="muted" style={{ fontSize: "0.85rem", margin: "0.5rem 0" }}>
                                  Half F-250 orders should be scheduled together. Select another half order to pair with,
                                  or leave empty to pair later. Mileage will be entered once for the combined trip.
                                </p>
                                <label>
                                  Pair with existing order
                                  <select
                                    value={workOrderForm.paired_order_id}
                                    onChange={(e) =>
                                      setWorkOrderForm({
                                        ...workOrderForm,
                                        paired_order_id: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="">— No pairing (schedule later) —</option>
                                    {availableHalfOrders
                                      .filter((ho) => ho.client_id !== workOrderForm.client_id)
                                      .map((ho) => (
                                        <option key={ho.id} value={ho.id}>
                                          {ho.client_name} — {ho.physical_address_city || "Unknown city"}{" "}
                                          ({ho.status})
                                        </option>
                                      ))}
                                  </select>
                                </label>
                                {availableHalfOrders.filter((ho) => ho.client_id !== workOrderForm.client_id).length === 0 && (
                                  <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                                    No other unpaired half orders available. This order can be paired later.
                                  </p>
                                )}
                              </div>
                            )}
                                </>
                              )}
                              {workOrderForm.status === "picked_up" && (
                                <div className="span-2" style={{ display: "grid", gap: 12 }}>
                                  <label>
                                    Pickup quantity (method)
                                    <select
                                      value={workOrderForm.pickup_quantity_mode}
                                      onChange={(e) =>
                                        setWorkOrderForm({
                                          ...workOrderForm,
                                          pickup_quantity_mode: e.target.value,
                                        })
                                      }
                                    >
                                      <option value="cords">Cords</option>
                                      <option value="dimensions">Dimensions</option>
                                    </select>
                                  </label>
                                  {workOrderForm.pickup_quantity_mode === "cords" ? (
                                    <label>
                                      Pickup quantity (cords)
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={workOrderForm.pickup_quantity_cords}
                                        onChange={(e) =>
                                          setWorkOrderForm({
                                            ...workOrderForm,
                                            pickup_quantity_cords: e.target.value,
                                          })
                                        }
                                      />
                                    </label>
                                  ) : (
                                    <div className="form-grid">
                                      <label>
                                        Length
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={workOrderForm.pickup_length}
                                          onChange={(e) =>
                                            setWorkOrderForm({
                                              ...workOrderForm,
                                              pickup_length: e.target.value,
                                            })
                                          }
                                        />
                                      </label>
                                      <label>
                                        Width
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={workOrderForm.pickup_width}
                                          onChange={(e) =>
                                            setWorkOrderForm({
                                              ...workOrderForm,
                                              pickup_width: e.target.value,
                                            })
                                          }
                                        />
                                      </label>
                                      <label>
                                        Height
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={workOrderForm.pickup_height}
                                          onChange={(e) =>
                                            setWorkOrderForm({
                                              ...workOrderForm,
                                              pickup_height: e.target.value,
                                            })
                                          }
                                        />
                                      </label>
                                      <label>
                                        Units
                                        <select
                                          value={workOrderForm.pickup_units}
                                          onChange={(e) =>
                                            setWorkOrderForm({
                                              ...workOrderForm,
                                              pickup_units: e.target.value,
                                            })
                                          }
                                        >
                                          <option value="ft">Feet</option>
                                          <option value="in">Inches</option>
                                        </select>
                                      </label>
                                    </div>
                                  )}
                                </div>
                            )}
                            <label className="span-2">
                              Assign driver(s)
                              <select
                                multiple
                                value={workOrderForm.assignees}
                                onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions).map(
                                      (o) => o.value,
                                    );
                                  setWorkOrderForm({ ...workOrderForm, assignees: selected });
                                }}
                              >
                                {users
                                  .filter((u) => !!u.driver_license_status)
                                  .map((u) => (
                                    <option key={u.id} value={u.name}>
                                        {u.name} {u.vehicle ? `• ${u.vehicle}` : ""}{" "}
                                        {u.availability_notes ? `• ${u.availability_notes}` : ""}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <div className="span-2" style={{ display: "grid", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span className="muted">Workers (up to 4)</span>
                                <button
                                  type="button"
                                  className="ghost"
                                  disabled={workOrderForm.helpers.length >= 4}
                                  onClick={() => {
                                    if (workOrderForm.helpers.length >= 4) return;
                                    setWorkOrderForm({
                                      ...workOrderForm,
                                      helpers: [...workOrderForm.helpers, ""],
                                    });
                                  }}
                                >
                                  + Add Worker
                                </button>
                              </div>
                              {workOrderForm.helpers.map((helper, idx) => (
                                <div key={`helper-${idx}`} style={{ display: "flex", gap: 8 }}>
                                  <input
                                    type="text"
                                    placeholder="Worker first and last name"
                                    value={helper}
                                    onChange={(e) => {
                                      const next = [...workOrderForm.helpers];
                                      next[idx] = e.target.value;
                                      setWorkOrderForm({ ...workOrderForm, helpers: next });
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => {
                                      const next = [...workOrderForm.helpers];
                                      next.splice(idx, 1);
                                      setWorkOrderForm({ ...workOrderForm, helpers: next });
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                            {/* New Client Checkbox removed in favor of button toggle, but state still used for conditional rendering */}
                            {workOrderNewClientEnabled && (
                              <>
                                <label>
                                  First name
                                  <input
                                    required
                                    value={workOrderNewClient.first_name}
                                    onChange={(e) =>
                                      setWorkOrderNewClient((prev) => ({
                                        ...prev,
                                        first_name: e.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <label>
                                  Last name
                                  <input
                                    required
                                    value={workOrderNewClient.last_name}
                                    onChange={(e) =>
                                      setWorkOrderNewClient((prev) => ({
                                        ...prev,
                                        last_name: e.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <label>
                                  Onboarding date
                                  <input
                                    type="date"
                                    required
                                    value={workOrderNewClient.date_of_onboarding}
                                    onChange={(e) =>
                                      setWorkOrderNewClient({
                                        ...workOrderNewClient,
                                        date_of_onboarding: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Address line 1
                                  <input
                                    required
                                    value={workOrderNewClient.physical_address_line1}
                                    onChange={(e) =>
                                        setWorkOrderNewClient({
                                          ...workOrderNewClient,
                                          physical_address_line1: e.target.value,
                                        })
                                    }
                                  />
                                </label>
                                <label>
                                  City
                                  <input
                                    required
                                    value={workOrderNewClient.physical_address_city}
                                    onChange={(e) =>
                                        setWorkOrderNewClient({
                                          ...workOrderNewClient,
                                          physical_address_city: e.target.value,
                                        })
                                      }
                                      onBlur={(e) =>
                                        setWorkOrderNewClient((prev) => ({
                                          ...prev,
                                          physical_address_city: initCapCity(e.target.value),
                                        }))
                                    }
                                  />
                                </label>
                                <label>
                                  State
                                  <input
                                    required
                                    value={workOrderNewClient.physical_address_state}
                                    onChange={(e) =>
                                        setWorkOrderNewClient({
                                          ...workOrderNewClient,
                                          physical_address_state: e.target.value,
                                        })
                                      }
                                      onBlur={(e) =>
                                        setWorkOrderNewClient((prev) => ({
                                          ...prev,
                                          physical_address_state: normalizeState(e.target.value),
                                        }))
                                    }
                                  />
                                </label>
                                <label>
                                  Postal code *
                                  <input
                                    required
                                    value={workOrderNewClient.physical_address_postal_code}
                                    onChange={(e) =>
                                      setWorkOrderNewClient({
                                        ...workOrderNewClient,
                                        physical_address_postal_code: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  How Did You Hear *
                                  <input
                                    required
                                    value={workOrderNewClient.how_did_they_hear_about_us}
                                    onChange={(e) =>
                                      setWorkOrderNewClient({
                                        ...workOrderNewClient,
                                        how_did_they_hear_about_us: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Wood Size *
                                  <select
                                    required
                                    value={workOrderNewClient.wood_size_label}
                                    onChange={(e) =>
                                      setWorkOrderNewClient({
                                        ...workOrderNewClient,
                                        wood_size_label: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Select size</option>
                                    <option value="12">12 in</option>
                                    <option value="14">14 in</option>
                                    <option value="16">16 in</option>
                                    <option value="other">Other</option>
                                  </select>
                                </label>
                                {workOrderNewClient.wood_size_label === "other" && (
                                  <label>
                                    Wood Size (Other, Inches)
                                    <input
                                      type="number"
                                      min="1"
                                      required
                                      value={workOrderNewClient.wood_size_other}
                                      onChange={(e) =>
                                        setWorkOrderNewClient({
                                          ...workOrderNewClient,
                                          wood_size_other: e.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                )}
                                <label>
                                  Telephone
                                  <input
                                    value={workOrderNewClient.telephone}
                                    onChange={(e) =>
                                        setWorkOrderNewClient({
                                          ...workOrderNewClient,
                                          telephone: e.target.value,
                                        })
                                      }
                                      onBlur={(e) =>
                                        setWorkOrderNewClient((prev) => ({
                                          ...prev,
                                          telephone: normalizePhone(e.target.value),
                                        }))
                                    }
                                  />
                                </label>
                                <label>
                                  Email
                                  <input
                                    type="email"
                                    value={workOrderNewClient.email}
                                    onChange={(e) =>
                                        setWorkOrderNewClient({
                                          ...workOrderNewClient,
                                          email: e.target.value,
                                        })
                                    }
                                  />
                                </label>
                              </>
                            )}
                            </div>

                            <hr
                              style={{
                                borderTop: "1px solid #e6d8c8",
                                borderBottom: 0,
                                margin: "20px 0",
                                opacity: 0.6,
                              }}
                            />

                            <div className="form-grid">
                            <label>
                              Scheduled date/time
                              <input
                                type="datetime-local"
                                value={workOrderForm.scheduled_date}
                                  onChange={(e) =>
                                    setWorkOrderForm({
                                      ...workOrderForm,
                                      scheduled_date: e.target.value,
                                    })
                                  }
                                disabled={isStaffLike}
                              />
                            </label>
                            <label>
                              Status
                              <select
                                value={workOrderForm.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                    setWorkOrderForm({ ...workOrderForm, status: newStatus });
                                }}
                              >
                                <option value="received">received</option>
                                <option value="scheduled">scheduled</option>
                                <option value="rescheduled">rescheduled</option>
                                  <option value="picked_up">picked_up</option>
                                <option value="completed">completed</option>
                                <option value="cancelled">canceled</option>
                              </select>
                            </label>
                            <label>
                              Mileage (required if status = completed)
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={workOrderForm.mileage}
                                  onChange={(e) =>
                                    setWorkOrderForm({ ...workOrderForm, mileage: e.target.value })
                                  }
                              />
                            </label>
                            {(session?.role === "lead" || session?.role === "admin") && (
                              <label>
                                Work Hours (required if status = completed)
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={workOrderForm.work_hours}
                                  onChange={(e) =>
                                    setWorkOrderForm({
                                      ...workOrderForm,
                                      work_hours: e.target.value,
                                    })
                                  }
                                />
                              </label>
                            )}
                            <label>
                              Gate combo
                              <input
                                value={workOrderForm.gate_combo}
                                  onChange={(e) =>
                                    setWorkOrderForm({
                                      ...workOrderForm,
                                      gate_combo: e.target.value,
                                    })
                                  }
                              />
                            </label>
                            <label className="checkbox">
                              <input
                                type="checkbox"
                                checked={workOrderForm.mailingSameAsPhysical}
                                onChange={(e) =>
                                    setWorkOrderForm({
                                      ...workOrderForm,
                                      mailingSameAsPhysical: e.target.checked,
                                    })
                                }
                              />
                              Mailing same as physical
                            </label>
                            <label>
                              Notes
                              <textarea
                                rows={2}
                                value={workOrderForm.notes}
                                  onChange={(e) =>
                                    setWorkOrderForm({ ...workOrderForm, notes: e.target.value })
                                  }
                              />
                            </label>
                            <div className="span-2">
                              <label className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={workOrderForm.other_heat_source_gas}
                                  onChange={(e) =>
                                      setWorkOrderForm({
                                        ...workOrderForm,
                                        other_heat_source_gas: e.target.checked,
                                      })
                                  }
                                />
                                Other heat source: Gas
                              </label>
                              <label className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={workOrderForm.other_heat_source_electric}
                                  onChange={(e) =>
                                    setWorkOrderForm({
                                      ...workOrderForm,
                                      other_heat_source_electric: e.target.checked,
                                    })
                                  }
                                />
                                Other heat source: Electric
                              </label>
                              <input
                                placeholder="Other heat source detail"
                                value={workOrderForm.other_heat_source_other}
                                onChange={(e) =>
                                    setWorkOrderForm({
                                      ...workOrderForm,
                                      other_heat_source_other: e.target.value,
                                    })
                                }
                              />
                            </div>
                            <div className="actions span-2">
                              <button
                                className="ping"
                                type="submit"
                                disabled={
                                  busy ||
                                  !canCreateWorkOrders ||
                                  (!workOrderNewClientEnabled && !workOrderForm.client_id) ||
                                  (workOrderForm.status === "scheduled" &&
                                    // Required fields check for scheduled status
                                    ((!workOrderNewClientEnabled && !workOrderForm.client_id) || // Existing client
                                      (workOrderNewClientEnabled &&
                                        (!workOrderNewClient.first_name ||
                                      !workOrderNewClient.last_name ||
                                      !workOrderNewClient.telephone ||
                                      !workOrderNewClient.physical_address_line1 ||
                                      !workOrderNewClient.physical_address_city ||
                                          !workOrderNewClient.physical_address_state)) || // New Client fields
                                      !workOrderForm.scheduled_date)) || // Date scheduled
                                  (workOrderForm.pickup_delivery_type === "delivery" &&
                                    workOrderForm.delivery_size_choice === "other" &&
                                    (!workOrderForm.delivery_size_other ||
                                      !workOrderForm.delivery_size_other_cords)) ||
                                  (workOrderForm.status === "picked_up" &&
                                    ((workOrderForm.pickup_quantity_mode === "cords" &&
                                      !workOrderForm.pickup_quantity_cords) ||
                                      (workOrderForm.pickup_quantity_mode === "dimensions" &&
                                        (!workOrderForm.pickup_length ||
                                          !workOrderForm.pickup_width ||
                                          !workOrderForm.pickup_height))))
                                }
                              >
                                Save work order
                              </button>
                              <button
                                className="ghost"
                                type="button"
                                onClick={() => {
                                  setShowWorkOrderForm(false);
                                  setWorkOrderError(null);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                            </div>
                          </form>
                        </>
                      ) : (
                        <p className="muted">Press + to schedule a work order.</p>
                      )}
                    </div>

                    <div className="list-card">
                      <div className="list-head">
                        <h3>Work orders ({visibleWorkOrders.length})</h3>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <label className="muted">
                            Rows
                            <select
                              value={workOrdersPageSize}
                              onChange={(e) => {
                                setWorkOrdersPageSize(Number(e.target.value));
                                setWorkOrdersPage(1);
                              }}
                              style={{ marginLeft: 6 }}
                            >
                              {[25, 50, 100].map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="ghost"
                            type="button"
                            onClick={() =>
                              setWorkOrdersPage((p: number) => Math.max(1, p - 1))
                            }
                            disabled={workOrdersPage <= 1}
                          >
                            Prev
                          </button>
                          <span className="muted">
                            Page {workOrdersPage} of {workOrdersPageCount}
                          </span>
                          <button
                            className="ghost"
                            type="button"
                            onClick={() =>
                              setWorkOrdersPage((p: number) => Math.min(workOrdersPageCount, p + 1))
                            }
                            disabled={workOrdersPage >= workOrdersPageCount}
                          >
                            Next
                          </button>
                          <button className="ghost" onClick={loadWorkOrders} disabled={busy}>
                            Refresh
                          </button>
                        </div>
                      </div>
                      <WorkOrdersTable
                        workOrders={pagedWorkOrders}
                        session={session}
                        isDriver={isDriver}
                        canViewPII={canViewPII}
                        selectedWorkOrderId={selectedWorkOrderId}
                        onSelect={setSelectedWorkOrderId}
                        onOpenDetail={openWorkOrderDetail}
                        progressEdits={progressEdits}
                        setProgressEdits={setProgressEdits}
                        busy={busy}
                        setBusy={setBusy}
                        setWorkOrderError={setWorkOrderError}
                        loadWorkOrders={loadWorkOrders}
                      />
                    </div>
                  </div>
                )}

                {/* Work Order Detail Modal */}
                {workOrderDetailOpen && selectedWorkOrder && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1000,
                    }}
                    onClick={closeWorkOrderDetail}
                  >
                    <div
                      className="card"
                      style={{
                        minWidth: "500px",
                        maxWidth: "700px",
                        maxHeight: "80vh",
                        overflow: "auto",
                        backgroundColor: "white",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="list-head" style={{ marginBottom: "1rem" }}>
                        <h3>Work Order Details</h3>
                        <button
                          className="ghost"
                          type="button"
                          onClick={closeWorkOrderDetail}
                          style={{ padding: "0.25rem 0.5rem" }}
                        >
                          ×
                        </button>
                      </div>

                      <div className="stack" style={{ gap: "0.75rem" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: "1.1rem" }}>
                              {selectedWorkOrder.client_name}
                            </strong>
                            <div className="muted" style={{ fontSize: "0.85rem" }}>
                              Order ID: {selectedWorkOrder.id.slice(0, 8).toUpperCase()}
                            </div>
                          </div>
                          <span
                            className="pill"
                            style={{
                              background:
                                selectedWorkOrder.status === "completed"
                                  ? "#c8e6c9"
                                  : selectedWorkOrder.status === "cancelled"
                                    ? "#ffcdd2"
                                    : selectedWorkOrder.status === "scheduled"
                                      ? "#bbdefb"
                                      : "#fff3e0",
                            }}
                          >
                            {selectedWorkOrder.status}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.75rem",
                          }}
                        >
                          <div>
                            <strong>Type:</strong>{" "}
                            {selectedWorkOrder.pickup_delivery_type ?? "delivery"}
                          </div>
                          <div>
                            <strong>Scheduled:</strong>{" "}
                            {selectedWorkOrder.scheduled_date
                              ? new Date(selectedWorkOrder.scheduled_date).toLocaleString()
                              : "Not scheduled"}
                          </div>
                          {selectedWorkOrder.delivery_size_label && (
                            <div>
                              <strong>Delivery Size:</strong>{" "}
                              {selectedWorkOrder.delivery_size_label}
                              {selectedWorkOrder.delivery_size_cords != null &&
                                ` (${selectedWorkOrder.delivery_size_cords} cords)`}
                            </div>
                          )}
                          {selectedWorkOrder.pickup_quantity_cords != null && (
                            <div>
                              <strong>Pickup Quantity:</strong>{" "}
                              {selectedWorkOrder.pickup_quantity_cords.toFixed(2)} cords
                            </div>
                          )}
                          {selectedWorkOrder.mileage != null && (
                            <div>
                              <strong>Mileage:</strong> {selectedWorkOrder.mileage} miles
                            </div>
                          )}
                          {selectedWorkOrder.work_hours != null && (
                            <div>
                              <strong>Work Hours:</strong> {selectedWorkOrder.work_hours}
                            </div>
                          )}
                          {selectedWorkOrder.created_at && (
                            <div>
                              <strong>Created:</strong>{" "}
                              {new Date(selectedWorkOrder.created_at).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {(isAdmin || isLead || isStaffLike) && (
                          <>
                            <hr style={{ border: "none", borderTop: "1px solid #eee" }} />
                            <div>
                              <strong>Address:</strong>
                              <div style={{ marginTop: "0.25rem" }}>
                                {selectedWorkOrder.physical_address_line1 ?? "—"}
                                <br />
                                {selectedWorkOrder.physical_address_city ?? ""},{" "}
                                {selectedWorkOrder.physical_address_state ?? ""}{" "}
                                {selectedWorkOrder.physical_address_postal_code ?? ""}
                              </div>
                            </div>
                            {selectedWorkOrder.telephone && (
                              <div>
                                <strong>Phone:</strong> {selectedWorkOrder.telephone}
                              </div>
                            )}
                            {selectedWorkOrder.gate_combo && (
                              <div>
                                <strong>Gate Combo:</strong> {selectedWorkOrder.gate_combo}
                              </div>
                            )}
                            {selectedWorkOrder.wood_size_label && (
                              <div>
                                <strong>Wood Size:</strong>{" "}
                                {selectedWorkOrder.wood_size_label === "other"
                                  ? selectedWorkOrder.wood_size_other
                                  : selectedWorkOrder.wood_size_label}{" "}
                                in
                              </div>
                            )}
                            {selectedWorkOrder.notes && (
                              <div>
                                <strong>Notes:</strong>
                                <div
                                  style={{
                                    marginTop: "0.25rem",
                                    whiteSpace: "pre-wrap",
                                    background: "#f9f9f9",
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {selectedWorkOrder.notes}
                                </div>
                              </div>
                            )}
                            {selectedWorkOrder.assignees_json && (
                              <div>
                                <strong>Assigned:</strong>{" "}
                                {(() => {
                                  try {
                                    const arr = JSON.parse(selectedWorkOrder.assignees_json);
                                    return Array.isArray(arr) ? arr.join(", ") : "—";
                                  } catch {
                                    return "—";
                                  }
                                })()}
                              </div>
                            )}
                            {selectedWorkOrder.created_by_display && (
                              <div>
                                <strong>Created by:</strong> {selectedWorkOrder.created_by_display}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {(isAdmin || isLead || isStaffLike) && workOrderDetailEdit && (
                          <>
                            <hr style={{ border: "none", borderTop: "1px solid #eee" }} />
                            <div className="stack" style={{ gap: "0.75rem" }}>
                              <strong>Scheduling & assignments</strong>
                              <label>
                                Scheduled date
                                <input
                                  type="datetime-local"
                                  value={workOrderDetailEdit.scheduled_date}
                                  onChange={(e) =>
                                    setWorkOrderDetailEdit((prev) =>
                                      prev
                                        ? { ...prev, scheduled_date: e.target.value }
                                        : prev,
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Assign driver(s)
                                <select
                                  multiple
                                  value={workOrderDetailEdit.assignees}
                                  onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions).map(
                                      (o) => o.value,
                                    );
                                    setWorkOrderDetailEdit((prev) =>
                                      prev ? { ...prev, assignees: selected } : prev,
                                    );
                                  }}
                                >
                                  {users
                                    .filter((u) => !!u.driver_license_status)
                                    .map((u) => (
                                      <option key={u.id} value={u.name}>
                                        {u.name} {u.vehicle ? `• ${u.vehicle}` : ""}{" "}
                                        {u.availability_notes ? `• ${u.availability_notes}` : ""}
                                      </option>
                                    ))}
                                </select>
                              </label>
                              <div style={{ display: "grid", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span className="muted">Workers (up to 4)</span>
                                  <button
                                    type="button"
                                    className="ghost"
                                    disabled={workOrderDetailEdit.helpers.length >= 4}
                                    onClick={() => {
                                      if (workOrderDetailEdit.helpers.length >= 4) return;
                                      setWorkOrderDetailEdit((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              helpers: [...prev.helpers, ""],
                                            }
                                          : prev,
                                      );
                                    }}
                                  >
                                    + Add Worker
                                  </button>
                                </div>
                                {workOrderDetailEdit.helpers.map((helper, idx) => (
                                  <div key={`detail-helper-${idx}`} style={{ display: "flex", gap: 8 }}>
                                    <input
                                      type="text"
                                      placeholder="Worker first and last name"
                                      value={helper}
                                      onChange={(e) => {
                                        setWorkOrderDetailEdit((prev) => {
                                          if (!prev) return prev;
                                          const next = [...prev.helpers];
                                          next[idx] = e.target.value;
                                          return { ...prev, helpers: next };
                                        });
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="ghost"
                                      onClick={() => {
                                        setWorkOrderDetailEdit((prev) => {
                                          if (!prev) return prev;
                                          const next = [...prev.helpers];
                                          next.splice(idx, 1);
                                          return { ...prev, helpers: next };
                                        });
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {workOrderDetailError && (
                                <div style={{ color: "#b91c1c" }}>{workOrderDetailError}</div>
                              )}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <button
                                  className="ping"
                                  type="button"
                                  disabled={busy}
                                  onClick={async () => {
                                    if (!workOrderDetailEdit) return;
                                    setWorkOrderDetailError(null);
                                    if (
                                      workOrderDetailEdit.scheduled_date &&
                                      workOrderDetailEdit.assignees.length === 0
                                    ) {
                                      setWorkOrderDetailError(
                                        "Assign at least one driver before scheduling.",
                                      );
                                      return;
                                    }
                                    const helperNames = workOrderDetailEdit.helpers
                                      .map((h) => h.trim())
                                      .filter((h) => h.length > 0);
                                    const combinedAssignees = [
                                      ...workOrderDetailEdit.assignees,
                                      ...helperNames,
                                    ];
                                    setBusy(true);
                                    try {
                                      await invokeTauri("update_work_order_assignees", {
                                        input: {
                                          work_order_id: selectedWorkOrder.id,
                                          assignees_json: JSON.stringify(combinedAssignees),
                                        },
                                        role: session?.role ?? null,
                                        actor: session?.username ?? null,
                                      });
                                      await invokeTauri("update_work_order_schedule", {
                                        input: {
                                          work_order_id: selectedWorkOrder.id,
                                          scheduled_date:
                                            workOrderDetailEdit.scheduled_date || null,
                                        },
                                        role: session?.role ?? null,
                                        actor: session?.username ?? null,
                                      });
                                      await Promise.all([loadWorkOrders(), loadDeliveries()]);
                                      setSelectedWorkOrder((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              assignees_json: JSON.stringify(combinedAssignees),
                                              scheduled_date:
                                                workOrderDetailEdit.scheduled_date || null,
                                              status: workOrderDetailEdit.scheduled_date
                                                ? "scheduled"
                                                : prev.status,
                                            }
                                          : prev,
                                      );
                                    } catch (e: any) {
                                      setWorkOrderDetailError(
                                        typeof e === "string"
                                          ? e
                                          : "Failed to update work order.",
                                      );
                                    } finally {
                                      setBusy(false);
                                    }
                                  }}
                                >
                                  Save assignments/schedule
                                </button>
                              </div>
                            </div>
                          </>
                        )}

                      <div
                        style={{
                          marginTop: "1.5rem",
                          display: "flex",
                          gap: "0.5rem",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          className="ghost"
                          type="button"
                          onClick={closeWorkOrderDetail}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "Metrics" && (
                  <ComprehensiveMetrics
                    clients={clients}
                    workOrders={workOrders}
                    deliveries={deliveries}
                    inventory={inventory}
                    users={users}
                    expenses={expenses}
                    donations={donations}
                  />
                )}

                {activeTab === "Finance" &&
                  session &&
                  (session.role === "admin" || session.role === "lead") && (
                  <FinancialDashboard
                    session={session}
                    expenses={expenses}
                    donations={donations}
                    timeEntries={timeEntries}
                    budgetCategories={budgetCategories}
                    users={users}
                    workOrders={workOrders}
                    onRefreshExpenses={loadExpenses}
                    onRefreshDonations={loadDonations}
                    onRefreshTimeEntries={loadTimeEntries}
                    busy={busy}
                    setBusy={setBusy}
                  />
                )}

                {activeTab === "Worker Directory" &&
                  session &&
                  (session.role === "admin" || session.role === "lead") && (
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      position: "relative",
                      minHeight: "400px",
                    }}
                  >
                    <div className="stack" style={{ flex: 1, minWidth: 0 }}>
                      <div className="list-card">
                        <div
                          className="list-head"
                          style={{
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              width: "100%",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <h3>Workers & Drivers ({users.length})</h3>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button className="ghost" onClick={loadUsers} disabled={busy}>
                                Refresh
                              </button>
                            </div>
                          </div>

                        {/* Inline Worker Form */}
                        {canManage && (
                            <div
                              className="card muted"
                              style={{ width: "100%", marginTop: "0.5rem", padding: "1rem" }}
                            >
                            <div className="add-header" style={{ marginBottom: "1rem" }}>
                              <button
                                type="button"
                                className="icon-button"
                                title={showWorkerForm ? "Cancel Adding Worker" : "Add Worker"}
                                onClick={() => {
                                  if (showWorkerForm) {
                                    setShowWorkerForm(false);
                                    setWorkerFormError(null);
                                  } else {
                                    setWorkerForm({
                                      name: "",
                                      email: "",
                                      telephone: "",
                                        username: "",
                                        password: "",
                                        physical_address_line1: "",
                                        physical_address_line2: "",
                                        physical_address_city: "",
                                        physical_address_state: "",
                                        physical_address_postal_code: "",
                                      mailing_same_as_physical: true,
                                        mailing_address_line1: "",
                                        mailing_address_line2: "",
                                        mailing_address_city: "",
                                        mailing_address_state: "",
                                        mailing_address_postal_code: "",
                                      role: "volunteer",
                                      is_driver: false,
                                    });
                                    setWorkerFormError(null);
                                    setShowWorkerForm(true);
                                  }
                                }}
                              >
                                {showWorkerForm ? "×" : "+"}
                              </button>
                              <h3>{showWorkerForm ? "Add New Worker" : "Add Worker"}</h3>
                            </div>

                            {showWorkerForm && (
                              <form
                                className="form-grid"
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  setWorkerFormError(null);
                                  setBusy(true);
                                  try {
                                      const mailingSameAsPhysical =
                                        workerForm.mailing_same_as_physical;
                                      const mailingLine1 = mailingSameAsPhysical
                                        ? workerForm.physical_address_line1
                                        : workerForm.mailing_address_line1;
                                      const mailingLine2 = mailingSameAsPhysical
                                        ? workerForm.physical_address_line2
                                        : workerForm.mailing_address_line2;
                                      const mailingCity = mailingSameAsPhysical
                                        ? workerForm.physical_address_city
                                        : workerForm.mailing_address_city;
                                      const mailingState = mailingSameAsPhysical
                                        ? workerForm.physical_address_state
                                        : workerForm.mailing_address_state;
                                      const mailingPostal = mailingSameAsPhysical
                                        ? workerForm.physical_address_postal_code
                                        : workerForm.mailing_address_postal_code;
                                      await invokeTauri("create_user", {
                                      input: {
                                        name: workerForm.name,
                                        email: workerForm.email || null,
                                        telephone: workerForm.telephone || null,
                                          physical_address_line1:
                                            workerForm.physical_address_line1 || null,
                                          physical_address_line2:
                                            workerForm.physical_address_line2 || null,
                                          physical_address_city:
                                            workerForm.physical_address_city || null,
                                          physical_address_state:
                                            workerForm.physical_address_state || null,
                                          physical_address_postal_code:
                                            workerForm.physical_address_postal_code || null,
                                          mailing_address_line1:
                                            mailingLine1 || null,
                                          mailing_address_line2:
                                            mailingLine2 || null,
                                          mailing_address_city:
                                            mailingCity || null,
                                          mailing_address_state:
                                            mailingState || null,
                                          mailing_address_postal_code:
                                            mailingPostal || null,
                                        role: workerForm.role,
                                        is_driver: workerForm.is_driver,
                                          username: workerForm.username,
                                          password: workerForm.password,
                                        },
                                    });
                                    await loadUsers();
                                    setWorkerForm({
                                      name: "",
                                      email: "",
                                      telephone: "",
                                        username: "",
                                        password: "",
                                        physical_address_line1: "",
                                        physical_address_line2: "",
                                        physical_address_city: "",
                                        physical_address_state: "",
                                        physical_address_postal_code: "",
                                      mailing_same_as_physical: true,
                                        mailing_address_line1: "",
                                        mailing_address_line2: "",
                                        mailing_address_city: "",
                                        mailing_address_state: "",
                                        mailing_address_postal_code: "",
                                      role: "volunteer",
                                      is_driver: false,
                                    });
                                    setShowWorkerForm(false);
                                  } catch (err: any) {
                                      setWorkerFormError(
                                        typeof err === "string" ? err : "Failed to create user",
                                      );
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                  {workerFormError && (
                                    <div
                                      className="pill"
                                      style={{
                                        gridColumn: "1/-1",
                                        background: "#fbe2e2",
                                        color: "#b3261e",
                                      }}
                                    >
                                      {workerFormError}
                                    </div>
                                  )}

                                <label>
                                  Full Name *
                                  <input
                                    required
                                    value={workerForm.name}
                                      onChange={(e) =>
                                        setWorkerForm({ ...workerForm, name: e.target.value })
                                      }
                                    placeholder="e.g. Jane Doe"
                                    disabled={busy}
                                  />
                                </label>
                                  <label>
                                    Username *
                                    <input
                                      required
                                      value={workerForm.username}
                                      onChange={(e) =>
                                        setWorkerForm({ ...workerForm, username: e.target.value })
                                      }
                                      placeholder="e.g. jdoe"
                                      disabled={busy}
                                    />
                                  </label>
                                  <label>
                                    Password *
                                    <input
                                      required
                                      type="password"
                                      value={workerForm.password}
                                      onChange={(e) =>
                                        setWorkerForm({ ...workerForm, password: e.target.value })
                                      }
                                      placeholder="Set a password"
                                      disabled={busy}
                                    />
                                  </label>
                                <label>
                                  Role *
                                  <select
                                    value={workerForm.role}
                                      onChange={(e) =>
                                        setWorkerForm({ ...workerForm, role: e.target.value })
                                      }
                                    disabled={busy}
                                  >
                                    <option value="volunteer">Volunteer</option>
                                    <option value="staff">Staff</option>
                                    <option value="employee">Employee</option>
                                    <option value="lead">Lead</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </label>
                                <label>
                                  Email
                                  <input
                                    type="email"
                                    value={workerForm.email}
                                      onChange={(e) =>
                                        setWorkerForm({ ...workerForm, email: e.target.value })
                                      }
                                    placeholder="jane@example.com"
                                    disabled={busy}
                                  />
                                </label>
                                <label>
                                  Phone
                                  <input
                                    type="tel"
                                    value={workerForm.telephone}
                                      onChange={(e) =>
                                        setWorkerForm({ ...workerForm, telephone: e.target.value })
                                      }
                                      onBlur={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          telephone: normalizePhone(e.target.value),
                                        })
                                      }
                                    placeholder="(505) 555-0100"
                                    disabled={busy}
                                  />
                                </label>
                                  <label className="span-2">
                                    Address Line 1
                                    <input
                                      value={workerForm.physical_address_line1}
                                      onChange={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          physical_address_line1: e.target.value,
                                        })
                                      }
                                      disabled={busy}
                                    />
                                  </label>
                                  <label className="span-2">
                                    Address Line 2
                                    <input
                                      value={workerForm.physical_address_line2}
                                      onChange={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          physical_address_line2: e.target.value,
                                        })
                                      }
                                      disabled={busy}
                                    />
                                  </label>
                                  <label>
                                    City
                                    <input
                                      value={workerForm.physical_address_city}
                                      onChange={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          physical_address_city: e.target.value,
                                        })
                                      }
                                      onBlur={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          physical_address_city: initCapCity(e.target.value),
                                        })
                                      }
                                      disabled={busy}
                                    />
                                  </label>
                                  <label>
                                    State
                                    <input
                                      value={workerForm.physical_address_state}
                                      onChange={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          physical_address_state: e.target.value,
                                        })
                                      }
                                      onBlur={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          physical_address_state: normalizeState(e.target.value),
                                        })
                                      }
                                      disabled={busy}
                                    />
                                  </label>
                                  <label>
                                    ZIP
                                    <input
                                      value={workerForm.physical_address_postal_code}
                                      onChange={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          physical_address_postal_code: e.target.value,
                                        })
                                      }
                                      disabled={busy}
                                    />
                                  </label>
                                  <label className="checkbox span-2">
                                    <input
                                      type="checkbox"
                                      checked={workerForm.mailing_same_as_physical}
                                      onChange={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          mailing_same_as_physical: e.target.checked,
                                        })
                                      }
                                      disabled={busy}
                                    />
                                    Mailing same as physical
                                  </label>
                                  {!workerForm.mailing_same_as_physical && (
                                    <>
                                      <label className="span-2">
                                        Mailing Line 1
                                        <input
                                          value={workerForm.mailing_address_line1}
                                          onChange={(e) =>
                                            setWorkerForm({
                                              ...workerForm,
                                              mailing_address_line1: e.target.value,
                                            })
                                          }
                                          disabled={busy}
                                        />
                                      </label>
                                      <label className="span-2">
                                        Mailing Line 2
                                        <input
                                          value={workerForm.mailing_address_line2}
                                          onChange={(e) =>
                                            setWorkerForm({
                                              ...workerForm,
                                              mailing_address_line2: e.target.value,
                                            })
                                          }
                                          disabled={busy}
                                        />
                                      </label>
                                      <label>
                                        Mailing City
                                        <input
                                          value={workerForm.mailing_address_city}
                                          onChange={(e) =>
                                            setWorkerForm({
                                              ...workerForm,
                                              mailing_address_city: e.target.value,
                                            })
                                          }
                                          onBlur={(e) =>
                                            setWorkerForm({
                                              ...workerForm,
                                              mailing_address_city: initCapCity(e.target.value),
                                            })
                                          }
                                          disabled={busy}
                                        />
                                      </label>
                                      <label>
                                        Mailing State
                                        <input
                                          value={workerForm.mailing_address_state}
                                          onChange={(e) =>
                                            setWorkerForm({
                                              ...workerForm,
                                              mailing_address_state: e.target.value,
                                            })
                                          }
                                          onBlur={(e) =>
                                            setWorkerForm({
                                              ...workerForm,
                                              mailing_address_state: normalizeState(e.target.value),
                                            })
                                          }
                                          disabled={busy}
                                        />
                                      </label>
                                      <label>
                                        Mailing ZIP
                                        <input
                                          value={workerForm.mailing_address_postal_code}
                                          onChange={(e) =>
                                            setWorkerForm({
                                              ...workerForm,
                                              mailing_address_postal_code: e.target.value,
                                            })
                                          }
                                          disabled={busy}
                                        />
                                      </label>
                                    </>
                                  )}
                                <label className="checkbox span-2">
                                  <input
                                    type="checkbox"
                                    checked={workerForm.is_driver}
                                      onChange={(e) =>
                                        setWorkerForm({
                                          ...workerForm,
                                          is_driver: e.target.checked,
                                        })
                                      }
                                    disabled={busy}
                                  />
                                  Is Driver (Check if this person can drive for deliveries)
                                </label>

                                <div className="actions span-2">
                                  <button className="ping" type="submit" disabled={busy}>
                                    {busy ? "Creating..." : "Create Worker"}
                                  </button>
                                  <button
                                    className="ghost"
                                    type="button"
                                    onClick={() => setShowWorkerForm(false)}
                                    disabled={busy}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="table">
                        <div className="table-head">
                          <span>Name</span>
                          <span>Phone</span>
                          <span>Schedule</span>
                          <span>Credentials</span>
                        </div>
                          {workerDirectoryUsers.map((u) => (
                          <div
                            className="table-row"
                            key={u.id}
                            onClick={() => setSelectedWorkerId(u.id)}
                            onDoubleClick={() => {
                              openWorkerDetail(u);
                            }}
                            style={{
                              cursor: "pointer",
                              backgroundColor:
                                selectedWorkerId === u.id ? "#e0e7ff" : undefined,
                              borderLeft:
                                selectedWorkerId === u.id ? "4px solid #4f46e5" : "4px solid transparent",
                            }}
                          >
                            <div>
                              <strong>{u.name}</strong>
                              <div className="muted">{u.role}</div>
                            </div>
                            <div className="muted">{u.telephone ?? "—"}</div>
                            <div className="muted">{u.availability_notes ?? "—"}</div>
                            <div className="muted">
                                DL: {u.driver_license_status ?? "—"} | Driver:{" "}
                                {u.is_driver ? "Yes" : "No"} | Vehicle: {u.vehicle ?? "—"} | HIPAA:{" "}
                                {u.hipaa_certified ? "Yes" : "Unknown"}
                            </div>
                          </div>
                        ))}
                          {!workerDirectoryUsers.length && (
                            <div className="table-row">No workers yet.</div>
                          )}
                      </div>
                    </div>
                    </div>

                    <div
                      style={{
                        width: workerDetailOpen ? "400px" : "0",
                        overflow: "hidden",
                        transition: "width 0.3s ease",
                        borderLeft: workerDetailOpen ? "1px solid #ddd" : "none",
                        paddingLeft: workerDetailOpen ? "1rem" : "0",
                      }}
                    >
                      {workerDetailOpen && selectedWorker && (
                        <div className="card">
                          <div className="list-head">
                            <h3>{selectedWorker.name}</h3>
                            <button
                              className="ghost"
                              type="button"
                              onClick={() => {
                                setWorkerDetailOpen(false);
                                setSelectedWorker(null);
                                setWorkerDetailEditMode(false);
                              }}
                              style={{ padding: "0.25rem 0.5rem" }}
                            >
                              ×
                            </button>
                          </div>
                          {workerError && (
                            <div
                              className="pill"
                              style={{ background: "#fbe2e2", color: "#b3261e" }}
                            >
                              {workerError}
                            </div>
                          )}
                          {workerDetailEditMode ? (
                            <div className="stack">
                              <div>
                                <strong>Role:</strong> {selectedWorker.role}
                              </div>
                              <label>
                                Email
                                <input
                                  value={workerEdit?.email ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({ ...prev, email: e.target.value }))
                                  }
                                />
                              </label>
                              <label>
                                Phone
                                <input
                                  value={workerEdit?.telephone ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({ ...prev, telephone: e.target.value }))
                                  }
                                  onBlur={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      telephone: normalizePhone(e.target.value),
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Address Line 1
                                <input
                                  value={workerEdit?.physical_address_line1 ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      physical_address_line1: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Address Line 2
                                <input
                                  value={workerEdit?.physical_address_line2 ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      physical_address_line2: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                City
                                <input
                                  value={workerEdit?.physical_address_city ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      physical_address_city: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      physical_address_city: initCapCity(e.target.value),
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                State
                                <input
                                  value={workerEdit?.physical_address_state ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      physical_address_state: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      physical_address_state: normalizeState(e.target.value),
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                ZIP
                                <input
                                  value={workerEdit?.physical_address_postal_code ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      physical_address_postal_code: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={workerEditMailingSameAsPhysical}
                                  onChange={(e) => setWorkerEditMailingSameAsPhysical(e.target.checked)}
                                />
                                Mailing same as physical
                              </label>
                              {!workerEditMailingSameAsPhysical && (
                                <>
                                  <label>
                                    Mailing Line 1
                                    <input
                                      value={workerEdit?.mailing_address_line1 ?? ""}
                                      onChange={(e) =>
                                        setWorkerEdit((prev) => ({
                                          ...prev,
                                          mailing_address_line1: e.target.value,
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    Mailing Line 2
                                    <input
                                      value={workerEdit?.mailing_address_line2 ?? ""}
                                      onChange={(e) =>
                                        setWorkerEdit((prev) => ({
                                          ...prev,
                                          mailing_address_line2: e.target.value,
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    Mailing City
                                    <input
                                      value={workerEdit?.mailing_address_city ?? ""}
                                      onChange={(e) =>
                                        setWorkerEdit((prev) => ({
                                          ...prev,
                                          mailing_address_city: e.target.value,
                                        }))
                                      }
                                      onBlur={(e) =>
                                        setWorkerEdit((prev) => ({
                                          ...prev,
                                          mailing_address_city: initCapCity(e.target.value),
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    Mailing State
                                    <input
                                      value={workerEdit?.mailing_address_state ?? ""}
                                      onChange={(e) =>
                                        setWorkerEdit((prev) => ({
                                          ...prev,
                                          mailing_address_state: e.target.value,
                                        }))
                                      }
                                      onBlur={(e) =>
                                        setWorkerEdit((prev) => ({
                                          ...prev,
                                          mailing_address_state: normalizeState(e.target.value),
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    Mailing ZIP
                                    <input
                                      value={workerEdit?.mailing_address_postal_code ?? ""}
                                      onChange={(e) =>
                                        setWorkerEdit((prev) => ({
                                          ...prev,
                                          mailing_address_postal_code: e.target.value,
                                        }))
                                      }
                                    />
                                  </label>
                                </>
                              )}
                              <label>
                                Availability Notes
                                <input
                                  value={workerEdit?.availability_notes ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      availability_notes: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <div>
                                <strong>Weekly Availability Schedule:</strong>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "1rem",
                                    flexWrap: "wrap",
                                    marginTop: "0.5rem",
                                  }}
                                >
                                  {Object.keys(workerAvailSchedule).map((day) => (
                                    <label
                                      key={day}
                                      className="checkbox"
                                      style={{ display: "flex", alignItems: "center" }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={workerAvailSchedule[day]}
                                        onChange={(e) =>
                                          setWorkerAvailSchedule({
                                            ...workerAvailSchedule,
                                            [day]: e.target.checked,
                                          })
                                        }
                                      />
                                      <span
                                        style={{ marginLeft: "0.25rem", textTransform: "capitalize" }}
                                      >
                                        {day}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <label>
                                Working vehicle
                                <input
                                  value={workerEdit?.vehicle ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({ ...prev, vehicle: e.target.value }))
                                  }
                                />
                              </label>
                              <label>
                                Driver license status
                                <input
                                  value={workerEdit?.driver_license_status ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      driver_license_status: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Driver license number
                                <input
                                  value={workerEdit?.driver_license_number ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      driver_license_number: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Driver license expiration
                                <input
                                  type="date"
                                  value={workerEdit?.driver_license_expires_on?.slice(0, 10) ?? ""}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      driver_license_expires_on: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={!!workerEdit?.is_driver}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      is_driver: e.target.checked,
                                    }))
                                  }
                                />
                                Driver flag (requires DL status + expiration)
                              </label>
                              <label className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={!!workerEdit?.hipaa_certified}
                                  onChange={(e) =>
                                    setWorkerEdit((prev) => ({
                                      ...prev,
                                      hipaa_certified: e.target.checked ? 1 : 0,
                                    }))
                                  }
                                />
                                HIPAA certified
                              </label>
                              {canManage && (
                                <div style={{ display: "flex", gap: 8 }}>
                                  <label style={{ flex: 1 }}>
                                    Reset Password
                                    <input
                                      type="password"
                                      value={workerPasswordReset}
                                      onChange={(e) => setWorkerPasswordReset(e.target.value)}
                                      placeholder="New password"
                                    />
                                  </label>
                                  <button
                                    className="ghost"
                                    type="button"
                                    disabled={busy || !workerPasswordReset.trim()}
                                    onClick={async () => {
                                      setWorkerError(null);
                                      if (!workerPasswordReset.trim()) return;
                                      setBusy(true);
                                      try {
                                        await invokeTauri("reset_password", {
                                          input: {
                                            user_id: selectedWorker.id,
                                            new_password: workerPasswordReset.trim(),
                                          },
                                          role: session?.role ?? null,
                                          actor: session?.username ?? null,
                                        });
                                        setWorkerPasswordReset("");
                                      } catch (err) {
                                        setWorkerError(
                                          typeof err === "string" ? err : "Failed to reset password.",
                                        );
                                      } finally {
                                        setBusy(false);
                                      }
                                    }}
                                  >
                                    Reset Password
                                  </button>
                                  <button
                                    className="ping"
                                    type="button"
                                    disabled={busy}
                                    onClick={async () => {
                                      setWorkerError(null);
                                      const wantsDriver = !!workerEdit?.is_driver;
                                      const hasStatus = !!(
                                        workerEdit?.driver_license_status ?? ""
                                      ).trim();
                                      const hasExpiry = !!(
                                        workerEdit?.driver_license_expires_on ?? ""
                                      ).trim();
                                      if (wantsDriver && (!hasStatus || !hasExpiry)) {
                                        setWorkerError(
                                          "Driver flag requires license status and expiration.",
                                        );
                                        return;
                                      }
                                      setBusy(true);
                                      try {
                                      const mailingSameAsPhysical = workerEditMailingSameAsPhysical;
                                      const mailingLine1 = mailingSameAsPhysical
                                        ? workerEdit?.physical_address_line1 ?? ""
                                        : workerEdit?.mailing_address_line1 ?? "";
                                      const mailingLine2 = mailingSameAsPhysical
                                        ? workerEdit?.physical_address_line2 ?? ""
                                        : workerEdit?.mailing_address_line2 ?? "";
                                      const mailingCity = mailingSameAsPhysical
                                        ? workerEdit?.physical_address_city ?? ""
                                        : workerEdit?.mailing_address_city ?? "";
                                      const mailingState = mailingSameAsPhysical
                                        ? workerEdit?.physical_address_state ?? ""
                                        : workerEdit?.mailing_address_state ?? "";
                                      const mailingPostal = mailingSameAsPhysical
                                        ? workerEdit?.physical_address_postal_code ?? ""
                                        : workerEdit?.mailing_address_postal_code ?? "";
                                        await invokeTauri("update_user_flags", {
                                          input: {
                                            id: selectedWorker.id,
                                            email: workerEdit?.email ?? null,
                                            telephone: workerEdit?.telephone ?? null,
                                            physical_address_line1:
                                              workerEdit?.physical_address_line1 ?? null,
                                            physical_address_line2:
                                              workerEdit?.physical_address_line2 ?? null,
                                            physical_address_city:
                                              workerEdit?.physical_address_city ?? null,
                                            physical_address_state:
                                              workerEdit?.physical_address_state ?? null,
                                            physical_address_postal_code:
                                              workerEdit?.physical_address_postal_code ?? null,
                                            mailing_address_line1:
                                            mailingLine1 || null,
                                            mailing_address_line2:
                                            mailingLine2 || null,
                                            mailing_address_city:
                                            mailingCity || null,
                                            mailing_address_state:
                                            mailingState || null,
                                            mailing_address_postal_code:
                                            mailingPostal || null,
                                            availability_notes:
                                              workerEdit?.availability_notes ?? null,
                                            availability_schedule:
                                              JSON.stringify(workerAvailSchedule),
                                            vehicle: workerEdit?.vehicle ?? null,
                                            driver_license_status:
                                              workerEdit?.driver_license_status ?? null,
                                            driver_license_number:
                                              workerEdit?.driver_license_number ?? null,
                                            driver_license_expires_on:
                                              workerEdit?.driver_license_expires_on
                                                ? `${workerEdit.driver_license_expires_on}T00:00:00`
                                                : null,
                                            hipaa_certified: !!workerEdit?.hipaa_certified,
                                            is_driver: wantsDriver,
                                          },
                                          role: session?.role ?? null,
                                        });
                                        await loadUsers();
                                        setSelectedWorker((prev) =>
                                          prev
                                            ? ({
                                                ...prev,
                                                ...workerEdit,
                                                is_driver: wantsDriver,
                                                hipaa_certified: workerEdit?.hipaa_certified ? 1 : 0,
                                              } as UserRow)
                                            : prev,
                                        );
                                        setWorkerDetailEditMode(false);
                                        setWorkerPasswordReset("");
                                      } finally {
                                        setBusy(false);
                                      }
                                    }}
                                  >
                                    Save worker
                                  </button>
                                  <button
                                    className="ghost"
                                    type="button"
                                    onClick={() => {
                                      if (selectedWorker) {
                                        openWorkerDetail(selectedWorker);
                                      }
                                      setWorkerDetailEditMode(false);
                                      setWorkerPasswordReset("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                              {!canManage && (
                                <div className="muted">Read-only (admin/lead can edit).</div>
                              )}
                            </div>
                          ) : (
                            <div className="stack">
                              <div>
                                <strong>Role:</strong> {selectedWorker.role}
                              </div>
                              <div>
                                <strong>Email:</strong> {workerDetailValues?.email ?? "—"}
                              </div>
                              <div>
                                <strong>Phone:</strong> {workerDetailValues?.telephone ?? "—"}
                              </div>
                              <div>
                                <strong>Address Line 1:</strong>{" "}
                                {workerDetailValues?.physical_address_line1 ?? "—"}
                              </div>
                              <div>
                                <strong>Address Line 2:</strong>{" "}
                                {workerDetailValues?.physical_address_line2 ?? "—"}
                              </div>
                              <div>
                                <strong>City:</strong> {workerDetailValues?.physical_address_city ?? "—"}
                              </div>
                              <div>
                                <strong>State:</strong> {workerDetailValues?.physical_address_state ?? "—"}
                              </div>
                              <div>
                                <strong>ZIP:</strong>{" "}
                                {workerDetailValues?.physical_address_postal_code ?? "—"}
                              </div>
                              <div>
                                <strong>Mailing Line 1:</strong>{" "}
                                {workerDetailValues?.mailing_address_line1 ?? "—"}
                              </div>
                              <div>
                                <strong>Mailing Line 2:</strong>{" "}
                                {workerDetailValues?.mailing_address_line2 ?? "—"}
                              </div>
                              <div>
                                <strong>Mailing City:</strong>{" "}
                                {workerDetailValues?.mailing_address_city ?? "—"}
                              </div>
                              <div>
                                <strong>Mailing State:</strong>{" "}
                                {workerDetailValues?.mailing_address_state ?? "—"}
                              </div>
                              <div>
                                <strong>Mailing ZIP:</strong>{" "}
                                {workerDetailValues?.mailing_address_postal_code ?? "—"}
                              </div>
                              <div>
                                <strong>Availability Notes:</strong>{" "}
                                {workerDetailValues?.availability_notes ?? "—"}
                              </div>
                              <div>
                                <strong>Availability Schedule:</strong>{" "}
                                {Object.keys(workerAvailSchedule)
                                  .filter((day) => workerAvailSchedule[day])
                                  .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
                                  .join(", ") || "None set"}
                              </div>
                              <div>
                                <strong>Working vehicle:</strong> {workerDetailValues?.vehicle ?? "—"}
                              </div>
                              <div>
                                <strong>Driver license status:</strong>{" "}
                                {workerDetailValues?.driver_license_status ?? "—"}
                              </div>
                              <div>
                                <strong>Driver license number:</strong>{" "}
                                {workerDetailValues?.driver_license_number ?? "—"}
                              </div>
                              <div>
                                <strong>Driver license expiration:</strong>{" "}
                                {workerDetailValues?.driver_license_expires_on
                                  ? workerDetailValues.driver_license_expires_on.slice(0, 10)
                                  : "—"}
                              </div>
                              <div>
                                <strong>Driver:</strong>{" "}
                                {workerDetailValues?.is_driver ? "Yes" : "No"}
                              </div>
                              <div>
                                <strong>HIPAA certified:</strong>{" "}
                                {workerDetailValues?.hipaa_certified ? "Yes" : "No"}
                              </div>
                              {canManage ? (
                                <div
                                  style={{
                                    borderTop: "1px solid #eee",
                                    marginTop: "1rem",
                                    paddingTop: "0.75rem",
                                  }}
                                >
                                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                    <button
                                      className="ghost"
                                      type="button"
                                      onClick={() => setWorkerDetailEditMode(true)}
                                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="ghost"
                                      type="button"
                                      onClick={async () => {
                                        if (
                                          !window.confirm(
                                            `Delete worker ${selectedWorker.name}? This marks them deleted.`,
                                          )
                                        )
                                          return;
                                        setBusy(true);
                                        try {
                                          await invokeTauri("delete_user", {
                                            id: selectedWorker.id,
                                            role: session?.role ?? null,
                                            actor: session?.username ?? null,
                                          });
                                          await loadUsers();
                                          setWorkerDetailOpen(false);
                                          setSelectedWorker(null);
                                          setWorkerDetailEditMode(false);
                                        } finally {
                                          setBusy(false);
                                        }
                                      }}
                                      style={{
                                        padding: "0.25rem 0.5rem",
                                        fontSize: "0.85rem",
                                        color: "#b3261e",
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="muted">Read-only (admin/lead can edit).</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <ReportsTab
                  activeTab={activeTab}
                  session={session}
                  auditLogs={auditLogs}
                  auditLogFilter={auditLogFilter}
                  setAuditLogFilter={setAuditLogFilter}
                  setAuditLogs={setAuditLogs}
                  loadAuditLogs={loadAuditLogs}
                  busy={busy}
                  setBusy={setBusy}
                />
              </div>
            </section>
          </main>
        </>
      ) : (
        <>
          {/* ===== TAB RENDERING SECTIONS ===== */}
          {/* Dashboard: Lines ~1483-1580 | Profile: ~1581-1880 | Clients: ~1881-2380 */}
          {/* Inventory: ~2381-2680 | Work Orders: ~2681-3680 | Metrics: ~3681-3780 */}
          {/* Finance: ~3781-3880 | Worker Directory: ~3881-4280 | Reports: ~4281-4380 */}
      <div className="login-page-container">
          {/* Header (100%) */}
          <div className="login-header">
             <div className="header-brand">
                <img src={logo} className="header-logo" alt="NMERA Logo" />
                <div className="header-text">
                   <h1>Northern Mendocino</h1>
                   <h1>Ecosystem Recovery Alliance</h1>
                </div>
             </div>
          </div>

          <div className="login-content">
             {/* Left Column (60%) */}
             <div className="login-left-panel">
                <div className="intro-section">
                    <img src={firewoodIcon} className="intro-logo" alt="Firewood Bank" />
                    <div className="intro-text">
                        <h2>Welcome</h2>
                        <p className="tagline">"Keeping eachother warm"</p>
                    </div>
                </div>
                
                <div className="motd-section">
                    <h3>Updates & Announcements</h3>
                    <div className="motd-scroll-container">
                       {motdItems.length === 0 ? (
                         <p className="muted">No recent announcements.</p>
                       ) : (
                         <div className="motd-list">
                      {motdItems.map((item) => (
                             <div key={item.id} className="motd-item">
                               <div className="motd-date">
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                               </div>
                               <div className="motd-msg">{item.message}</div>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                </div>
             </div>

             {/* Right Column (40%) */}
             <div className="login-right-panel">
                <div className="login-form-container">
                   <LoginCard onLogin={setSession} />
                <div
                  style={{ marginTop: 32, textAlign: "center", fontSize: "0.85rem", color: "#888" }}
                >
                     &copy; {new Date().getFullYear()} NM-ERA Firewood Bank
                   </div>
                </div>
             </div>
          </div>
        </div>
        </>
      )}
      {session && showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Change Password</h3>
            {passwordError && (
              <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e" }}>
                {passwordError}
              </div>
            )}
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setPasswordError(null);
                if (!passwordForm.current || !passwordForm.next) {
                  setPasswordError("Current and new password are required.");
                  return;
                }
                if (passwordForm.next !== passwordForm.confirm) {
                  setPasswordError("New password and confirmation do not match.");
                  return;
                }
                setBusy(true);
                try {
                  await invokeTauri("change_password", {
                    input: {
                      username: session.username,
                      current_password: passwordForm.current,
                      new_password: passwordForm.next,
                    },
                  });
                  setPasswordForm({ current: "", next: "", confirm: "" });
                  setShowPasswordModal(false);
                } catch (err) {
                  setPasswordError(typeof err === "string" ? err : "Failed to change password.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Current Password
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                />
              </label>
              <label>
                New Password
                <input
                  type="password"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                />
              </label>
              <label>
                Confirm New Password
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                />
              </label>
              <div className="actions">
                <button className="ping" type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Update Password"}
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ current: "", next: "", confirm: "" });
                    setPasswordError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {session && showCommunicationForm && selectedClientForDetail && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Record Communication - {selectedClientForDetail.name}</h3>
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await invokeTauri("create_client_communication", {
                    input: {
                      client_id: selectedClientForDetail.id,
                      communication_type: communicationForm.communication_type,
                      direction: communicationForm.direction,
                      subject: communicationForm.subject.trim() || null,
                      message: communicationForm.message.trim() || null,
                      contacted_by_user_id: session.username || session.userId || null,
                      notes: communicationForm.notes.trim() || null,
                    },
                    role: session.role,
                    actor: session.username || session.userId || "",
                  });
                  await loadClientCommunications(selectedClientForDetail.id);
                  setShowCommunicationForm(false);
                  setCommunicationForm({
                    communication_type: "phone",
                    direction: "outbound",
                    subject: "",
                    message: "",
                    notes: "",
                  });
                } catch (err) {
                  alert(typeof err === "string" ? err : "Failed to record communication.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Communication Type
                <select
                  value={communicationForm.communication_type}
                  onChange={(e) =>
                    setCommunicationForm({ ...communicationForm, communication_type: e.target.value })
                  }
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="mail">Mail</option>
                  <option value="in_person">In Person</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Direction
                <select
                  value={communicationForm.direction}
                  onChange={(e) =>
                    setCommunicationForm({ ...communicationForm, direction: e.target.value })
                  }
                >
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </label>
              <label>
                Subject
                <input
                  value={communicationForm.subject}
                  onChange={(e) =>
                    setCommunicationForm({ ...communicationForm, subject: e.target.value })
                  }
                  placeholder="Brief subject or topic"
                />
              </label>
              <label>
                Message/Summary
                <textarea
                  value={communicationForm.message}
                  onChange={(e) =>
                    setCommunicationForm({ ...communicationForm, message: e.target.value })
                  }
                  rows={4}
                  placeholder="Summary of the communication"
                />
              </label>
              <label>
                Notes
                <textarea
                  value={communicationForm.notes}
                  onChange={(e) =>
                    setCommunicationForm({ ...communicationForm, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Additional notes"
                />
              </label>
              <div className="actions">
                <button className="ping" type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Record Communication"}
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setShowCommunicationForm(false);
                    setCommunicationForm({
                      communication_type: "phone",
                      direction: "outbound",
                      subject: "",
                      message: "",
                      notes: "",
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {session && showFeedbackForm && selectedClientForDetail && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Record Feedback - {selectedClientForDetail.name}</h3>
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await invokeTauri("create_client_feedback", {
                    input: {
                      client_id: selectedClientForDetail.id,
                      work_order_id: feedbackForm.work_order_id.trim() || null,
                      feedback_type: feedbackForm.feedback_type,
                      rating: feedbackForm.rating || null,
                      comments: feedbackForm.comments.trim() || null,
                    },
                  });
                  await loadClientFeedback(selectedClientForDetail.id);
                  setShowFeedbackForm(false);
                  setFeedbackForm({
                    feedback_type: "satisfaction",
                    rating: 5,
                    comments: "",
                    work_order_id: "",
                  });
                } catch (err) {
                  alert(typeof err === "string" ? err : "Failed to record feedback.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Feedback Type
                <select
                  value={feedbackForm.feedback_type}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, feedback_type: e.target.value })
                  }
                >
                  <option value="satisfaction">Satisfaction</option>
                  <option value="complaint">Complaint</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="compliment">Compliment</option>
                </select>
              </label>
              {feedbackForm.feedback_type === "satisfaction" && (
                <label>
                  Rating (1-5)
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={feedbackForm.rating}
                    onChange={(e) =>
                      setFeedbackForm({ ...feedbackForm, rating: parseInt(e.target.value) || 5 })
                    }
                  />
                </label>
              )}
              <label>
                Work Order ID (Optional)
                <input
                  value={feedbackForm.work_order_id}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, work_order_id: e.target.value })
                  }
                  placeholder="If related to specific delivery"
                />
              </label>
              <label>
                Comments
                <textarea
                  value={feedbackForm.comments}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, comments: e.target.value })
                  }
                  rows={4}
                  placeholder="Client feedback details"
                  required
                />
              </label>
              <div className="actions">
                <button className="ping" type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Record Feedback"}
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setShowFeedbackForm(false);
                    setFeedbackForm({
                      feedback_type: "satisfaction",
                      rating: 5,
                      comments: "",
                      work_order_id: "",
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
