import React, { useEffect, useMemo, useRef, useState } from "react";

import { invokeTauri } from "./api/tauri";
import Nav from "./components/Nav";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import ChangeRequestModal from "./components/ChangeRequestModal";
import ReportsTab from "./components/ReportsTab";
import logo from "./assets/logo.png";
import firewoodIcon from "./assets/logo.png";
import "./index.css";
import {
  AuditLogRow,
  ClientConflictRow,
  ClientRow,
  DeliveryEventRow,
  InventoryRow,
  LoginResponse,
  MotdRow,
  UserRow,
  UserSession,
  WorkOrderRow,
} from "./types";
import { initCapCity, isSameDay, normalizePhone, normalizeState, safeDate } from "./utils/format";
import {
  normalizeAndValidatePhone,
  normalizeAndValidatePostal,
  normalizeAndValidateState,
  normalizeCity,
} from "./utils/validation";

const tabs = [
  "Dashboard",
  "Clients",
  "Inventory",
  "Work Orders",
  "Metrics",
  "Worker Directory",
  "Reports",
  "Admin",
];

// Client numbers removed — no generation function needed anymore.

function LoginCard({ onLogin }: { onLogin: (session: UserSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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
    setTimeout(() => {
      if (isMounted.current) {
        setResetMessage(`If an account exists for "${forgotEmail}", a reset code has been sent.`);
        setSubmitting(false);
      }
    }, 1000);
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
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
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
            💡 Demo: admin/admin, lead/lead, staff/staff
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
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="login-btn" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>
            
            <div className="login-options" style={{ justifyContent: "center", marginTop: 16 }}>
                 <button className="login-link" type="button" onClick={() => setIsForgot(true)}>
                    Lost Password?
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
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    console.log("App mounted");
  }, []);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryEventRow[]>([]);
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
    Record<string, { status: string; mileage: string }>
  >({});
  const [_driverEdits, _setDriverEdits] = useState<Record<string, { mileage: string }>>({});
  const [selectedWorker, setSelectedWorker] = useState<UserRow | null>(null);
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
  const [mailingListSidebarOpen, setMailingListSidebarOpen] = useState(false);
  const [mailingListFilter, setMailingListFilter] = useState<string>("all"); // "all", "mail", "email", "both"
  const [clientDetailSidebarOpen, setClientDetailSidebarOpen] = useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<ClientRow | null>(null);
  const [clientSortField, setClientSortField] = useState<string>("first_name"); // "first_name", "last_name", "phone", "state", "approval_status"
  const [clientSortDirection, setClientSortDirection] = useState<"asc" | "desc">("asc");
  const [motdItems, setMotdItems] = useState<MotdRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderRow | null>(null);
  const [workOrderDetailSidebarOpen, setWorkOrderDetailSidebarOpen] = useState(false);
  const [workerDetailSidebarOpen, setWorkerDetailSidebarOpen] = useState(false);
  const [workOrderEditMode, setWorkOrderEditMode] = useState(false);
  const [workOrderEditForm, setWorkOrderEditForm] = useState({
    scheduled_date: "",
    status: "",
    assignees: [] as string[],
    mileage: "",
    notes: "",
  });

  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    how_did_they_hear_about_us: "",
    referring_agency: "",
    approval_status: "pending",
    denial_reason: "",
    gate_combo: "",
    notes: "",
    wood_size_label: "",
    wood_size_other: "",
    directions: "",
    opt_out_email: false, // Opt out of email mailing list
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
    const data = await invokeTauri<ClientRow[]>("list_clients", {
      role: session?.role ?? null,
      username: session?.username ?? null,
      hipaa_certified: session?.hipaaCertified ?? false,
      is_driver: session?.isDriver ?? false,
    });
    setClients(data);
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
    const nextProgress: Record<string, { status: string; mileage: string }> = {};
    data.forEach((wo) => {
      nextProgress[wo.id] = {
        status: wo.status ?? "scheduled",
        mileage: wo.mileage != null ? String(wo.mileage) : "",
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

  const loadUsers = async () => {
    const data = await invokeTauri<UserRow[]>("list_users");
    const mapped = data.map((u) => ({
      ...u,
      is_driver: !!u.is_driver,
      // hipaa_certified is already a number (0 or 1) from backend
    }));
    setUsers(mapped);
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
    } catch (e) {
      console.error(e);
    }
  };

  const loadAll = async () => {
    setBusy(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (session?.role === "admin" || session?.role === "lead" || session?.role === "staff") {
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
        tasks.push(loadAuditLogs());
      }
      tasks.push(loadWorkOrders(), loadDeliveries(), loadMotd());
      await Promise.all(tasks);
    } finally {
      setBusy(false);
    }
  };

  const canManage = session?.role === "admin" || session?.role === "lead";
  const isDriver = session?.isDriver ?? false;
  const canCreateWorkOrders = session?.role === "admin" || session?.role === "staff";
  const canViewPII =
    session?.role === "admin" || (session?.role === "lead" && session.hipaaCertified);
  const canViewClientPII = canViewPII || isDriver;
  const filteredClients = useMemo(() => {
    let filtered = clients.filter((c) => {
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
  }, [clients, clientSearch, clientSortField, clientSortDirection]);
  const visibleTabs = useMemo(() => {
    if (!session) return tabs.filter((t) => t !== "Worker Directory" && t !== "Reports");
    if (session.role === "volunteer") return ["Dashboard", "Work Orders"];
    if (session.role === "staff")
      return ["Dashboard", "Clients", "Inventory", "Work Orders", "Metrics"];
    // admin / lead
    // admin / lead
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
      (session.role === "admin" || session.role === "staff" || session.role === "lead")
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
            {session && (
              <button className="ghost" onClick={() => setShowChangeRequestModal(true)}>
                Request Change
              </button>
            )}
            {session && (
              <button className="ghost" onClick={() => setShowPasswordModal(true)}>
                Change Password
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
                    onWorkerSelect={(user) => {
                      if (session?.role === "admin" || session?.role === "staff" || session?.role === "lead") {
                        setSelectedWorker(user);
                        setWorkerEdit({ ...user });
                        setActiveTab("Worker Directory");
                      }
                    }}
                  />
                )}

                {activeTab === "Admin" && session && <AdminPanel session={session} />}

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
                                    gate_combo: clientForm.gate_combo || null,
                                    notes: clientForm.notes || null,
                                    how_did_they_hear_about_us:
                                      clientForm.how_did_they_hear_about_us || null,
                                    referring_agency: clientForm.referring_agency || null,
                                    approval_status: defaultStatus || "pending",
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
                                  console.error("Error saving client:", error);
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
                                Reason Qualified Or Not
                                <textarea
                                  tabIndex={24}
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
                          <h3>Clients ({clients.length})</h3>
                          <input
                            placeholder="Search name, #, city"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            style={{ minWidth: 200 }}
                          />
                          <button className="ghost" onClick={loadClients} disabled={busy}>
                            Refresh
                          </button>
                        </div>
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
                          {filteredClients.map((c) => {
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
                                  {c.physical_address_city}
                                </div>
                                <div className="client-cell hide-on-mobile">
                                  {c.physical_address_state}
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
                                        opt_out_email: !selectedClientForDetail.email,
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

                {/* Worker Detail Sidebar */}
                {workerDetailSidebarOpen && selectedWorker && (
                  <div
                    style={{
                      width: "500px",
                      overflow: "hidden",
                      transition: "width 0.3s ease",
                      borderLeft: "1px solid #ddd",
                      padding: "1rem",
                    }}
                  >
                    <div className="card">
                      <div className="list-head" style={{ marginBottom: "1rem" }}>
                        <h3>Worker Details</h3>
                        <button
                          className="ghost"
                          type="button"
                          onClick={() => {
                            setWorkerDetailSidebarOpen(false);
                            setSelectedWorker(null);
                          }}
                          style={{ padding: "0.25rem 0.5rem" }}
                        >
                          ×
                        </button>
                      </div>

                      <div className="stack" style={{ gap: "0.75rem" }}>
                        <div>
                          <strong style={{ fontSize: "1.1rem" }}>{selectedWorker.name}</strong>
                          <div className="muted" style={{ fontSize: "0.85rem" }}>
                            {selectedWorker.role}
                            {selectedWorker.is_driver && " • Driver"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.75rem",
                          }}
                        >
                          {selectedWorker.email && (
                            <div>
                              <strong>Email:</strong> {selectedWorker.email}
                            </div>
                          )}
                          {selectedWorker.telephone && (
                            <div>
                              <strong>Phone:</strong> {selectedWorker.telephone}
                            </div>
                          )}
                          <div>
                            <strong>Role:</strong> {selectedWorker.role}
                          </div>
                          <div>
                            <strong>Driver:</strong> {selectedWorker.is_driver ? "Yes" : "No"}
                          </div>
                          {selectedWorker.hipaa_certified != null && (
                            <div>
                              <strong>HIPAA Certified:</strong> {selectedWorker.hipaa_certified ? "Yes" : "No"}
                            </div>
                          )}
                        </div>

                        {(session?.role === "admin" || session?.role === "lead") && (
                          <>
                            <hr style={{ border: "none", borderTop: "1px solid #eee" }} />

                            {/* Physical Address */}
                            {(selectedWorker.physical_address_line1 ||
                              selectedWorker.physical_address_city) && (
                              <div>
                                <strong>Physical Address:</strong>
                                <div style={{ marginTop: "0.25rem" }}>
                                  {selectedWorker.physical_address_line1 && (
                                    <div>{selectedWorker.physical_address_line1}</div>
                                  )}
                                  {selectedWorker.physical_address_line2 && (
                                    <div>{selectedWorker.physical_address_line2}</div>
                                  )}
                                  {(selectedWorker.physical_address_city ||
                                    selectedWorker.physical_address_state ||
                                    selectedWorker.physical_address_postal_code) && (
                                    <div>
                                      {selectedWorker.physical_address_city}
                                      {selectedWorker.physical_address_city && ", "}
                                      {selectedWorker.physical_address_state}{" "}
                                      {selectedWorker.physical_address_postal_code}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Mailing Address */}
                            {(selectedWorker.mailing_address_line1 ||
                              selectedWorker.mailing_address_city) && (
                              <div>
                                <strong>Mailing Address:</strong>
                                <div style={{ marginTop: "0.25rem" }}>
                                  {selectedWorker.mailing_address_line1 && (
                                    <div>{selectedWorker.mailing_address_line1}</div>
                                  )}
                                  {selectedWorker.mailing_address_line2 && (
                                    <div>{selectedWorker.mailing_address_line2}</div>
                                  )}
                                  {(selectedWorker.mailing_address_city ||
                                    selectedWorker.mailing_address_state ||
                                    selectedWorker.mailing_address_postal_code) && (
                                    <div>
                                      {selectedWorker.mailing_address_city}
                                      {selectedWorker.mailing_address_city && ", "}
                                      {selectedWorker.mailing_address_state}{" "}
                                      {selectedWorker.mailing_address_postal_code}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Driver License Info */}
                            {selectedWorker.driver_license_status && (
                              <div>
                                <strong>Driver License:</strong> {selectedWorker.driver_license_status}
                                {selectedWorker.driver_license_number && (
                                  <div style={{ marginTop: "0.25rem" }}>
                                    <strong>Number:</strong> {selectedWorker.driver_license_number}
                                  </div>
                                )}
                                {selectedWorker.driver_license_expires_on && (
                                  <div>
                                    <strong>Expires:</strong>{" "}
                                    {new Date(selectedWorker.driver_license_expires_on).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Vehicle */}
                            {selectedWorker.vehicle && (
                              <div>
                                <strong>Vehicle:</strong> {selectedWorker.vehicle}
                              </div>
                            )}

                            {/* Availability Notes */}
                            {selectedWorker.availability_notes && (
                              <div>
                                <strong>Availability Notes:</strong>
                                <div
                                  style={{
                                    marginTop: "0.25rem",
                                    whiteSpace: "pre-wrap",
                                    background: "#f9f9f9",
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {selectedWorker.availability_notes}
                                </div>
                              </div>
                            )}

                            {/* Edit Button */}
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                className="primary"
                                type="button"
                                onClick={() => {
                                  // Populate the edit form with current worker data
                                  setWorkerEdit({
                                    email: selectedWorker.email ?? "",
                                    telephone: selectedWorker.telephone ?? "",
                                    physical_address_line1: selectedWorker.physical_address_line1 ?? "",
                                    physical_address_line2: selectedWorker.physical_address_line2 ?? "",
                                    physical_address_city: selectedWorker.physical_address_city ?? "",
                                    physical_address_state: selectedWorker.physical_address_state ?? "",
                                    physical_address_postal_code: selectedWorker.physical_address_postal_code ?? "",
                                    mailing_address_line1: selectedWorker.mailing_address_line1 ?? "",
                                    mailing_address_line2: selectedWorker.mailing_address_line2 ?? "",
                                    mailing_address_city: selectedWorker.mailing_address_city ?? "",
                                    mailing_address_state: selectedWorker.mailing_address_state ?? "",
                                    mailing_address_postal_code: selectedWorker.mailing_address_postal_code ?? "",
                                    availability_notes: selectedWorker.availability_notes ?? "",
                                    vehicle: selectedWorker.vehicle ?? "",
                                    driver_license_status: selectedWorker.driver_license_status ?? "",
                                    driver_license_number: selectedWorker.driver_license_number ?? "",
                                    driver_license_expires_on: selectedWorker.driver_license_expires_on ?? "",
                                    is_driver: !!selectedWorker.is_driver,
                                    hipaa_certified: selectedWorker.hipaa_certified ?? false,
                                  });

                                  // Parse availability schedule
                                  if (selectedWorker.availability_schedule) {
                                    try {
                                      const parsed = JSON.parse(selectedWorker.availability_schedule);
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

                                  setWorkerDetailSidebarOpen(false);
                                  // This will switch to the edit view in the Worker Directory tab
                                  setActiveTab("Worker Directory");
                                }}
                              >
                                Edit Worker
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {workOrderDetailSidebarOpen && selectedWorkOrder && (
                  <div
                    style={{
                      width: "500px",
                      overflow: "hidden",
                      transition: "width 0.3s ease",
                      borderLeft: "1px solid #ddd",
                      padding: "1rem",
                    }}
                  >
                    <div className="card">
                      <div className="list-head" style={{ marginBottom: "1rem" }}>
                        <h3>Work Order Details</h3>
                        <button
                          className="ghost"
                          type="button"
                          onClick={() => {
                            setWorkOrderDetailSidebarOpen(false);
                            setWorkOrderEditMode(false);
                            setSelectedWorkOrder(null);
                          }}
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
                          {selectedWorkOrder.created_at && (
                            <div>
                              <strong>Created:</strong>{" "}
                              {new Date(selectedWorkOrder.created_at).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {(session?.role === "admin" ||
                          session?.role === "staff" ||
                          session?.role === "lead") && (
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

                      {/* Edit Form for Admin/Staff */}
                      {workOrderEditMode && (session?.role === "admin" || session?.role === "staff") && (
                        <>
                          <hr style={{ border: "none", borderTop: "1px solid #eee" }} />
                          <div className="stack" style={{ gap: "0.75rem" }}>
                            <h4>Edit Work Order</h4>

                            <label>
                              Scheduled Date
                              <input
                                type="datetime-local"
                                value={workOrderEditForm.scheduled_date}
                                onChange={(e) =>
                                  setWorkOrderEditForm((prev) => ({
                                    ...prev,
                                    scheduled_date: e.target.value,
                                  }))
                                }
                              />
                            </label>

                            <label>
                              Status
                              <select
                                value={workOrderEditForm.status}
                                onChange={(e) =>
                                  setWorkOrderEditForm((prev) => ({
                                    ...prev,
                                    status: e.target.value,
                                  }))
                                }
                              >
                                <option value="pending">Pending</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </label>

                            <label>
                              Assign Workers
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                {allUsers
                                  .filter((u) => u.role === "staff" || u.role === "lead")
                                  .map((user) => (
                                    <label
                                      key={user.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.25rem",
                                        fontSize: "0.85rem",
                                        padding: "0.25rem 0.5rem",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={workOrderEditForm.assignees.includes(user.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setWorkOrderEditForm((prev) => ({
                                              ...prev,
                                              assignees: [...prev.assignees, user.id],
                                            }));
                                          } else {
                                            setWorkOrderEditForm((prev) => ({
                                              ...prev,
                                              assignees: prev.assignees.filter((id) => id !== user.id),
                                            }));
                                          }
                                        }}
                                      />
                                      {user.name}
                                    </label>
                                  ))}
                              </div>
                            </label>

                            <label>
                              Mileage (for completed orders)
                              <input
                                type="number"
                                step="0.1"
                                value={workOrderEditForm.mileage}
                                onChange={(e) =>
                                  setWorkOrderEditForm((prev) => ({
                                    ...prev,
                                    mileage: e.target.value,
                                  }))
                                }
                                placeholder="Miles driven"
                              />
                            </label>

                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                className="primary"
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                  setWorkOrderError(null);
                                  setBusy(true);
                                  try {
                                    await invokeTauri("update_work_order", {
                                      input: {
                                        id: selectedWorkOrder.id,
                                        scheduled_date: workOrderEditForm.scheduled_date
                                          ? `${workOrderEditForm.scheduled_date}:00`
                                          : null,
                                        status: workOrderEditForm.status,
                                        assignees_json: JSON.stringify(workOrderEditForm.assignees),
                                        mileage: workOrderEditForm.mileage
                                          ? parseFloat(workOrderEditForm.mileage)
                                          : null,
                                      },
                                      role: session?.role ?? null,
                                    });
                                    await loadWorkOrders();
                                    setWorkOrderEditMode(false);
                                    setWorkOrderDetailSidebarOpen(false);
                                    setSelectedWorkOrder(null);
                                  } catch (e: any) {
                                    setWorkOrderError(
                                      typeof e === "string" ? e : JSON.stringify(e),
                                    );
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                {busy ? "Saving..." : "Save Changes"}
                              </button>
                              <button
                                className="ghost"
                                type="button"
                                onClick={() => setWorkOrderEditMode(false)}
                              >
                                Cancel Edit
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {!workOrderEditMode && (
                        <>
                          <hr style={{ border: "none", borderTop: "1px solid #eee" }} />
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            {(session?.role === "admin" || session?.role === "staff") && (
                              <button
                                className="primary"
                                type="button"
                                onClick={() => {
                                  setWorkOrderEditForm({
                                    scheduled_date: selectedWorkOrder.scheduled_date
                                      ? selectedWorkOrder.scheduled_date.slice(0, 16)
                                      : "",
                                    status: selectedWorkOrder.status,
                                    assignees: (() => {
                                      try {
                                        const arr = JSON.parse(
                                          selectedWorkOrder.assignees_json ?? "[]",
                                        );
                                        return Array.isArray(arr) ? arr : [];
                                      } catch {
                                        return [];
                                      }
                                    })(),
                                    mileage: selectedWorkOrder.mileage?.toString() ?? "",
                                  });
                                  setWorkOrderEditMode(true);
                                }}
                              >
                                Edit Order
                              </button>
                            )}
                            {(session?.role === "admin" || session?.role === "staff") && (
                              <button
                                className="ghost"
                                type="button"
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      `Delete work order for ${selectedWorkOrder.client_name}?`,
                                    )
                                  )
                                    return;
                                  setBusy(true);
                                  try {
                                    await invokeTauri("delete_work_order", {
                                      id: selectedWorkOrder.id,
                                      role: session?.role ?? null,
                                    });
                                    await loadWorkOrders();
                                    setWorkOrderDetailSidebarOpen(false);
                                    setSelectedWorkOrder(null);
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
                            )}
                          </div>
                        </>
                      )}
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
                          onClick={() => {
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
                                await invokeTauri("create_inventory_item", { input: payload });
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
                        <p className="muted">Only staff or admins can add work orders.</p>
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
                                setWorkOrderError("Only staff or admin can create work orders.");
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
      