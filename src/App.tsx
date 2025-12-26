import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Nav from "./components/Nav";
import logo from "./assets/logo.png";
import firewoodIcon from "../firewoodBank-icon.png";

const tabs = ["Dashboard", "Clients", "Inventory", "Work Orders", "Metrics"];

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
  assignees_json?: string | null;
};

type DeliveryEventRow = {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date?: string | null;
  work_order_id?: string | null;
  color_code?: string | null;
};

function LoginCard({
  onLogin,
}: {
  onLogin: (session: UserSession) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [hipaaCertified, setHipaaCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Placeholder auth: accept any email/password and create a session immediately.
    const normalized = username.trim().toUpperCase();
    const sampleName = normalized || "USER";
    onLogin({
      name: sampleName,
      username: normalized,
      role,
      hipaaCertified: role === "lead" ? hipaaCertified : role === "admin",
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
        Sample logins: admin/sketch:Sketching2! (HIPAA), admin/admin, lead/lead, staff/staff, volunteer/volunteer
      </div>
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
        <div className="field">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => {
              const next = e.target.value as Role;
              setRole(next);
              if (next !== "lead") setHipaaCertified(next === "admin");
            }}
          >
            <option value="admin">Admin</option>
            <option value="lead">Lead</option>
            <option value="staff">Staff</option>
            <option value="driver">Driver</option>
            <option value="volunteer">Volunteer</option>
          </select>
        </div>
        {role === "lead" && (
          <div className="field">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={hipaaCertified}
                onChange={(e) => setHipaaCertified(e.target.checked)}
              />
              HIPAA certified
            </label>
          </div>
        )}
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
              setRole("admin");
              setHipaaCertified(false);
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
  const [busy, setBusy] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [workOrderError, setWorkOrderError] = useState<string | null>(null);

  const [clientForm, setClientForm] = useState({
    client_number: "",
    name: "",
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
  });

  const [workOrderNewClientEnabled, setWorkOrderNewClientEnabled] = useState(false);
  const [workOrderNewClient, setWorkOrderNewClient] = useState({
    client_number: "",
    name: "",
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
    const data = await invoke<ClientRow[]>("list_clients");
    setClients(data);
  };

  const loadInventory = async () => {
    const data = await invoke<InventoryRow[]>("list_inventory_items");
    setInventory(data);
  };

  const loadWorkOrders = async () => {
    const data = await invoke<WorkOrderRow[]>("list_work_orders");
    setWorkOrders(data);
  };

  const loadDeliveries = async () => {
    const data = await invoke<DeliveryEventRow[]>("list_delivery_events");
    setDeliveries(data);
  };

  const loadAll = async () => {
    setBusy(true);
    try {
      await Promise.all([loadClients(), loadInventory(), loadWorkOrders(), loadDeliveries()]);
    } finally {
      setBusy(false);
    }
  };

  const canManage = session?.role === "admin" || session?.role === "lead";
  const canViewPII = session?.role === "admin" || (session?.role === "lead" && session.hipaaCertified);
  const canViewClientPII = canViewPII || session?.role === "driver";
  const visibleTabs = useMemo(() => {
    if (!session) return tabs;
    if (session.role === "volunteer" || session.role === "driver") return ["Dashboard", "Work Orders"];
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
                  {session?.role === "volunteer" && (
                    <div className="two-up" style={{ marginTop: 12 }}>
                      <div className="card muted">
                        <h3>Your volunteer stats</h3>
                        {(() => {
                          const volunteerHours = 0; // placeholder
                          const driverHours = 0; // placeholder
                          const woodCreditCords = Math.round(((volunteerHours * 31) / 450) * 10) / 10;
                          return (
                            <div className="stack">
                              <div className="list-head">
                                <span>Hours</span>
                                <strong>{volunteerHours.toFixed(1)} h</strong>
                              </div>
                              <div className="list-head">
                                <span>Driver hours</span>
                                <strong>{driverHours.toFixed(1)} h</strong>
                              </div>
                              <div className="list-head">
                                <span>Wood credit</span>
                                <strong>{woodCreditCords.toFixed(1)} cords</strong>
                              </div>
                            </div>
                          );
                        })()}
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
                              name: "",
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
                          const conflicts = await invoke<ClientConflictRow[]>("check_client_conflict", {
                            name: clientForm.name,
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

                          await invoke("create_client", {
                            input: {
                              ...clientForm,
                              physical_address_line2: null,
                              mailing_address_line1: null,
                              mailing_address_line2: null,
                              mailing_address_city: null,
                              mailing_address_state: null,
                              mailing_address_postal_code: null,
                              date_of_onboarding: null,
                              how_did_they_hear_about_us: null,
                              referring_agency: null,
                              denial_reason: null,
                              created_by_user_id: null,
                            },
                          });
                          await loadClients();
                          setClientForm({
                            client_number: "",
                            name: "",
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
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <label>
                        Client #
                        <input
                          required
                          value={clientForm.client_number}
                          onChange={(e) => setClientForm({ ...clientForm, client_number: e.target.value })}
                        />
                      </label>
                      <label>
                        Full name
                        <input
                          required
                          value={clientForm.name}
                          onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                        />
                      </label>
                      <label>
                        Telephone
                        <input
                          value={clientForm.telephone}
                          onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })}
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
                        disabled={!canManage}
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
                            });
                            setWorkOrderNewClientEnabled(false);
                            setWorkOrderNewClient({
                              client_number: "",
                              name: "",
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
                    {!canManage && <p className="muted">Only leads or admins can add work orders.</p>}
                    {showWorkOrderForm ? (
                      <>
                        {workOrderError && <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e" }}>{workOrderError}</div>}
                        <form
                          className="form-grid"
                          onSubmit={async (e) => {
                        e.preventDefault();
                        setWorkOrderError(null);
                        let targetClient = clients.find((c) => c.id === workOrderForm.client_id) || null;
                        if (!targetClient && !workOrderNewClientEnabled) {
                          setWorkOrderError("Work orders require a client. Select or create a client first.");
                          return;
                        }
                        if (workOrderForm.status === "completed" && !workOrderForm.mileage) {
                          setWorkOrderError("Mileage is required to close an order.");
                          return;
                        }
                        // Optional: create a new client inline for this work order.
                        if (!targetClient && workOrderNewClientEnabled) {
                          const nc = workOrderNewClient;
                          if (!nc.name || !nc.client_number || !nc.physical_address_line1 || !nc.physical_address_city || !nc.physical_address_state) {
                            setWorkOrderError("Please fill name, client #, and address for the new client.");
                            return;
                          }
                          const conflicts = await invoke<ClientConflictRow[]>("check_client_conflict", {
                            name: nc.name,
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
                              name: nc.name,
                              physical_address_line1: nc.physical_address_line1,
                              physical_address_line2: null,
                              physical_address_city: nc.physical_address_city,
                              physical_address_state: nc.physical_address_state,
                              physical_address_postal_code: nc.physical_address_postal_code,
                              mailing_address_line1: null,
                              mailing_address_line2: null,
                              mailing_address_city: null,
                              mailing_address_state: null,
                              mailing_address_postal_code: null,
                              telephone: nc.telephone,
                              email: nc.email,
                              date_of_onboarding: null,
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
                            name: nc.name,
                            client_number: nc.client_number,
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
                          mileage: workOrderForm.mileage ? Number(workOrderForm.mileage) : null,
                              other_heat_source_gas: workOrderForm.other_heat_source_gas,
                              other_heat_source_electric: workOrderForm.other_heat_source_electric,
                              other_heat_source_other: workOrderForm.other_heat_source_other || null,
                              notes: workOrderForm.notes || null,
                              scheduled_date: workOrderForm.scheduled_date || null,
                              status: workOrderForm.status,
                              created_by_user_id: null,
                            },
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
                          });
                          setWorkOrderNewClient({
                            client_number: "",
                            name: "",
                            physical_address_line1: "",
                            physical_address_city: "",
                            physical_address_state: "",
                            physical_address_postal_code: "",
                            telephone: "",
                            email: "",
                          });
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
                              value={workOrderNewClient.client_number}
                              onChange={(e) =>
                                setWorkOrderNewClient({ ...workOrderNewClient, client_number: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            New client name
                            <input
                              required
                              value={workOrderNewClient.name}
                              onChange={(e) => setWorkOrderNewClient({ ...workOrderNewClient, name: e.target.value })}
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
                        <button className="ping" type="submit" disabled={busy || !clients.length || !canManage}>
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
                              return Array.isArray(arr) && session?.username ? arr.includes(session.username) : false;
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
                                  </div>
                                  <div>
                                    <span className="pill">{wo.status}</span>
                                  </div>
                                  <div>{wo.scheduled_date ?? "—"}</div>
                                  <div className="muted">{showPII ? wo.notes ?? "—" : "PII hidden"}</div>
                                </>
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
          </section>
          <LoginCard onLogin={setSession} />
        </main>
      )}
    </div>
  );
}

export default App;

