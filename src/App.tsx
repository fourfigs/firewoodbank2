import React, { useEffect, useRef, useState } from "react";

import { invokeTauri } from "./api/tauri";
import Nav from "./components/Nav";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import ChangeRequestModal from "./components/ChangeRequestModal";
import ReportsTab from "./components/ReportsTab";
import firewoodIcon from "./assets/logo.png";
import "./index.css";
import {
  ClientRow,
  DeliveryEventRow,
  InventoryRow,
  LoginResponse,
  MotdRow,
  UserRow,
  UserSession,
  WorkOrderRow,
} from "./types";
import { Clients, Inventory, WorkOrders, WorkerDirectory } from "./pages";

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

function LoginCard({ onLogin }: { onLogin: (session: UserSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const isMounted = useRef(true);

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

  // Basic state for Clients functionality
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryEventRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [motdItems, setMotdItems] = useState<MotdRow[]>([]);

  // Clients-specific state
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [mailingListSidebarOpen, setMailingListSidebarOpen] = useState(false);
  const [mailingListFilter, setMailingListFilter] = useState<string>("all");
  const [clientDetailSidebarOpen, setClientDetailSidebarOpen] = useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<ClientRow | null>(null);
  const [clientSortField, setClientSortField] = useState<string>("first_name");
  const [clientSortDirection, setClientSortDirection] = useState<"asc" | "desc">("asc");

  // Inventory-specific state
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Work order-specific state
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderRow | null>(null);
  const [workOrderDetailOpen, setWorkOrderDetailOpen] = useState(false);
  const [workOrderEditMode, setWorkOrderEditMode] = useState(false);
  const [workOrderEditForm, setWorkOrderEditForm] = useState({
    scheduled_date: "",
    status: "",
    assignees: [] as string[],
    mileage: "",
    notes: "",
  });
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
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
  const [newWorkOrderId, setNewWorkOrderId] = useState<string>("");
  const [newWorkOrderEntryDate, setNewWorkOrderEntryDate] = useState<string>("");
  const [workOrderError, setWorkOrderError] = useState<string | null>(null);

  // Worker directory state
  const [selectedWorker, setSelectedWorker] = useState<UserRow | null>(null);
  const [workerEdit, setWorkerEdit] = useState<Partial<UserRow> | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Modal states
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Client form state
  const [clientForm, setClientForm] = useState({
    first_name: "",
    last_name: "",
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
    how_did_they_hear_about_us: "",
    referring_agency: "",
    gate_combo: "",
    notes: "",
    approval_status: "pending",
    denial_reason: "",
  });

  // Inventory form state
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    category: "",
    customCategory: "",
    quantity_on_hand: 0,
    unit: "pcs",
    reorder_threshold: 0,
    reorder_amount: 0,
    notes: "",
  });

  useEffect(() => {
    console.log("App mounted");
  }, []);

  // Basic data loading
  const loadClients = async () => {
    if (!session) return;
    const data = await invokeTauri<ClientRow[]>("list_clients", {
      role: session?.role ?? null,
      username: session?.username ?? null,
      hipaa_certified: session?.hipaaCertified ?? false,
      is_driver: session?.isDriver ?? false,
    });
    setClients(data);
  };

  const loadMotd = async () => {
    try {
      const items = await invokeTauri<MotdRow[]>("list_motd", { active_only: true });
      items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      setMotdItems(items);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (session) {
      loadClients();
      loadInventory();
      loadWorkOrders();
      // Load other data as needed
    } else {
      loadMotd();
    }
  }, [session]);

  // Basic user hours calculation
  const userDeliveryHours = { hours: 0, deliveries: 0, woodCreditCords: 0 };

  // Tab visibility logic
  const visibleTabs = session ? tabs : tabs.filter((t) => t !== "Worker Directory" && t !== "Reports");

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
                    onWorkerSelect={() => {}} // Placeholder
                  />
                )}

                {activeTab === "Clients" && session && (
                  <Clients
                    session={session}
                    clients={clients}
                    busy={busy}
                    mailingListSidebarOpen={mailingListSidebarOpen}
                    setMailingListSidebarOpen={setMailingListSidebarOpen}
                    mailingListFilter={mailingListFilter}
                    setMailingListFilter={setMailingListFilter}
                    clientDetailSidebarOpen={clientDetailSidebarOpen}
                    setClientDetailSidebarOpen={setClientDetailSidebarOpen}
                    selectedClientForDetail={selectedClientForDetail}
                    setSelectedClientForDetail={setSelectedClientForDetail}
                    clientSearch={clientSearch}
                    setClientSearch={setClientSearch}
                    clientSortField={clientSortField}
                    setClientSortField={setClientSortField}
                    clientSortDirection={clientSortDirection}
                    setClientSortDirection={setClientSortDirection}
                    showClientForm={showClientForm}
                    setShowClientForm={setShowClientForm}
                    editingClientId={editingClientId}
                    setEditingClientId={setEditingClientId}
                    clientError={clientError}
                    setClientError={setClientError}
                    clientForm={clientForm}
                    setClientForm={setClientForm}
                  />
                )}

                {activeTab === "Inventory" && session && (
                  <Inventory
                    session={session}
                    inventory={inventory}
                    busy={busy}
                    showInventoryForm={showInventoryForm}
                    setShowInventoryForm={setShowInventoryForm}
                    editingInventoryId={editingInventoryId}
                    setEditingInventoryId={setEditingInventoryId}
                    inventoryError={inventoryError}
                    setInventoryError={setInventoryError}
                    inventoryForm={inventoryForm}
                    setInventoryForm={setInventoryForm}
                    loadInventory={loadInventory}
                  />
                )}

                {activeTab === "Work Orders" && session && (
                  <WorkOrders
                    session={session}
                    workOrders={workOrders}
                    users={users}
                    clients={clients}
                    busy={busy}
                    selectedWorkOrder={selectedWorkOrder}
                    setSelectedWorkOrder={setSelectedWorkOrder}
                    workOrderDetailOpen={workOrderDetailOpen}
                    setWorkOrderDetailOpen={setWorkOrderDetailOpen}
                    workOrderEditMode={workOrderEditMode}
                    setWorkOrderEditMode={setWorkOrderEditMode}
                    workOrderEditForm={workOrderEditForm}
                    setWorkOrderEditForm={setWorkOrderEditForm}
                    showWorkOrderForm={showWorkOrderForm}
                    setShowWorkOrderForm={setShowWorkOrderForm}
                    workOrderNewClientEnabled={workOrderNewClientEnabled}
                    setWorkOrderNewClientEnabled={setWorkOrderNewClientEnabled}
                    workOrderNewClient={workOrderNewClient}
                    setWorkOrderNewClient={setWorkOrderNewClient}
                    newWorkOrderId={newWorkOrderId}
                    setNewWorkOrderId={setNewWorkOrderId}
                    newWorkOrderEntryDate={newWorkOrderEntryDate}
                    setNewWorkOrderEntryDate={setNewWorkOrderEntryDate}
                    workOrderError={workOrderError}
                    setWorkOrderError={setWorkOrderError}
                    loadWorkOrders={loadWorkOrders}
                  />
                )}

                {activeTab === "Metrics" && (
                  <div className="stack">
                    <div className="card muted">
                      <div className="add-header">
                        <h3>Metrics Dashboard</h3>
                        <p>Coming soon - extracted to src/pages/Metrics.tsx</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "Worker Directory" && session && (
                  <WorkerDirectory
                    session={session}
                    users={users}
                    busy={busy}
                    selectedWorker={selectedWorker}
                    setSelectedWorker={setSelectedWorker}
                    workerEdit={workerEdit}
                    setWorkerEdit={setWorkerEdit}
                    workerError={workerError}
                    setWorkerError={setWorkerError}
                    showWorkerForm={showWorkerForm}
                    setShowWorkerForm={setShowWorkerForm}
                    loadUsers={loadUsers}
                  />
                )}

                {activeTab === "Reports" && session && <ReportsTab session={session} />}

                {activeTab === "Admin" && session && <AdminPanel session={session} />}
              </div>
            </section>
          </main>
        </>
      ) : (
        <LoginCard onLogin={setSession} />
      )}

      {/* Modals */}
      {showChangeRequestModal && (
        <ChangeRequestModal
          session={session}
          onClose={() => setShowChangeRequestModal(false)}
        />
      )}

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button
                className="ghost"
                onClick={() => setShowPasswordModal(false)}
                style={{ padding: "0.25rem 0.5rem" }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Password change functionality coming soon...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;