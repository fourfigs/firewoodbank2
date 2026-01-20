import React, { useMemo, useState } from "react";

// Types mirrored from App.tsx (ideally these should be in a shared types file)
type InventoryRow = {
  id: string;
  name: string;
  category?: string | null;
  quantity_on_hand: number;
  unit: string;
  reorder_threshold: number;
  reorder_amount?: number | null;
  reserved_quantity: number;
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
  created_at: string;
};

type UserRow = {
  id: string;
  name: string;
  role: string;
  telephone?: string | null;
  availability_schedule?: string | null;
};

type UserSession = {
  name: string;
  role: string;
  isDriver?: boolean;
};

type WorkOrderRow = {
  id: string;
  client_name: string;
  status: string;
  scheduled_date?: string | null;
  delivery_size_cords?: number | null;
  pickup_quantity_cords?: number | null;
  pickup_delivery_type?: string | null;
  created_at?: string | null;
};

interface DashboardProps {
  session: UserSession;
  deliveries: DeliveryEventRow[];
  inventory: InventoryRow[];
  motdItems: MotdRow[]; // passed from App.tsx or fetched here? App has them in Login, maybe pass them down or fetch.
  // App.tsx doesn't seem to fetch MOTD for the main app, only for Login.
  // We should ideally fetch them or accept them. I'll accept them as props for now.
  users: UserRow[];
  userDeliveryHours: { hours: number; deliveries: number; woodCreditCords: number };
  workOrders: WorkOrderRow[];
  onWorkerSelect?: (user: UserRow) => void;
}

// Helper to check if a date is today
const isToday = (d: Date) => {
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

// Helper to parse "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
const parseDate = (str: string) => new Date(str);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Dashboard({
  session,
  deliveries,
  inventory,
  motdItems,
  users,
  userDeliveryHours,
  workOrders,
  onWorkerSelect,
}: DashboardProps) {
  const [calendarView, setCalendarView] = useState<"2weeks" | "month">("2weeks");
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- Wood Summary Logic ---
  const woodSummary = useMemo(() => {
    let split = 0;
    let unsplit = 0;
    let hasSplitItem = false;
    let hasUnsplitItem = false;

    inventory.forEach((item) => {
      const name = (item.name || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const unit = (item.unit || "").toLowerCase();
      const qty = item.quantity_on_hand;

      // Check for split firewood
      if (name.includes("split") && (name.includes("firewood") || name.includes("wood")) && !name.includes("unsplit")) {
        split += qty;
        hasSplitItem = true;
      } else if (cat.includes("split") && !cat.includes("unsplit")) {
        split += qty;
        hasSplitItem = true;
      }
      // Check for unsplit/rounds/logs
      else if (name.includes("unsplit") || name.includes("round") || name.includes("log")) {
        unsplit += qty;
        hasUnsplitItem = true;
      } else if (cat.includes("log") || cat.includes("round") || cat.includes("unsplit")) {
        unsplit += qty;
        hasUnsplitItem = true;
      }
      // Also check if it's a wood category with cords unit
      else if (cat === "wood" && unit.includes("cord")) {
        // Default to split if unclear
        split += qty;
        hasSplitItem = true;
      }
    });

    return { split, unsplit, hasSplitItem, hasUnsplitItem };
  }, [inventory]);

  // --- Pending Orders Wood Demand ---
  const pendingOrdersAnalysis = useMemo(() => {
    // Count wood needed for non-completed, non-cancelled orders
    const pendingStatuses = ["received", "pending", "scheduled", "in_progress"];
    const pendingOrders = workOrders.filter((wo) =>
      pendingStatuses.includes((wo.status || "").toLowerCase())
    );

    let totalWoodNeeded = 0;
    pendingOrders.forEach((wo) => {
      const isPickup = (wo.pickup_delivery_type || "").toLowerCase() === "pickup";
      if (isPickup) {
        totalWoodNeeded += wo.pickup_quantity_cords ?? 0;
      } else {
        totalWoodNeeded += wo.delivery_size_cords ?? 0;
      }
    });

    return {
      count: pendingOrders.length,
      totalWoodNeeded,
    };
  }, [workOrders]);

  // --- Unscheduled Orders ---
  const unscheduledOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const status = (wo.status || "").toLowerCase();
      // Not completed, not cancelled, and no scheduled date
      const isActive = !["completed", "cancelled", "picked_up"].includes(status);
      const hasNoSchedule = !wo.scheduled_date;
      return isActive && hasNoSchedule;
    });
  }, [workOrders]);

  // --- Wood Shortage Calculation ---
  const woodShortage = useMemo(() => {
    const available = woodSummary.split;
    const needed = pendingOrdersAnalysis.totalWoodNeeded;
    const shortage = needed - available;
    return {
      isShort: shortage > 0,
      amount: shortage,
      available,
      needed,
    };
  }, [woodSummary.split, pendingOrdersAnalysis.totalWoodNeeded]);

  // --- Calendar Logic ---
  const calendarDays = useMemo(() => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (calendarView === "month") {
      // Full month view
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startDay = firstDayOfMonth.getDay(); // 0-6
      const totalDays = lastDayOfMonth.getDate();

      // Pad start
      for (let i = 0; i < startDay; i++) {
        days.push({ date: null });
      }

      for (let i = 1; i <= totalDays; i++) {
        days.push({ date: new Date(year, month, i) });
      }
    } else {
      // 2 Weeks view (starting from current date or nearest Sunday?)
      // Let's show 14 days starting from Today
      for (let i = 0; i < 14; i++) {
        const d = new Date(currentDate);
        d.setDate(currentDate.getDate() + i);
        days.push({ date: d });
      }
    }
    return days;
  }, [calendarView, currentDate]);

  const getEventsForDate = (date: Date) => {
    // Naive string match on YYYY-MM-DD
    const dateStr = date.toISOString().slice(0, 10);
    return deliveries.filter((d) => d.start_date.startsWith(dateStr));
  };

  // --- Upcoming Deliveries ---
  const upcomingDeliveries = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return deliveries
      .filter((d) => new Date(d.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 5);
  }, [deliveries]);

  // --- Low Inventory ---
  const lowInventory = useMemo(() => {
    return inventory.filter((item) => item.quantity_on_hand <= item.reorder_threshold);
  }, [inventory]);

  // --- Available Staff (Admin only) ---
  const availableStaff = useMemo(() => {
    // Parse availability_schedule (JSON: {monday: bool, ...})
    // Get current day name
    const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

    return users.filter((u) => {
      try {
        if (!u.availability_schedule) return false;
        const schedule = JSON.parse(u.availability_schedule);
        return schedule[dayName] === true;
      } catch {
        return false;
      }
    });
  }, [users]);

  const isAdminOrLead = session.role === "admin" || session.role === "lead";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "2rem" }}>
      {/* Warning if no wood inventory */}
      {!woodSummary.hasSplitItem && (
        <div
          className="card"
          style={{
            background: "#fff3cd",
            borderColor: "#ffc107",
            borderWidth: "2px",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>⚠️</span>
          <div>
            <strong style={{ color: "#856404" }}>No Wood Inventory Found</strong>
            <div style={{ fontSize: "0.9rem", color: "#856404" }}>
              Please add a "Split Firewood" inventory item to track wood stock. 
              Work orders cannot be processed without a wood inventory item.
            </div>
          </div>
        </div>
      )}

      {/* Red warning if orders exceed wood on hand */}
      {woodShortage.isShort && woodSummary.hasSplitItem && (
        <div
          className="card"
          style={{
            background: "#ffebee",
            borderColor: "#e53935",
            borderWidth: "2px",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>🚨</span>
          <div>
            <strong style={{ color: "#c62828" }}>Wood Shortage Warning</strong>
            <div style={{ fontSize: "0.9rem", color: "#c62828" }}>
              Pending orders require <strong>{woodShortage.needed.toFixed(1)} cords</strong> but only{" "}
              <strong>{woodShortage.available.toFixed(1)} cords</strong> available.{" "}
              <strong style={{ color: "#b71c1c" }}>
                Short by {woodShortage.amount.toFixed(1)} cords.
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Hero / Summary Section */}
      <div className="hero">
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <div
            className="card"
            style={{ flex: 1, backgroundColor: "#fff9f0", borderColor: "#fce9cc" }}
          >
            <div className="badge" style={{ background: "#e67f1e", color: "white" }}>
              Split Wood
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem" }}>
              {woodSummary.split.toFixed(1)}{" "}
              <span style={{ fontSize: "1rem", fontWeight: "normal", color: "#666" }}>cords</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#888" }}>Ready for delivery</div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div className="badge">Unsplit / Logs</div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem" }}>
              {woodSummary.unsplit.toFixed(1)}{" "}
              <span style={{ fontSize: "1rem", fontWeight: "normal", color: "#666" }}>cords</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#888" }}>Needs processing</div>
          </div>
          {(session.isDriver || session.role === "volunteer") && (
            <div className="card" style={{ flex: 1, border: "1px dashed #ccc" }}>
              <div className="badge">Your Impacts</div>
              <div className="stack" style={{ marginTop: "0.5rem", gap: "0.25rem" }}>
                <div>
                  <strong>{userDeliveryHours.deliveries}</strong> deliveries
                </div>
                <div>
                  <strong>{userDeliveryHours.hours.toFixed(1)}</strong> hours
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left (Calendar/Upcoming), Right (Admin/MOTD) */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Calendar Section */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3>Schedule</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className={calendarView === "2weeks" ? "ping" : "ghost"}
                  onClick={() => setCalendarView("2weeks")}
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                >
                  2 Weeks
                </button>
                <button
                  className={calendarView === "month" ? "ping" : "ghost"}
                  onClick={() => setCalendarView("month")}
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                >
                  Month
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "4px",
                textAlign: "center",
              }}
            >
              {WEEKDAYS.map((d) => (
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

              {calendarDays.map((day, idx) => {
                if (!day.date) return <div key={idx} style={{ background: "transparent" }} />;

                const events = getEventsForDate(day.date);
                const isTodayFlag = isToday(day.date);

                return (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #eee",
                      minHeight: "80px",
                      background: isTodayFlag ? "#fff9f0" : "white",
                      padding: "4px",
                      borderRadius: "4px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: "0.75rem",
                        fontWeight: isTodayFlag ? "bold" : "normal",
                        color: isTodayFlag ? "#e67f1e" : "#888",
                        marginBottom: "4px",
                      }}
                    >
                      {day.date.getDate()}
                    </div>
                    <div className="stack" style={{ gap: "2px" }}>
                      {events.map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            fontSize: "0.65rem",
                            background: ev.color_code || "#ccc",
                            color: "white",
                            padding: "2px 4px",
                            borderRadius: "3px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textAlign: "left",
                          }}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming List */}
          <div className="card">
            <h3>Upcoming Events</h3>
            <ul className="list">
              {upcomingDeliveries.map((d) => (
                <li key={d.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <strong>{d.title}</strong>
                    <span className="muted" style={{ marginLeft: "0.5rem" }}>
                      {d.event_type}
                    </span>
                  </span>
                  <span>{new Date(d.start_date).toLocaleDateString()}</span>
                </li>
              ))}
              {upcomingDeliveries.length === 0 && (
                <li className="muted">No upcoming events scheduled.</li>
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* MOTD Panel */}
          <div className="card">
            <h3>Notes form the Team</h3>
            <div
              className="stack"
              style={{ maxHeight: "250px", overflowY: "auto", gap: "0.75rem", marginTop: "0.5rem" }}
            >
              {motdItems.length === 0 && <div className="muted">No messages.</div>}
              {motdItems.map((m) => (
                <div key={m.id} style={{ borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.9rem" }}>{m.message}</div>
                  <div style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.25rem" }}>
                    {new Date(m.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin / Lead Widgets */}
          {isAdminOrLead && (
            <>
              <div
                className="card"
                style={{ borderColor: lowInventory.length > 0 ? "#e53935" : "#eee" }}
              >
                <h3 style={{ color: lowInventory.length > 0 ? "#e53935" : "inherit" }}>
                  Low Inventory
                  {lowInventory.length > 0 && (
                    <span
                      className="badge"
                      style={{ backgroundColor: "#e53935", color: "white", marginLeft: "0.5rem" }}
                    >
                      {lowInventory.length}
                    </span>
                  )}
                </h3>
                {lowInventory.length === 0 ? (
                  <div className="muted" style={{ marginTop: "0.5rem" }}>
                    All stock levels good.
                  </div>
                ) : (
                  <ul className="list" style={{ marginTop: "0.5rem" }}>
                    {lowInventory.slice(0, 5).map((item) => (
                      <li key={item.id}>
                        <strong>{item.name}</strong>
                        <div style={{ fontSize: "0.85rem" }}>
                          {item.quantity_on_hand} {item.unit} (Threshold: {item.reorder_threshold})
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card">
                <h3>Staff Available Today</h3>
                <div style={{ marginTop: "0.5rem" }}>
                  {availableStaff.length === 0 && (
                    <div className="muted">No staff scheduled for today.</div>
                  )}
                  {availableStaff.map((u) => {
                    const nameParts = u.name.split(" ");
                    const firstName = nameParts[0] || "";
                    const lastName = nameParts.slice(1).join(" ") || "";
                    return (
                      <div
                        key={u.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem 0",
                          borderBottom: "1px solid #eee",
                          cursor: onWorkerSelect ? "pointer" : "default",
                        }}
                        onDoubleClick={() => onWorkerSelect?.(u)}
                        title={onWorkerSelect ? "Double-click to view/edit profile" : undefined}
                      >
                        <div>
                          <strong>{firstName}</strong>{" "}
                          <span style={{ color: "#666" }}>{lastName}</span>
                          <span className="muted" style={{ marginLeft: "0.5rem" }}>
                            ({u.role})
                          </span>
                        </div>
                        <div style={{ color: "#666", fontSize: "0.9rem" }}>
                          {u.telephone || "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Unscheduled Orders */}
          {unscheduledOrders.length > 0 && (
            <div
              className="card"
              style={{ borderColor: "#ff9800", borderWidth: "2px" }}
            >
              <h3 style={{ color: "#e65100" }}>
                Unscheduled Orders
                <span
                  className="badge"
                  style={{ backgroundColor: "#ff9800", color: "white", marginLeft: "0.5rem" }}
                >
                  {unscheduledOrders.length}
                </span>
              </h3>
              <ul className="list" style={{ marginTop: "0.5rem" }}>
                {unscheduledOrders.slice(0, 8).map((wo) => (
                  <li key={wo.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{wo.client_name}</strong>
                      <div style={{ fontSize: "0.8rem", color: "#666" }}>
                        ID: {wo.id.slice(0, 8)}... • {wo.created_at ? new Date(wo.created_at).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <span
                      className="pill"
                      style={{
                        fontSize: "0.75rem",
                        background: wo.status === "received" ? "#e3f2fd" : "#fff3e0",
                      }}
                    >
                      {wo.status}
                    </span>
                  </li>
                ))}
                {unscheduledOrders.length > 8 && (
                  <li className="muted" style={{ textAlign: "center" }}>
                    +{unscheduledOrders.length - 8} more...
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
