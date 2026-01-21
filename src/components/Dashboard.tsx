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
  onOpenOrderSelect?: (workOrder: WorkOrderRow) => void;
  onCreateScheduleEvent?: (input: {
    title: string;
    description?: string | null;
    event_type: string;
    start_date: string;
    end_date?: string | null;
    color_code?: string | null;
  }) => Promise<void>;
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

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

const DEFAULT_WEEKLY_EVENTS = [
  {
    weekday: 2,
    event_type: "delivery",
    title: "Delivery day",
    color_code: "#e67f1e",
  },
  {
    weekday: 4,
    event_type: "cutting",
    title: "Cutting day",
    color_code: "#2e7d32",
  },
  {
    weekday: 0,
    event_type: "splitting",
    title: "Splitting day",
    color_code: "#1565c0",
  },
];

const DEFAULT_EVENT_COLORS: Record<string, string> = {
  delivery: "#e67f1e",
  cutting: "#2e7d32",
  splitting: "#1565c0",
  hauling: "#6a1b9a",
  other: "#607d8b",
};

const EVENT_ICONS: Record<string, string> = {
  delivery: "🚚",
  cutting: "🪓",
  splitting: "🪵",
  hauling: "🚛",
  other: "📌",
};

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
  onOpenOrderSelect,
  onCreateScheduleEvent,
}: DashboardProps) {
  const [calendarView, setCalendarView] = useState<"2weeks" | "month">("2weeks");
  const [currentDate] = useState(new Date());
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_type: "cutting",
    start_date: "",
    end_date: "",
    color_code: DEFAULT_EVENT_COLORS.cutting,
  });
  const [eventError, setEventError] = useState<string | null>(null);

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

  // --- Open Work Orders (not completed/cancelled) ---
  const openWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const status = (wo.status || "").toLowerCase();
      return !["completed", "cancelled", "picked_up"].includes(status);
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

  const getEventsForDate = React.useCallback((date: Date) => {
    // Naive string match on YYYY-MM-DD
    const dateStr = toDateKey(date);
    const events = deliveries.filter((d) => d.start_date.startsWith(dateStr));
    const weekday = date.getDay();
    const defaults = DEFAULT_WEEKLY_EVENTS.filter((ev) => ev.weekday === weekday).filter(
      (ev) =>
        !events.some((existing) => (existing.event_type || "").toLowerCase() === ev.event_type),
    );
    const defaultEvents = defaults.map((ev) => ({
      id: `default-${dateStr}-${ev.event_type}`,
      title: ev.title,
      event_type: ev.event_type,
      start_date: dateStr,
      end_date: null,
      work_order_id: null,
      color_code: ev.color_code,
      assigned_user_ids_json: "[]",
    }));
    return [...events, ...defaultEvents];
  }, [deliveries]);

  // --- Upcoming Deliveries ---
  const upcomingDeliveries = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 21);
    const days: Date[] = [];
    for (let i = 0; i <= 21; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push(d);
    }
    const combined = days.flatMap((d) => getEventsForDate(d));
    return combined
      .filter((d) => new Date(d.start_date) >= now && new Date(d.start_date) <= horizon)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 5);
  }, [getEventsForDate]);

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
  const canCreateEvents =
    session.role === "admin" || session.role === "staff" || session.role === "employee";
  const handleEventTypeChange = (value: string) => {
    const color = DEFAULT_EVENT_COLORS[value] ?? DEFAULT_EVENT_COLORS.other;
    setEventForm((prev) => ({
      ...prev,
      event_type: value,
      color_code: color,
      title: prev.title || `${value.charAt(0).toUpperCase()}${value.slice(1)} day`,
    }));
  };

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

            {canCreateEvents && (
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  background: "#fafafa",
                }}
              >
                <div className="list-head" style={{ marginBottom: "0.5rem" }}>
                  <h4>Create schedule event</h4>
                </div>
                {eventError && <div style={{ color: "#b91c1c" }}>{eventError}</div>}
                <form
                  style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "1fr 1fr" }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setEventError(null);
                    if (!eventForm.start_date) {
                      setEventError("Pick a date/time for the event.");
                      return;
                    }
                    const title =
                      eventForm.title ||
                      `${eventForm.event_type.charAt(0).toUpperCase()}${eventForm.event_type.slice(1)} day`;
                    if (!onCreateScheduleEvent) {
                      setEventError("Event creation is not available.");
                      return;
                    }
                    try {
                      await onCreateScheduleEvent({
                        title,
                        description: eventForm.description || null,
                        event_type: eventForm.event_type,
                        start_date: eventForm.start_date,
                        end_date: eventForm.end_date || null,
                        color_code: eventForm.color_code || null,
                      });
                      setEventForm({
                        title: "",
                        description: "",
                        event_type: "cutting",
                        start_date: "",
                        end_date: "",
                        color_code: DEFAULT_EVENT_COLORS.cutting,
                      });
                    } catch (err) {
                      setEventError(
                        err instanceof Error ? err.message : "Failed to create schedule event.",
                      );
                    }
                  }}
                >
                  <label style={{ gridColumn: "1 / -1" }}>
                    Title
                    <input
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      placeholder="Cutting day"
                    />
                  </label>
                  <label>
                    Type
                    <select
                      value={eventForm.event_type}
                      onChange={(e) => handleEventTypeChange(e.target.value)}
                    >
                      <option value="delivery">delivery</option>
                      <option value="cutting">cutting</option>
                      <option value="hauling">hauling</option>
                      <option value="splitting">splitting</option>
                      <option value="other">other</option>
                    </select>
                  </label>
                  <label>
                    Start
                    <input
                      type="datetime-local"
                      value={eventForm.start_date}
                      onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                    />
                  </label>
                  <label>
                    End
                    <input
                      type="datetime-local"
                      value={eventForm.end_date}
                      onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                    />
                  </label>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
                    <button className="ping" type="submit">
                      Add event
                    </button>
                    <span className="muted" style={{ fontSize: "0.8rem" }}>
                      Staff/employee/admin only
                    </span>
                  </div>
                </form>
              </div>
            )}

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
                const deliveryEvents = events.filter((e) => (e.event_type || "").toLowerCase() === "delivery");
                const otherEvents = events.filter((e) => (e.event_type || "").toLowerCase() !== "delivery");
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
                      {/* Show delivery count badge if there are deliveries */}
                      {deliveryEvents.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                            fontSize: "0.7rem",
                            background: "#e67f1e",
                            color: "white",
                            padding: "3px 6px",
                            borderRadius: "4px",
                            fontWeight: "bold",
                          }}
                          title={deliveryEvents.map((e) => e.title).join(", ")}
                        >
                          🚚 {deliveryEvents.length} {deliveryEvents.length === 1 ? "delivery" : "deliveries"}
                        </div>
                      )}
                      {/* Show other events individually */}
                      {otherEvents.map((ev) => {
                        const eventType = (ev.event_type || "other").toLowerCase();
                        const icon = EVENT_ICONS[eventType] ?? EVENT_ICONS.other;
                        return (
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
                          {icon} {ev.title}
                        </div>
                      );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Open Work Orders - Single line list, color coded */}
          {openWorkOrders.length > 0 && (
            <div className="card">
              <h3>
                Open Orders
                <span
                  className="badge"
                  style={{ backgroundColor: "#e67f1e", color: "white", marginLeft: "0.5rem" }}
                >
                  {openWorkOrders.length}
                </span>
              </h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginTop: "0.75rem",
                }}
              >
                {openWorkOrders.map((wo) => {
                  const status = (wo.status || "").toLowerCase();
                  // Color coding by status
                  let bgColor = "#e0e0e0";
                  let textColor = "#333";
                  if (status === "received") {
                    bgColor = "#e3f2fd"; textColor = "#1565c0"; // Blue
                  } else if (status === "pending") {
                    bgColor = "#fff3e0"; textColor = "#e65100"; // Orange
                  } else if (status === "scheduled") {
                    bgColor = "#e8f5e9"; textColor = "#2e7d32"; // Green
                  } else if (status === "in_progress") {
                    bgColor = "#fff9c4"; textColor = "#f9a825"; // Yellow
                  }

                  return (
                    <div
                      key={wo.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        background: bgColor,
                        color: textColor,
                        whiteSpace: "nowrap",
                        cursor: onOpenOrderSelect ? "pointer" : "default",
                      }}
                      onDoubleClick={() => onOpenOrderSelect?.(wo)}
                      title={`${wo.client_name} - ${wo.status}${wo.scheduled_date ? ` (${new Date(wo.scheduled_date).toLocaleDateString()})` : ""}`}
                    >
                      <span style={{ fontWeight: 500 }}>{wo.client_name}</span>
                      <span style={{ opacity: 0.7, fontSize: "0.7rem" }}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming List */}
          <div className="card">
            <h3>Upcoming Events</h3>
            <ul className="list">
              {upcomingDeliveries.map((d) => {
                const eventType = (d.event_type || "other").toLowerCase();
                const icon = EVENT_ICONS[eventType] ?? EVENT_ICONS.other;
                return (
                  <li key={d.id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>
                      <strong>
                        {icon} {d.title}
                      </strong>
                      <span className="muted" style={{ marginLeft: "0.5rem" }}>
                        {d.event_type}
                      </span>
                    </span>
                    <span>{new Date(d.start_date).toLocaleDateString()}</span>
                  </li>
                );
              })}
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

        </div>
      </div>
    </div>
  );
}
