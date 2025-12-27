import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Nav from "./components/Nav";
import logo from "./assets/logo.png";
import firewoodIcon from "../firewoodBank-icon.png";

const tabs = ["Dashboard", "Clients", "Inventory", "Work Orders", "Metrics", "Worker Directory"];

type Role = "admin" | "lead" | "staff" | "driver" | "volunteer";

type UserSession = {
  name: string;
  username: string;
  role: Role;
  hipaaCertified?: boolean;
  email?: string; // recovery; not used for login
};

type ClientRow = {
  id: string;
  name: string;
  client_number: string;
  client_title?: string | null;
  email?: string | null;
  telephone?: string | null;
  approval_status: string;
  physical_address_line1: string;
  physical_address_line2?: string | null;
  physical_address_city: string;
  physical_address_state: string;
  physical_address_postal_code: string;
  mailing_address_line1?: string | null;
  mailing_address_line2?: string | null;
  mailing_address_city?: string | null;
  mailing_address_state?: string | null;
  mailing_address_postal_code?: string | null;
  gate_combo?: string | null;
  notes?: string | null;
};

type ClientConflictRow = {
  id: string;
  name: string;
  client_number: string;
  physical_address_line1: string;
  physical_address_city: string;
  physical_address_state: string;
};

type InventoryRow = {
  id: string;
  name: string;
  category?: string | null;
  quantity_on_hand: number;
  unit: string;
  reorder_threshold: number;
  reorder_amount?: number | null;
  notes?: string | null;
  reserved_quantity: number;
};

type WorkOrderRow = {
  id: string;
  client_name: string;
  client_number: string;
  status: string;
  scheduled_date?: string | null;
  gate_combo?: string | null;
  notes?: string | null;
  mileage?: number | null;
  town?: string | null;
  telephone?: string | null;
  physical_address_line1?: string | null;
  physical_address_city?: string | null;
  physical_address_state?: string | null;
  physical_address_postal_code?: string | null;
  wood_size_label?: string | null;
  wood_size_other?: string | null;
  delivery_size_label?: string | null;
  delivery_size_cords?: number | null;
  assignees_json?: string | null;
  created_by_display?: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  telephone?: string | null;
  role: Role;
  availability_notes?: string | null;
  driver_license_status?: string | null;
  vehicle?: string | null;
};

type DeliveryEventRow = {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date?: string | null;
  work_order_id?: string | null;
  color_code?: string | null;
  assigned_user_ids_json?: string | null;
};

type MotdRow = {
  id: string;
  message: string;
  active_from?: string | null;
  active_to?: string | null;
  created_at: string;
};

const buildClientNumber = (first: string, last: string) => {
  const clean = (value: string) => value.replace(/[^A-Za-z]/g, "").toUpperCase();
  const f = clean(first);
  const l = clean(last);
  if (!f || !l) return "";
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const rand = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${l}-${f}-${mm}${yy}-${rand}`;
};

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value.trim();
};

const isValidPhone = (value: string) => /^\(\d{3}\) \d{3}-\d{4}$/.test(value);
const normalizeState = (value: string) => value.trim().toUpperCase();
const isValidState = (value: string) => /^[A-Z]{2}$/.test(value);
const normalizePostal = (value: string) => value.trim();
const isValidPostal = (value: string) => /^\d{5}(?:-\d{4})?$/.test(value);
const initCapCity = (value: string) =>
  value
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

function LoginCard({
  onLogin,
}: {
  onLogin: (session: UserSession) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [motdItems, setMotdItems] = useState<MotdRow[]>([]);
  const isMounted = useRef(true);

  const resolveRole = (input: string): Role => {
    const normalized = input.trim().toLowerCase();
    if (normalized === "admin") return "admin";
    if (normalized === "lead") return "lead";
    if (normalized === "staff") return "staff";
    if (normalized === "driver") return "driver";
    if (normalized === "volunteer") return "volunteer";
    // Default demo role if unknown
    return "staff";
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const items = await invoke<MotdRow[]>("list_motd", { active_only: true });
        // Backend returns newest first, but ensure ordering just in case.
        items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        if (isMounted.current) {
          setMotdItems(items);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Placeholder auth: accept any email/password and create a session immediately.
    const normalized = username.trim().toUpperCase();
    const sampleName = normalized || "USER";
    const role: Role = resolveRole(username);
    onLogin({
      name: sampleName,
      username: normalized,
      role,
      hipaaCertified: role === "admin" || role === "lead",
    });
    if (isMounted.current) {
      setSubmitting(false);
    }
  };

  return (
    <section className="card login-card">
      <div className="badge">Login</div>
      <h3>Welcome back</h3>
      <p className="subtitle">
        Access the Firewood Bank console to manage clients, orders, and
        inventory.
      </p>
      <div className="badge" style={{ marginBottom: 8 }}>
        Demo accounts: admin/admin, lead/lead, staff/staff, driver/driver, volunteer/volunteer
      </div>
      {motdItems.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="list-head">
            <strong>Notes (newest first)</strong>
          </div>
          <div className="stack" style={{ gap: 6, maxHeight: 160, overflowY: "auto" }}>
            {motdItems.map((m) => (
              <div key={m.id} className="muted" style={{ borderBottom: "1px solid #eee", paddingBottom: 4 }}>
                {m.message}
              </div>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="two-up">
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            required
            placeholder="KH-1207"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="login-actions" style={{ gridColumn: "1 / -1" }}>
          <button className="ping" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              setUsername("");
              setPassword("");
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryEventRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [workOrderError, setWorkOrderError] = useState<string | null>(null);
  const [progressEdits, setProgressEdits] = useState<Record<string, { status: string; mileage: string }>>({});
  const [selectedWorker, setSelectedWorker] = useState<UserRow | null>(null);

  const [clientForm, setClientForm] = useState({
    client_number: "",
    first_name: "",
    last_name: "",
    date_of_onboarding: new Date().toISOString().slice(0, 10),
    physical_address_line1: "",
    physical_address_city: "",
    physical_address_state: "",
    physical_address_postal_code: "",
    telephone: "",
    email: "",
    approval_status: "pending",
    gate_combo: "",
    notes: "",
  });

  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    category: "",
    quantity_on_hand: 0,
    unit: "pcs",
    reorder_threshold: 0,
    reorder_amount: 0,
    notes: "",
  });

  const [workOrderForm, setWorkOrderForm] = useState({
    client_id: "",
    scheduled_date: "",
    status: "scheduled",
    directions: "",
    gate_combo: "",
    notes: "",
    other_heat_source_gas: false,
    other_heat_source_electric: false,
    other_heat_source_other: "",
    mileage: "",
    mailingSameAsPhysical: true,
    assignees: [] as string[],
    helpers: [] as string[],
    wood_size_label: "16",
    wood_size_other: "",
    delivery_size_choice: "1_cord",
    delivery_size_other: "",
  });

  const [workOrderNewClientEnabled, setWorkOrderNewClientEnabled] = useState(false);
  const [workOrderNewClient, setWorkOrderNewClient] = useState({
    client_number: "",
    first_name: "",
    last_name: "",
    date_of_onboarding: new Date().toISOString().slice(0, 10),
    physical_address_line1: "",
    physical_address_city: "",
    physical_address_state: "",
    physical_address_postal_code: "",
    telephone: "",
    email: "",
  });

  const [deliveryForm, setDeliveryForm] = useState({
    title: "",
    description: "",
    event_type: "delivery",
    work_order_id: "",
    start_date: "",
    end_date: "",
    color_code: "#e67f1e",
  });

  const handlePing = async () => {
    try {
      setPinging(true);
      const response = await invoke<string>("ping");
      setPingResult(response);
    } catch (error) {
      setPingResult("Ping failed");
      console.error(error);
    } finally {
      setPinging(false);
    }
  };

  const loadClients = async () => {
    const data = await invoke<ClientRow[]>("list_clients", {
      role: session?.role ?? null,
      username: session?.username ?? null,
      hipaa_certified: session?.hipaaCertified ?? false,
    });
    setClients(data);
  };

  const loadInventory = async () => {
    const data = await invoke<InventoryRow[]>("list_inventory_items");
    setInventory(data);
  };

  const loadWorkOrders = async () => {
    const data = await invoke<WorkOrderRow[]>("list_work_orders", {
      role: session?.role ?? null,
      username: session?.username ?? null,
      hipaa_certified: session?.hipaaCertified ?? false,
    });
    setWorkOrders(data);
    const nextProgress: Record<string, { status: string; mileage: string }> = {};
    data.forEach((wo) => {
      nextProgress[wo.id] = { status: wo.status ?? "scheduled", mileage: wo.mileage != null ? String(wo.mileage) : "" };
    });
    setProgressEdits(nextProgress);
  };

  const loadDeliveries = async () => {
    const data = await invoke<DeliveryEventRow[]>("list_delivery_events", {
      role: session?.role ?? null,
      username: session?.username ?? null,
      hipaa_certified: session?.hipaaCertified ?? false,
    });
    setDeliveries(data);
  };

  const loadUsers = async () => {
    const data = await invoke<UserRow[]>("list_users");
    setUsers(data);
  };

  const loadAll = async () => {
    setBusy(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (session?.role === "admin" || session?.role === "lead" || session?.role === "staff") {
        tasks.push(loadClients(), loadInventory(), loadUsers());
      }
      tasks.push(loadWorkOrders(), loadDeliveries());
      await Promise.all(tasks);
    } finally {
      setBusy(false);
    }
  };

  const canManage = session?.role === "admin" || session?.role === "lead";
  const canCreateWorkOrders = session?.role === "admin" || session?.role === "staff";
  const canViewPII = session?.role === "admin" || (session?.role === "lead" && session.hipaaCertified);
  const canViewClientPII = canViewPII || session?.role === "driver";
  const visibleTabs = useMemo(() => {
      if (!session) return tabs.filter((t) => t !== "Worker Directory");
      if (session.role === "volunteer" || session.role === "driver") return ["Dashboard", "Work Orders"];
      if (session.role === "staff") return ["Dashboard", "Clients", "Inventory", "Work Orders", "Metrics"];
      // admin / lead
      return tabs;
    }, [session]);

  useEffect(() => {
    if (session) {
      loadAll();
    }
  }, [session]);

  const initials = useMemo(() => {
    if (!session?.name) return "FB";
    const parts = session.name.split(" ").filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }, [session]);

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
        const deliverySize = d.work_order_id
          ? deliverySizeByWorkOrder[d.work_order_id]
          : undefined;
        if (typeof miles === "number" && miles >= 0) {
          totalHours += Math.max(0.1, miles * milesPerHourFactor);
        } else {
          totalHours += defaultHours;
        }
        totalWoodCords += typeof deliverySize === "number" && deliverySize > 0 ? deliverySize : 0.33;
      }
    });
    return { hours: totalHours, deliveries: totalDeliveries, woodCreditCords: totalWoodCords };
  }, [deliveries, workOrders, session?.username, session?.name]);

  return (
    <div className="app">
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
          <button className="ping" onClick={handlePing} disabled={pinging}>
            {pinging ? "Pinging..." : "Ping Tauri"}
          </button>
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

      {session ? (
        <>
    <Nav tabs={visibleTabs} activeTab={activeTab} onSelect={setActiveTab} />

          <main className="main">
            <section className="card">
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {activeTab}
                {busy && <span className="badge">Loading…</span>}
              </h2>
              {activeTab === "Dashboard" && (
                <div>
                  <div className="hero">
                    <h2>Community warmth at a glance</h2>
                    <p>Ops metrics and scheduling will live here.</p>
                  </div>
                  <div className="two-up">
                    <div className="card">
                      <h3>Upcoming deliveries</h3>
                      <p>Delivery/Workday calendar will show here.</p>
                      <ul className="list">
                        {deliveries.slice(0, 3).map((d) => (
                          <li key={d.id}>
                            <strong>{d.title}</strong> • {d.event_type} • {d.start_date}
                          </li>
                        ))}
                        {!deliveries.length && <li>No deliveries yet</li>}
                      </ul>
                    </div>
                    <div className="card">
                      <h3>Low inventory</h3>
                      <p>Threshold alerts will appear here.</p>
                      <ul className="list">
                        {inventory
                          .filter((item) => item.quantity_on_hand <= item.reorder_threshold)
                          .slice(0, 3)
                          .map((item) => (
                            <li key={item.id}>
                              <strong>{item.name}</strong> • {item.quantity_on_hand} {item.unit} on
                              hand
                            </li>
                          ))}
                        {!inventory.filter((i) => i.quantity_on_hand <= i.reorder_threshold).length && (
                          <li>All inventory above threshold</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  {(session?.role === "volunteer" || session?.role === "driver") && (
                    <div className="two-up" style={{ marginTop: 12 }}>
                      <div className="card muted">
                        <h3>Your {session.role === "driver" ? "driver" : "volunteer"} stats</h3>
                        <div className="stack">
                          <div className="list-head">
                            <span>Deliveries</span>
                            <strong>{userDeliveryHours.deliveries}</strong>
                          </div>
                          <div className="list-head">
                            <span>Hours (from assigned deliveries)</span>
                            <strong>{userDeliveryHours.hours.toFixed(1)} h</strong>
                          </div>
                          <div className="list-head">
                            <span>Wood credit (est.)</span>
                            <strong>{userDeliveryHours.woodCreditCords.toFixed(1)} cords</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Clients" && (
                <div className="stack">
                  <div className="card muted">
                    <div className="add-header">
                      <button
                        type="button"
                        className="icon-button"
                        title="Start new client (Onboard)"
                        disabled={!canManage}
                        onClick={() => {
                          if (showClientForm) {
                            setShowClientForm(false);
                            setClientError(null);
                          } else {
                            setClientForm({
                              client_number: "",
                              first_name: "",
                              last_name: "",
                              date_of_onboarding: new Date().toISOString().slice(0, 10),
                              physical_address_line1: "",
                              physical_address_city: "",
                              physical_address_state: "",
                              physical_address_postal_code: "",
                              telephone: "",
                              email: "",
                              approval_status: "pending",
                              gate_combo: "",
                              notes: "",
                            });
                            setClientError(null);
                            setShowClientForm(true);
                          }
                        }}
                      >
                        +
                      </button>
                      <h3>New client (Onboard)</h3>
                    </div>
                    {!canManage && <p className="muted">Only leads or admins can add clients.</p>}
                    {showClientForm ? (
                      <>
                        {clientError && <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e" }}>{clientError}</div>}
                        <form
                      className="form-grid"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setClientError(null);
                        setBusy(true);
                        try {
                          const fullName = `${clientForm.first_name.trim()} ${clientForm.last_name.trim()}`.trim();
                          const conflicts = await invoke<ClientConflictRow[]>("check_client_conflict", {
                            name: fullName,
                          });
                          const conflictAtOtherAddress = conflicts.some((c) => {
                            const sameAddress =
                              c.physical_address_line1.toLowerCase() === clientForm.physical_address_line1.toLowerCase() &&
                              c.physical_address_city.toLowerCase() === clientForm.physical_address_city.toLowerCase() &&
                              c.physical_address_state.toLowerCase() === clientForm.physical_address_state.toLowerCase();
                            return !sameAddress;
                          });
                          if (conflictAtOtherAddress) {
                            setClientError("Name already exists at a different address. Confirm this is not a duplicate household member.");
                            return;
                          }

                          const generatedNumber =
                            clientForm.client_number || buildClientNumber(clientForm.first_name, clientForm.last_name);
                          if (!generatedNumber) {
                            setClientError("Client number could not be generated. Add first and last name.");
                            return;
                          }
                          const normalizedState = normalizeState(clientForm.physical_address_state);
                          if (!isValidState(normalizedState)) {
                            setClientError("State must be two letters (e.g., VT).");
                            return;
                          }
                          const normalizedPostal = normalizePostal(clientForm.physical_address_postal_code);
                          if (!isValidPostal(normalizedPostal)) {
                            setClientError("Postal code must be 5 digits or 5+4 (##### or #####-####).");
                            return;
                          }
                          const normalizedCity = initCapCity(clientForm.physical_address_city);
                          const normalizedPhone = clientForm.telephone ? normalizePhone(clientForm.telephone) : "";
                          if (normalizedPhone && !isValidPhone(normalizedPhone)) {
                            setClientError("Phone must use (###) ###-#### format.");
                            return;
                          }
                          const trimmedEmail = clientForm.email.trim();
                          if (!normalizedPhone && !trimmedEmail) {
                            setClientError("Provide at least one contact method (phone or email).");
                            return;
                          }
                          if (!clientForm.date_of_onboarding) {
                            setClientError("Onboarding date is required.");
                            return;
                          }

                          await invoke("create_client", {
                            input: {
                              ...clientForm,
                              client_number: generatedNumber,
                              name: fullName,
                              date_of_onboarding: `${clientForm.date_of_onboarding}T00:00:00`,
                              physical_address_line2: null,
                              physical_address_city: normalizedCity,
                              physical_address_state: normalizedState,
                              physical_address_postal_code: normalizedPostal,
                              mailing_address_line1: null,
                              mailing_address_line2: null,
                              mailing_address_city: null,
                              mailing_address_state: null,
                              mailing_address_postal_code: null,
                              how_did_they_hear_about_us: null,
                              referring_agency: null,
                              denial_reason: null,
                              telephone: normalizedPhone || null,
                              email: trimmedEmail || null,
                              gate_combo: clientForm.gate_combo || null,
                              notes: clientForm.notes || null,
                              created_by_user_id: null,
                            },
                          });
                          await loadClients();
                          setClientForm({
                            client_number: "",
                            first_name: "",
                            last_name: "",
                            date_of_onboarding: new Date().toISOString().slice(0, 10),
                            physical_address_line1: "",
                            physical_address_city: "",
                            physical_address_state: "",
                            physical_address_postal_code: "",
                            telephone: "",
                            email: "",
                            approval_status: "pending",
                            gate_combo: "",
                            notes: "",
                          });
                          setShowClientForm(false);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <label>
                        Client #
                        <input
                          required
                              readOnly
                          value={clientForm.client_number}
                        />
                      </label>
                      <label>
                        First name
                        <input
                          required
                          value={clientForm.first_name}
                              onChange={(e) =>
                                setClientForm((prev) => ({
                                  ...prev,
                                  first_name: e.target.value,
                                  client_number: buildClientNumber(e.target.value, prev.last_name),
                                }))
                              }
                        />
                      </label>
                      <label>
                        Last name
                        <input
                          required
                          value={clientForm.last_name}
                              onChange={(e) =>
                                setClientForm((prev) => ({
                                  ...prev,
                                  last_name: e.target.value,
                                  client_number: buildClientNumber(prev.first_name, e.target.value),
                                }))
                              }
                        />
                      </label>
                          <label>
                            Onboarding date
                            <input
                              type="date"
                              required
                              value={clientForm.date_of_onboarding}
                              onChange={(e) => setClientForm({ ...clientForm, date_of_onboarding: e.target.value })}
                            />
                          </label>
                      <label>
                        Telephone
                        <input
                          value={clientForm.telephone}
                              onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })}
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
                          value={clientForm.email}
                          onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                        />
                      </label>
                      <label>
                        Address line 1
                        <input
                          required
                          value={clientForm.physical_address_line1}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, physical_address_line1: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        City
                        <input
                          required
                          value={clientForm.physical_address_city}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, physical_address_city: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        State
                        <input
                          required
                          value={clientForm.physical_address_state}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, physical_address_state: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Postal code
                        <input
                          required
                          value={clientForm.physical_address_postal_code}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, physical_address_postal_code: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Gate combo
                        <input
                          value={clientForm.gate_combo}
                          onChange={(e) => setClientForm({ ...clientForm, gate_combo: e.target.value })}
                        />
                      </label>
                      <label>
                        Approval status
                        <select
                          value={clientForm.approval_status}
                          onChange={(e) => setClientForm({ ...clientForm, approval_status: e.target.value })}
                        >
                          <option value="approved">approved</option>
                          <option value="denied">denied</option>
                          <option value="pending">pending</option>
                        </select>
                      </label>
                      <label className="span-2">
                        Notes
                        <textarea
                          value={clientForm.notes}
                          onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                          rows={2}
                        />
                      </label>
                      <div className="actions span-2">
                            <button className="ping" type="submit" disabled={busy || !canManage}>
                          Save client
                        </button>
                        <button
                          className="ghost"
                          type="button"
                          onClick={() => {
                            setShowClientForm(false);
                            setClientError(null);
                          }}
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

                  {session?.role === "driver" && (
                    <div className="list-card">
                      <div className="list-head">
                        <h3>My deliveries</h3>
                        <button className="ghost" onClick={() => { loadDeliveries(); loadWorkOrders(); }} disabled={busy}>
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
                                  : false
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
                            {!mine.length && <div className="table-row">No assigned deliveries.</div>}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="list-card">
                    <div className="list-head">
                      <h3>Clients ({clients.length})</h3>
                      <button className="ghost" onClick={loadClients} disabled={busy}>
                        Refresh
                      </button>
                    </div>
                    <div className="table">
                      <div className="table-head">
                        <span>Name</span>
                        <span>Contact</span>
                        <span>Approval</span>
                        <span>Address</span>
                      </div>
                      {clients.map((c) => (
                        <div className="table-row" key={c.id}>
                          <div>
                            <strong>{c.name}</strong>
                            <div className="muted">#{c.client_number}</div>
                          </div>
                          <div>
                            <div>{canViewClientPII ? c.email ?? "n/a" : "Hidden (HIPAA)"}</div>
                            <div className="muted">
                              {canViewClientPII ? c.telephone ?? "—" : "Hidden (HIPAA)"}
                            </div>
                          </div>
                          <div>
                            <span className="pill">{c.approval_status}</span>
                          </div>
                          <div>
                            {canViewClientPII
                              ? (
                                <>
                                  {c.physical_address_line1}, {c.physical_address_city}, {c.physical_address_state}{" "}
                                  {c.physical_address_postal_code}
                                  {c.gate_combo ? <div className="muted">Gate: {c.gate_combo}</div> : null}
                                </>
                                )
                              : "Hidden (HIPAA)"}
                          </div>
                        </div>
                      ))}
                      {!clients.length && <div className="table-row">No clients yet.</div>}
                    </div>
                  </div>

                  <div className="list-card">
                    <div className="list-head">
                      <h3>Mailer list</h3>
                      <span className="muted">{clients.length} households</span>
                    </div>
                    {canViewClientPII ? (
                      <div className="table">
                        <div className="table-head">
                          <span>Address</span>
                          <span>Email</span>
                          <span>Name</span>
                        </div>
                        {clients.map((c) => (
                          <div className="table-row" key={`mailer-${c.id}`}>
                            <div>
                              {c.physical_address_line1}, {c.physical_address_city}, {c.physical_address_state}{" "}
                              {c.physical_address_postal_code}
                            </div>
                            <div className="muted">{c.email ?? "n/a"}</div>
                            <div>{c.name}</div>
                          </div>
                        ))}
                        {!clients.length && <div className="table-row">No mailer entries yet.</div>}
                      </div>
                    ) : (
                      <p className="muted">PII hidden. Admins and HIPAA-certified leads can view mailer list.</p>
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
                            setShowInventoryForm(false);
                          } else {
                            setInventoryForm({
                              name: "",
                              category: "",
                              quantity_on_hand: 0,
                              unit: "pcs",
                              reorder_threshold: 0,
                              reorder_amount: 0,
                              notes: "",
                            });
                            setShowInventoryForm(true);
                          }
                        }}
                      >
                        +
                      </button>
                      <h3>Add inventory item</h3>
                    </div>
                    {!canManage && <p className="muted">Only leads or admins can add inventory.</p>}
                    {showInventoryForm ? (
                      <form
                        className="form-grid"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setBusy(true);
                          try {
                            await invoke("create_inventory_item", {
                              input: {
                                ...inventoryForm,
                                quantity_on_hand: Number(inventoryForm.quantity_on_hand),
                                reorder_threshold: Number(inventoryForm.reorder_threshold),
                                reorder_amount: inventoryForm.reorder_amount
                                  ? Number(inventoryForm.reorder_amount)
                                  : null,
                                created_by_user_id: null,
                              },
                            });
                            await loadInventory();
                            setInventoryForm({
                              name: "",
                              category: "",
                              quantity_on_hand: 0,
                              unit: "pcs",
                              reorder_threshold: 0,
                              reorder_amount: 0,
                              notes: "",
                            });
                            setShowInventoryForm(false);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <label>
                          Name
                          <input
                            required
                            value={inventoryForm.name}
                            onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                          />
                        </label>
                        <label>
                          Category
                          <input
                            value={inventoryForm.category}
                            onChange={(e) => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                          />
                        </label>
                        <label>
                          Qty on hand
                          <input
                            type="number"
                            value={inventoryForm.quantity_on_hand}
                            onChange={(e) =>
                              setInventoryForm({ ...inventoryForm, quantity_on_hand: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          Unit
                          <input
                            value={inventoryForm.unit}
                            onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                          />
                        </label>
                        <label>
                          Reorder threshold
                          <input
                            type="number"
                            value={inventoryForm.reorder_threshold}
                            onChange={(e) =>
                              setInventoryForm({ ...inventoryForm, reorder_threshold: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label>
                          Reorder amount
                          <input
                            type="number"
                            value={inventoryForm.reorder_amount}
                            onChange={(e) =>
                              setInventoryForm({ ...inventoryForm, reorder_amount: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="span-2">
                          Notes
                          <textarea
                            value={inventoryForm.notes}
                            onChange={(e) => setInventoryForm({ ...inventoryForm, notes: e.target.value })}
                            rows={2}
                          />
                        </label>
                        <div className="actions span-2">
                          <button className="ping" type="submit" disabled={busy || !canManage}>
                            Save item
                          </button>
                          <button
                            className="ghost"
                            type="button"
                            onClick={() => setShowInventoryForm(false)}
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
                      <h3>Inventory ({inventory.length})</h3>
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
                      </div>
                      {inventory.map((item) => {
                        const low = item.quantity_on_hand <= item.reorder_threshold;
                        return (
                          <div className={`table-row ${low ? "warn" : ""}`} key={item.id}>
                            <div>
                              <strong>{item.name}</strong>
                              <div className="muted">{item.category ?? "—"}</div>
                            </div>
                            <div>
                            {item.quantity_on_hand} {item.unit}
                            {item.reserved_quantity > 0 && (
                              <div className="muted">Reserved: {item.reserved_quantity} {item.unit}</div>
                            )}
                            </div>
                            <div>{item.reorder_threshold}</div>
                            <div className="muted">{item.notes ?? "—"}</div>
                          </div>
                        );
                      })}
                      {!inventory.length && <div className="table-row">No inventory yet.</div>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Work Orders" && (
                <div className="stack">
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
                              scheduled_date: "",
                              status: "scheduled",
                              directions: "",
                              gate_combo: "",
                              notes: "",
                              other_heat_source_gas: false,
                              other_heat_source_electric: false,
                              other_heat_source_other: "",
                              mileage: "",
                              mailingSameAsPhysical: true,
                              assignees: [],
                              helpers: [],
                              wood_size_label: "16",
                              wood_size_other: "",
                              delivery_size_choice: "1_cord",
                              delivery_size_other: "",
                            });
                            setWorkOrderNewClientEnabled(false);
                            setWorkOrderNewClient({
                              client_number: "",
                              first_name: "",
                              last_name: "",
                              date_of_onboarding: new Date().toISOString().slice(0, 10),
                              physical_address_line1: "",
                              physical_address_city: "",
                              physical_address_state: "",
                              physical_address_postal_code: "",
                              telephone: "",
                              email: "",
                            });
                            setWorkOrderError(null);
                            setShowWorkOrderForm(true);
                          }
                        }}
                      >
                        +
                      </button>
                      <h3>Schedule work order</h3>
                    </div>
                    {!canCreateWorkOrders && <p className="muted">Only staff or admins can add work orders.</p>}
                    {showWorkOrderForm ? (
                      <>
                        {workOrderError && <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e" }}>{workOrderError}</div>}
                        <form
                          className="form-grid"
                          onSubmit={async (e) => {
                        e.preventDefault();
                        setWorkOrderError(null);
                        const mileageValue = workOrderForm.mileage === "" ? null : Number(workOrderForm.mileage);
                        if (mileageValue !== null && Number.isNaN(mileageValue)) {
                          setWorkOrderError("Mileage must be a number.");
                          return;
                        }
                        const statusNeedsDriver = ["scheduled", "in_progress", "completed"].includes(
                          workOrderForm.status,
                        );
                        if (statusNeedsDriver && workOrderForm.assignees.length === 0) {
                          setWorkOrderError("Assign at least one available driver for scheduled or in-progress work.");
                          return;
                        }
                        if (statusNeedsDriver && !workOrderForm.scheduled_date) {
                          setWorkOrderError("Pick a scheduled date/time when assigning a driver.");
                          return;
                        }
                        if (!workOrderForm.scheduled_date) {
                          setWorkOrderError("Scheduled date/time is required.");
                          return;
                        }
                        if (workOrderForm.scheduled_date && workOrderForm.assignees.length > 0) {
                          const scheduledDay = (() => {
                            try {
                              const d = new Date(workOrderForm.scheduled_date);
                              return d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
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
                        let targetClient = clients.find((c) => c.id === workOrderForm.client_id) || null;
                        if (!targetClient && !workOrderNewClientEnabled) {
                          setWorkOrderError("Work orders require a client. Select or create a client first.");
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
                            !nc.client_number ||
                            !nc.date_of_onboarding ||
                            !nc.physical_address_line1 ||
                            !nc.physical_address_city ||
                            !nc.physical_address_state
                          ) {
                            setWorkOrderError("Please fill first/last name, client #, onboarding date, and address for the new client.");
                            return;
                          }
                          const ncState = normalizeState(nc.physical_address_state);
                          if (!isValidState(ncState)) {
                            setWorkOrderError("New client state must be two letters.");
                            return;
                          }
                          const ncPostal = normalizePostal(nc.physical_address_postal_code);
                          if (ncPostal && !isValidPostal(ncPostal)) {
                            setWorkOrderError("New client postal code must be 5 digits or 5+4.");
                            return;
                          }
                          const ncCity = initCapCity(nc.physical_address_city);
                          const ncPhone = nc.telephone ? normalizePhone(nc.telephone) : "";
                          if (ncPhone && !isValidPhone(ncPhone)) {
                            setWorkOrderError("New client phone must be (###) ###-####.");
                            return;
                          }
                          const ncEmail = nc.email.trim();
                          if (!ncPhone && !ncEmail) {
                            setWorkOrderError("Provide at least one contact (phone/email) for the new client.");
                            return;
                          }
                          const ncDate = nc.date_of_onboarding;
                          if (!ncDate) {
                            setWorkOrderError("New client onboarding date is required.");
                            return;
                          }
                          const fullName = `${nc.first_name.trim()} ${nc.last_name.trim()}`.trim();
                          const conflicts = await invoke<ClientConflictRow[]>("check_client_conflict", {
                            name: fullName,
                          });
                          const conflictAtOtherAddress = conflicts.some((c) => {
                            const sameAddress =
                              c.physical_address_line1.toLowerCase() === nc.physical_address_line1.toLowerCase() &&
                              c.physical_address_city.toLowerCase() === nc.physical_address_city.toLowerCase() &&
                              c.physical_address_state.toLowerCase() === nc.physical_address_state.toLowerCase();
                            return !sameAddress;
                          });
                          if (conflictAtOtherAddress) {
                            setWorkOrderError("Name already exists at a different address. Verify before creating.");
                            return;
                          }

                          const newClientId = await invoke<string>("create_client", {
                            input: {
                              client_number: nc.client_number,
                              client_title: null,
                              name: fullName,
                              physical_address_line1: nc.physical_address_line1,
                              physical_address_line2: null,
                              physical_address_city: ncCity,
                              physical_address_state: ncState,
                              physical_address_postal_code: ncPostal,
                              date_of_onboarding: `${ncDate}T00:00:00`,
                              mailing_address_line1: null,
                              mailing_address_line2: null,
                              mailing_address_city: null,
                              mailing_address_state: null,
                              mailing_address_postal_code: null,
                              telephone: ncPhone || null,
                              email: ncEmail || null,
                              how_did_they_hear_about_us: null,
                              referring_agency: null,
                              approval_status: "pending",
                              denial_reason: null,
                              gate_combo: null,
                              notes: null,
                              created_by_user_id: null,
                            },
                          });
                          await loadClients();
                          targetClient = {
                            id: newClientId,
                              name: fullName,
                            client_number: nc.client_number,
                            client_title: null,
                            email: nc.email || null,
                            telephone: nc.telephone || null,
                            approval_status: "pending",
                            physical_address_line1: nc.physical_address_line1,
                            physical_address_line2: null,
                            physical_address_city: nc.physical_address_city,
                            physical_address_state: nc.physical_address_state,
                            physical_address_postal_code: nc.physical_address_postal_code || "",
                            mailing_address_line1: null,
                            mailing_address_line2: null,
                            mailing_address_city: null,
                            mailing_address_state: null,
                            mailing_address_postal_code: null,
                            gate_combo: null,
                            notes: null,
                          };
                        }

                        if (!targetClient) {
                          setWorkOrderError("Select a client or create a new one for this work order.");
                          return;
                        }

                        if (!canCreateWorkOrders) {
                          setWorkOrderError("Only staff or admin can create work orders.");
                          return;
                        }

                        const deliveryChoice = workOrderForm.delivery_size_choice;
                        let deliverySizeCords = 0;
                        let deliverySizeLabel = "";
                        if (deliveryChoice === "1_cord") {
                          deliverySizeCords = 1;
                          deliverySizeLabel = "1 cord";
                        } else if (deliveryChoice === "one_third") {
                          deliverySizeCords = 0.33;
                          deliverySizeLabel = "1/3 cord";
                        } else {
                          const parsed = Number(workOrderForm.delivery_size_other);
                          if (!Number.isFinite(parsed) || parsed <= 0) {
                            setWorkOrderError("Enter a valid delivery size (cords).");
                            return;
                          }
                          deliverySizeCords = parsed;
                          deliverySizeLabel = `${parsed} cord(s)`;
                        }

                        const woodSizeLabel =
                          workOrderForm.wood_size_label === "other"
                            ? "Other"
                            : workOrderForm.wood_size_label;
                        const woodSizeOther =
                          workOrderForm.wood_size_label === "other" ? workOrderForm.wood_size_other : "";

                        setBusy(true);
                        try {
                          await invoke("create_work_order", {
                            input: {
                              client_id: targetClient.id,
                              client_number: targetClient.client_number,
                              client_title: null,
                              client_name: targetClient.name,
                              physical_address_line1: targetClient.physical_address_line1,
                              physical_address_line2: targetClient.physical_address_line2,
                              physical_address_city: targetClient.physical_address_city,
                              physical_address_state: targetClient.physical_address_state,
                              physical_address_postal_code: targetClient.physical_address_postal_code,
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
                              mailing_address_postal_code: workOrderForm.mailingSameAsPhysical
                                ? targetClient.physical_address_postal_code
                                : targetClient.mailing_address_postal_code,
                              telephone: targetClient.telephone,
                              email: targetClient.email,
                              directions: workOrderForm.directions || null,
                              gate_combo: workOrderForm.gate_combo || targetClient.gate_combo,
                          mileage: mileageValue,
                              other_heat_source_gas: workOrderForm.other_heat_source_gas,
                              other_heat_source_electric: workOrderForm.other_heat_source_electric,
                              other_heat_source_other: workOrderForm.other_heat_source_other || null,
                              notes: workOrderForm.notes || null,
                              scheduled_date: workOrderForm.scheduled_date || null,
                              status: workOrderForm.status,
                              wood_size_label: woodSizeLabel,
                              wood_size_other: woodSizeOther || null,
                              delivery_size_label: deliverySizeLabel,
                              delivery_size_cords: deliverySizeCords,
                              assignees_json: JSON.stringify([
                                ...workOrderForm.assignees,
                                ...workOrderForm.helpers
                                  .map((h) => h.trim())
                                  .filter((h) => h.length > 0),
                              ]),
                              created_by_user_id: null,
                              created_by_display: session?.name ?? session?.username ?? null,
                            },
                            role: session?.role ?? null,
                          });
                          await loadWorkOrders();
                          setWorkOrderForm({
                            client_id: "",
                            scheduled_date: "",
                            status: "scheduled",
                            directions: "",
                            gate_combo: "",
                            notes: "",
                            other_heat_source_gas: false,
                            other_heat_source_electric: false,
                            other_heat_source_other: "",
                            mileage: "",
                            mailingSameAsPhysical: true,
                            assignees: [],
                            helpers: [],
                            wood_size_label: "16",
                            wood_size_other: "",
                            delivery_size_choice: "1_cord",
                            delivery_size_other: "",
                          });
                          setWorkOrderNewClient({
                            client_number: "",
                            first_name: "",
                            last_name: "",
                            date_of_onboarding: new Date().toISOString().slice(0, 10),
                            physical_address_line1: "",
                            physical_address_city: "",
                            physical_address_state: "",
                            physical_address_postal_code: "",
                            telephone: "",
                            email: "",
                          });
                          setShowWorkOrderForm(false);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <label className="span-2">
                        Client
                        <select
                          required
                          value={workOrderForm.client_id}
                          onChange={(e) => setWorkOrderForm({ ...workOrderForm, client_id: e.target.value })}
                        >
                          <option value="">Select client</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} — #{c.client_number}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Wood size
                        <select
                          value={workOrderForm.wood_size_label}
                          onChange={(e) => setWorkOrderForm({ ...workOrderForm, wood_size_label: e.target.value })}
                        >
                          <option value="12">12 in</option>
                          <option value="14">14 in</option>
                          <option value="16">16 in</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      {workOrderForm.wood_size_label === "other" && (
                        <label>
                          Wood size (other, inches)
                          <input
                            type="number"
                            min="1"
                            value={workOrderForm.wood_size_other}
                            onChange={(e) => setWorkOrderForm({ ...workOrderForm, wood_size_other: e.target.value })}
                          />
                        </label>
                      )}
                      <label>
                        Delivery size
                        <select
                          value={workOrderForm.delivery_size_choice}
                          onChange={(e) => setWorkOrderForm({ ...workOrderForm, delivery_size_choice: e.target.value })}
                        >
                          <option value="1_cord">1 cord</option>
                          <option value="one_third">1/3 cord</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      {workOrderForm.delivery_size_choice === "other" && (
                        <label>
                          Delivery size (cords)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={workOrderForm.delivery_size_other}
                            onChange={(e) =>
                              setWorkOrderForm({
                                ...workOrderForm,
                                delivery_size_other: e.target.value,
                              })
                            }
                          />
                        </label>
                      )}
                      <label className="span-2">
                        Assign driver(s)
                        <select
                          multiple
                          value={workOrderForm.assignees}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                            setWorkOrderForm({ ...workOrderForm, assignees: selected });
                          }}
                        >
                          {users
                            .filter((u) => u.role === "driver" && !!u.driver_license_status)
                            .map((u) => (
                              <option key={u.id} value={u.name}>
                                {u.name} {u.vehicle ? `• ${u.vehicle}` : ""} {u.availability_notes ? `• ${u.availability_notes}` : ""}
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
                      <label className="checkbox span-2">
                        <input
                          type="checkbox"
                          checked={workOrderNewClientEnabled}
                          onChange={(e) => setWorkOrderNewClientEnabled(e.target.checked)}
                        />
                        Create a new client for this work order (if not listed)
                      </label>
                      {workOrderNewClientEnabled && (
                        <>
                          <label>
                            New client #
                            <input
                              required
                              readOnly
                              value={workOrderNewClient.client_number}
                              onChange={(e) =>
                                setWorkOrderNewClient({ ...workOrderNewClient, client_number: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            First name
                            <input
                              required
                              value={workOrderNewClient.first_name}
                              onChange={(e) =>
                                setWorkOrderNewClient((prev) => ({
                                  ...prev,
                                  first_name: e.target.value,
                                  client_number: buildClientNumber(e.target.value, prev.last_name),
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
                                  client_number: buildClientNumber(prev.first_name, e.target.value),
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
                                setWorkOrderNewClient({ ...workOrderNewClient, physical_address_line1: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            City
                            <input
                              required
                              value={workOrderNewClient.physical_address_city}
                              onChange={(e) =>
                                setWorkOrderNewClient({ ...workOrderNewClient, physical_address_city: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            State
                            <input
                              required
                              value={workOrderNewClient.physical_address_state}
                              onChange={(e) =>
                                setWorkOrderNewClient({ ...workOrderNewClient, physical_address_state: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Postal code
                            <input
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
                            Telephone
                            <input
                              value={workOrderNewClient.telephone}
                              onChange={(e) =>
                                setWorkOrderNewClient({ ...workOrderNewClient, telephone: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Email
                            <input
                              type="email"
                              value={workOrderNewClient.email}
                              onChange={(e) =>
                                setWorkOrderNewClient({ ...workOrderNewClient, email: e.target.value })
                              }
                            />
                          </label>
                        </>
                      )}
                      <label>
                        Scheduled date/time
                        <input
                          type="datetime-local"
                          value={workOrderForm.scheduled_date}
                          onChange={(e) => setWorkOrderForm({ ...workOrderForm, scheduled_date: e.target.value })}
                        />
                      </label>
                      <label>
                        Status
                        <select
                          value={workOrderForm.status}
                          onChange={(e) => setWorkOrderForm({ ...workOrderForm, status: e.target.value })}
                        >
                          <option value="draft">draft</option>
                          <option value="scheduled">scheduled</option>
                          <option value="in_progress">in_progress</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </label>
                      <label>
                        Mileage (required if status = completed)
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={workOrderForm.mileage}
                          onChange={(e) => setWorkOrderForm({ ...workOrderForm, mileage: e.target.value })}
                        />
                      </label>
                      <label className="span-2">
                        Directions
                        <textarea
                          rows={2}
                          value={workOrderForm.directions}
                          onChange={(e) => setWorkOrderForm({ ...workOrderForm, directions: e.target.value })}
                        />
                      </label>
                      <label>
                        Gate combo
                        <input
                          value={workOrderForm.gate_combo}
                          onChange={(e) => setWorkOrderForm({ ...workOrderForm, gate_combo: e.target.value })}
                        />
                      </label>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={workOrderForm.mailingSameAsPhysical}
                          onChange={(e) =>
                            setWorkOrderForm({ ...workOrderForm, mailingSameAsPhysical: e.target.checked })
                          }
                        />
                        Mailing same as physical
                      </label>
                      <label>
                        Notes
                        <textarea
                          rows={2}
                          value={workOrderForm.notes}
                          onChange={(e) => setWorkOrderForm({ ...workOrderForm, notes: e.target.value })}
                        />
                      </label>
                      <div className="span-2">
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={workOrderForm.other_heat_source_gas}
                            onChange={(e) =>
                              setWorkOrderForm({ ...workOrderForm, other_heat_source_gas: e.target.checked })
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
                            setWorkOrderForm({ ...workOrderForm, other_heat_source_other: e.target.value })
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
                            (!workOrderNewClientEnabled && !clients.length)
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
                        </form>
                      </>
                    ) : (
                      <p className="muted">Press + to schedule a work order.</p>
                    )}
                  </div>

                  <div className="list-card">
                    <div className="list-head">
                      <h3>Work orders ({workOrders.length})</h3>
                      <button className="ghost" onClick={loadWorkOrders} disabled={busy}>
                        Refresh
                      </button>
                    </div>
                    {(() => {
                      const visibleOrders =
                        session?.role === "volunteer"
                          ? workOrders.filter((wo) => {
                              const arr = (() => {
                                try {
                                  return JSON.parse(wo.assignees_json ?? "[]");
                                } catch {
                                  return [];
                                }
                              })();
                              return session?.username
                                ? Array.isArray(arr) && arr.includes(session.username)
                                : false;
                            })
                          : workOrders;
                      const showPII = canViewPII;
                      return (
                        <div className="table">
                          <div className="table-head">
                            {session?.role === "volunteer" ? (
                              <>
                                <span>Town</span>
                                <span>Status</span>
                                <span>Scheduled</span>
                                <span>Mileage</span>
                              </>
                          ) : session?.role === "driver" ? (
                              <>
                                <span>Client</span>
                                <span>Status</span>
                                <span>Scheduled</span>
                                <span>Contact</span>
                              </>
                            ) : (
                              <>
                                <span>Client</span>
                                <span>Status</span>
                                <span>Scheduled</span>
                                <span>Notes</span>
                              </>
                            )}
                          </div>
                          {visibleOrders.map((wo) => (
                            <div className="table-row" key={wo.id}>
                              {session?.role === "volunteer" ? (
                                <>
                                  <div>
                                    <strong>{wo.town ?? (wo as any)?.physical_address_city ?? "—"}</strong>
                                  </div>
                                  <div>
                                    <span className="pill">{wo.status}</span>
                                  </div>
                                  <div>{wo.scheduled_date ?? "—"}</div>
                                  <div className="muted">{wo.mileage != null ? `${wo.mileage} mi` : "—"}</div>
                                </>
                              ) : session?.role === "driver" ? (
                                  <>
                                    <div>
                                      <strong>{wo.client_name}</strong>
                                      <div className="muted">
                                        {wo.physical_address_line1
                                          ? `${wo.physical_address_line1}, ${wo.physical_address_city ?? ""}, ${wo.physical_address_state ?? ""} ${wo.physical_address_postal_code ?? ""}`
                                          : "—"}
                                      </div>
                                      {wo.delivery_size_label && (
                                        <div className="muted">Delivery: {wo.delivery_size_label}</div>
                                      )}
                                    </div>
                                    <div>
                                      <span className="pill">{wo.status}</span>
                                    </div>
                                    <div>{wo.scheduled_date ?? "—"}</div>
                                    <div className="muted">{wo.telephone ?? "—"}</div>
                                  </>
                              ) : (
                                <>
                                  <div>
                                    <strong>{wo.client_name}</strong>
                                    <div className="muted">#{wo.client_number}</div>
                                {wo.created_by_display && <div className="muted">Created by: {wo.created_by_display}</div>}
                                {wo.delivery_size_label && (
                                  <div className="muted">Delivery: {wo.delivery_size_label}</div>
                                )}
                                  </div>
                                  <div>
                                    <span className="pill">{wo.status}</span>
                                  </div>
                                  <div>{wo.scheduled_date ?? "—"}</div>
                                  <div className="muted">{showPII ? wo.notes ?? "—" : "PII hidden"}</div>
                                </>
                              )}
                              {(session?.role === "driver" || session?.role === "lead" || session?.role === "admin") && (
                                <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={progressEdits[wo.id]?.mileage ?? ""}
                                      onChange={(e) =>
                                        setProgressEdits({
                                          ...progressEdits,
                                          [wo.id]: {
                                            status: progressEdits[wo.id]?.status ?? wo.status,
                                            mileage: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="Mileage"
                                      style={{ width: 100 }}
                                    />
                                    {(session?.role === "lead" || session?.role === "admin") && (
                                      <select
                                        value={progressEdits[wo.id]?.status ?? wo.status}
                                        onChange={(e) =>
                                          setProgressEdits({
                                            ...progressEdits,
                                            [wo.id]: {
                                              status: e.target.value,
                                              mileage: progressEdits[wo.id]?.mileage ?? "",
                                            },
                                          })
                                        }
                                      >
                                        <option value="draft">draft</option>
                                        <option value="scheduled">scheduled</option>
                                        <option value="in_progress">in_progress</option>
                                        <option value="completed">completed</option>
                                        <option value="cancelled">cancelled</option>
                                      </select>
                                    )}
                                    <button
                                      className="ghost"
                                      type="button"
                                      disabled={busy}
                                      onClick={async () => {
                                        const edit = progressEdits[wo.id] ?? { status: wo.status, mileage: "" };
                                        if ((session?.role === "lead" || session?.role === "admin") && edit.status === "completed" && edit.mileage === "") {
                                          setWorkOrderError("Mileage is required to mark completed.");
                                          return;
                                        }
                                        setBusy(true);
                                        try {
                                          await invoke("update_work_order_status", {
                                            input: {
                                              work_order_id: wo.id,
                                              status: session?.role === "lead" || session?.role === "admin" ? edit.status : "in_progress",
                                              mileage: edit.mileage === "" ? null : Number(edit.mileage),
                                            },
                                        role: session?.role ?? null,
                                          });
                                          await loadWorkOrders();
                                        } finally {
                                          setBusy(false);
                                        }
                                      }}
                                    >
                                      Save status/mileage
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {!visibleOrders.length && (
                            <div className="table-row">
                              {session?.role === "volunteer"
                                ? "No assigned work orders."
                                : "No work orders yet."}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeTab === "Metrics" && (
                <div className="stack">
                  <div className="card muted">
                    <h3>Operational metrics</h3>
                    <p className="muted">
                      Snapshot of miles, clients served, and cords moved. Hook to real delivery/work logs to power these numbers.
                    </p>
                    {(() => {
                      const miles = 0; // placeholder until mileage tracking is added
                      const clientsServed = clients.length;
                      const estimateAmount = (ev: DeliveryEventRow) => {
                        const title = (ev.title || "").toLowerCase();
                        if (title.includes("1/3") || title.includes("third")) return 0.33;
                        if (title.includes("cord")) return 1;
                        return 0.25;
                      };
                      const totalCords = deliveries.reduce((sum, d) => sum + estimateAmount(d), 0);
                      const categories = {
                        "1/3 cord": deliveries.filter((d) => estimateAmount(d) === 0.33).length,
                        "1 cord": deliveries.filter((d) => estimateAmount(d) === 1).length,
                        Other: deliveries.filter((d) => ![0.33, 1].includes(estimateAmount(d))).length,
                      };
                      const maxCat = Math.max(1, ...Object.values(categories));
                      return (
                        <>
                          <div className="two-up">
                            <div className="list-card">
                              <div className="list-head">
                                <h3>Miles traveled</h3>
                                <span className="pill">needs tracking</span>
                              </div>
                              <p style={{ fontSize: 24, margin: 0 }}>{miles} mi</p>
                            </div>
                            <div className="list-card">
                              <div className="list-head">
                                <h3>Clients served</h3>
                              </div>
                              <p style={{ fontSize: 24, margin: 0 }}>{clientsServed}</p>
                            </div>
                          </div>

                          <div className="list-card">
                            <div className="list-head">
                              <h3>Wood moved</h3>
                              <span className="muted">est. cords</span>
                            </div>
                            <p style={{ fontSize: 24, margin: "0 0 8px" }}>{totalCords.toFixed(2)} cords</p>
                            <div className="stack" style={{ gap: 6 }}>
                              {Object.entries(categories).map(([label, count]) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ minWidth: 90 }}>{label}</div>
                                  <div
                                    style={{
                                      flex: 1,
                                      height: 10,
                                      borderRadius: 999,
                                      background: "#f1e6d7",
                                      position: "relative",
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: `${(count / maxCat) * 100}%`,
                                        background: "linear-gradient(90deg, #2d6b3d, #e67f1e)",
                                        borderRadius: 999,
                                      }}
                                    />
                                  </div>
                                  <div style={{ width: 32, textAlign: "right" }}>{count}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="card">
                    <h3>People & availability (placeholder)</h3>
                    <p className="muted">
                      Track volunteer/employee/lead/admin availability (Mon–Fri, morning/evening) and working vehicle status. Hook this to the upcoming Users module.
                    </p>
                    <div className="table">
                      <div className="table-head">
                        <span>Name</span>
                        <span>Role</span>
                        <span>Availability</span>
                        <span>Vehicle</span>
                      </div>
                      <div className="table-row">
                        <div className="muted">No users yet</div>
                        <div />
                        <div />
                        <div />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Worker Directory" && session && (session.role === "admin" || session.role === "lead") && (
                <div className="stack">
                  <div className="list-card">
                    <div className="list-head">
                      <h3>Workers & Drivers ({users.length})</h3>
                      <button className="ghost" onClick={loadUsers} disabled={busy}>
                        Refresh
                      </button>
                    </div>
                    <div className="table">
                      <div className="table-head">
                        <span>Name</span>
                        <span>Phone</span>
                        <span>Schedule</span>
                        <span>Credentials</span>
                      </div>
                      {users.map((u) => (
                        <div
                          className="table-row"
                          key={u.id}
                          onDoubleClick={() => setSelectedWorker(u)}
                          style={{ cursor: "pointer" }}
                        >
                          <div>
                            <strong>{u.name}</strong>
                            <div className="muted">{u.role}</div>
                          </div>
                          <div className="muted">{u.telephone ?? "—"}</div>
                          <div className="muted">{u.availability_notes ?? "—"}</div>
                          <div className="muted">
                            DL: {u.driver_license_status ?? "—"} | Vehicle: {u.vehicle ?? "—"} | HIPAA: unknown
                          </div>
                        </div>
                      ))}
                      {!users.length && <div className="table-row">No workers yet.</div>}
                    </div>
                  </div>

                  {selectedWorker && (
                    <div className="card">
                      <div className="list-head">
                        <h3>{selectedWorker.name}</h3>
                        <button className="ghost" onClick={() => setSelectedWorker(null)}>
                          Close
                        </button>
                      </div>
                      <div className="stack">
                        <div><strong>Role:</strong> {selectedWorker.role}</div>
                        <div><strong>Phone:</strong> {selectedWorker.telephone ?? "—"}</div>
                        <div><strong>Email:</strong> {selectedWorker.email ?? "—"}</div>
                        <div><strong>Schedule:</strong> {selectedWorker.availability_notes ?? "—"}</div>
                        <div><strong>Driver License:</strong> {selectedWorker.driver_license_status ?? "—"}</div>
                        <div><strong>Working Vehicle:</strong> {selectedWorker.vehicle ?? "—"}</div>
                        <div><strong>HIPAA Certified:</strong> unknown</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="card">
              <h3>Bridge Test</h3>
              <p>Click “Ping Tauri” to call the Rust command.</p>
              <div className="ping-result">
                Result: {pingResult ?? "not called yet"}
              </div>
            </section>
          </main>
        </>
      ) : (
        <main className="main">
          <section className="card">
            <div className="hero">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div className="brand-mark big">
                  <img
                    src={firewoodIcon}
                    alt="Firewood Bank"
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                </div>
                <div>
                  <h2>Welcome to Firewood Bank</h2>
                  <p>
                    Sign in to manage clients, work orders, inventory, and invoices.
                  </p>
                </div>
              </div>
            </div>
            <div className="two-up">
              <div className="card" style={{ background: "#fdf7ed" }}>
                <h3>Mission</h3>
                <p className="subtitle">
                  Community-powered warmth, honoring the brand feel from
                  NM-ERA.
                </p>
              </div>
              <div className="card" style={{ background: "#f9f2e5" }}>
                <h3>What you’ll see</h3>
                <p className="subtitle">
                  Dashboard, Clients, Inventory, plus a Rust↔React bridge test.
                </p>
              </div>
            </div>
            <div
              className="card"
              style={{
                marginTop: 12,
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              <h3>Revision checklist (what to verify per stage)</h3>
              <ul className="list">
                <li><strong>Stage 1</strong>: App boots (Tauri window), nav buttons present, Ping returns “pong”.</li>
                <li><strong>Stage 2</strong>: DB connects, client/inventory CRUD commands work (no migration errors).</li>
                <li><strong>Stage 3</strong>: Client onboard form saves; duplicate-name-at-different-address warning fires.</li>
                <li><strong>Stage 4</strong>: Inventory list shows thresholds; can add items; low-stock rows highlighted.</li>
                <li><strong>Stage 5</strong>: Work orders create against clients; scheduled orders auto-create delivery events.</li>
                <li><strong>Stage 5.1</strong>: Role gating enforced; PII masked for non-HIPAA; driver/volunteer only see assigned; mileage required on completion; status edits role-checked.</li>
                <li><strong>Stage 5.2</strong>: Intake hardening pending—expect name split, client # auto-gen, validation, wood/delivery size (track when delivered).</li>
                <li><strong>Stage 5.3</strong>: Worker Directory tab visible only to admin/lead; rows open detail on double-click.</li>
              </ul>
              <p className="muted" style={{ marginTop: 8 }}>
                This panel will also host a scrolling MOTD feed later; new messages will appear on top and push prior notes down.
              </p>
            </div>
          </section>
          <LoginCard onLogin={setSession} />
        </main>
      )}
    </div>
  );
}

export default App;

