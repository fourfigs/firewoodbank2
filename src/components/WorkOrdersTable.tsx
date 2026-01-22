import React from "react";

import { invokeTauri } from "../api/tauri";
import { UserSession, WorkOrderRow } from "../types";

type ProgressEdits = Record<string, { status: string; mileage: string; hours: string }>;

type WorkOrdersTableProps = {
  workOrders: WorkOrderRow[];
  session: UserSession;
  isDriver: boolean;
  canViewPII: boolean;
  selectedWorkOrderId: string | null;
  onSelect: (id: string) => void;
  onOpenDetail: (workOrder: WorkOrderRow) => void;
  progressEdits: ProgressEdits;
  setProgressEdits: React.Dispatch<React.SetStateAction<ProgressEdits>>;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setWorkOrderError: (message: string | null) => void;
  loadWorkOrders: () => Promise<void>;
};

function WorkOrdersTable({
  workOrders,
  session,
  isDriver,
  canViewPII,
  selectedWorkOrderId,
  onSelect,
  onOpenDetail,
  progressEdits,
  setProgressEdits,
  busy,
  setBusy,
  setWorkOrderError,
  loadWorkOrders,
}: WorkOrdersTableProps) {
  const showPII = canViewPII;

  return (
    <div className="table">
      <div className="table-head">
        {session.role === "volunteer" ? (
          <>
            <span>Town</span>
            <span>Status</span>
            <span>Scheduled</span>
            <span>Mileage</span>
            <span>Action</span>
          </>
        ) : isDriver ? (
          <>
            <span>Client</span>
            <span>Status</span>
            <span>Scheduled</span>
            <span>Contact</span>
            <span>Action</span>
          </>
        ) : (
          <>
            <span>Client</span>
            <span>Status</span>
            <span>Scheduled</span>
            <span>Notes</span>
            <span>Action</span>
          </>
        )}
      </div>
      {workOrders.map((wo) => (
        <div
          className="table-row"
          key={wo.id}
          onClick={() => onSelect(wo.id)}
          onDoubleClick={() => onOpenDetail(wo)}
          style={{
            cursor: "pointer",
            backgroundColor: selectedWorkOrderId === wo.id ? "#e0e7ff" : undefined,
            borderLeft: selectedWorkOrderId === wo.id ? "4px solid #4f46e5" : "4px solid transparent",
          }}
          title="Double-click to view details"
        >
          {session.role === "volunteer" ? (
            <>
              <div>
                <strong>{wo.town ?? (wo as any)?.physical_address_city ?? "—"}</strong>
              </div>
              <div>
                <span className="pill">{wo.status}</span>
              </div>
              <div>{wo.scheduled_date ?? "—"}</div>
              <div className="muted">{wo.mileage != null ? `${wo.mileage} mi` : "—"}</div>
              <div>
                <button
                  className="ghost"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(wo);
                  }}
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                >
                  View Details
                </button>
              </div>
            </>
          ) : isDriver ? (
            <>
              <div>
                <strong>{wo.client_name}</strong>
                <div className="muted">
                  {wo.physical_address_line1
                    ? `${wo.physical_address_line1}, ${wo.physical_address_city ?? ""}, ${wo.physical_address_state ?? ""} ${wo.physical_address_postal_code ?? ""}`
                    : "—"}
                </div>
                {wo.pickup_delivery_type && (
                  <div className="muted">Type: {wo.pickup_delivery_type}</div>
                )}
                {wo.delivery_size_label && (
                  <div className="muted">Delivery: {wo.delivery_size_label}</div>
                )}
                {wo.pickup_quantity_cords != null && (
                  <div className="muted">
                    Pickup: {wo.pickup_quantity_cords.toFixed(2)} cords
                    {wo.pickup_length != null &&
                    wo.pickup_width != null &&
                    wo.pickup_height != null
                      ? ` (${wo.pickup_length}x${wo.pickup_width}x${wo.pickup_height} ${wo.pickup_units ?? ""})`
                      : ""}
                  </div>
                )}
              </div>
              <div>
                <span className="pill">{wo.status}</span>
              </div>
              <div>{wo.scheduled_date ?? "—"}</div>
              <div className="muted">{wo.telephone ?? "—"}</div>
              <div>
                <button
                  className="ghost"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(wo);
                  }}
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                >
                  View Details
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <strong>{wo.client_name}</strong>
                {wo.created_by_display && (
                  <div className="muted">Created by: {wo.created_by_display}</div>
                )}
                {wo.pickup_delivery_type && (
                  <div className="muted">Type: {wo.pickup_delivery_type}</div>
                )}
                {wo.delivery_size_label && (
                  <div className="muted">Delivery: {wo.delivery_size_label}</div>
                )}
                {wo.pickup_quantity_cords != null && (
                  <div className="muted">
                    Pickup: {wo.pickup_quantity_cords.toFixed(2)} cords
                    {wo.pickup_length != null &&
                    wo.pickup_width != null &&
                    wo.pickup_height != null
                      ? ` (${wo.pickup_length}x${wo.pickup_width}x${wo.pickup_height} ${wo.pickup_units ?? ""})`
                      : ""}
                  </div>
                )}
              </div>
              <div>
                <span className="pill">{wo.status}</span>
              </div>
              <div>{wo.scheduled_date ?? "—"}</div>
              <div className="muted">{showPII ? (wo.notes ?? "—") : "PII hidden"}</div>
              <div>
                <button
                  className="ghost"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(wo);
                  }}
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                >
                  View Details
                </button>
              </div>
            </>
          )}
          {(isDriver || session.role === "lead" || session.role === "admin") && (
            <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
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
                        hours: progressEdits[wo.id]?.hours ?? "",
                      },
                    })
                  }
                  placeholder="Mileage"
                  style={{ width: 100 }}
                />
                {(session.role === "lead" || session.role === "admin") &&
                  (progressEdits[wo.id]?.status ?? wo.status) === "completed" && (
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={progressEdits[wo.id]?.hours ?? ""}
                      onChange={(e) =>
                        setProgressEdits({
                          ...progressEdits,
                          [wo.id]: {
                            status: progressEdits[wo.id]?.status ?? wo.status,
                            mileage: progressEdits[wo.id]?.mileage ?? "",
                            hours: e.target.value,
                          },
                        })
                      }
                      placeholder="Hours"
                      style={{ width: 90 }}
                    />
                  )}
                {(session.role === "lead" || session.role === "admin") && (
                  <select
                    value={progressEdits[wo.id]?.status ?? wo.status}
                    onChange={(e) =>
                      setProgressEdits({
                        ...progressEdits,
                        [wo.id]: {
                          status: e.target.value,
                          mileage: progressEdits[wo.id]?.mileage ?? "",
                          hours: progressEdits[wo.id]?.hours ?? "",
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
                    const edit = progressEdits[wo.id] ?? {
                      status: wo.status,
                      mileage: "",
                      hours: "",
                    };
                    if (
                      (session.role === "lead" || session.role === "admin") &&
                      edit.status === "completed" &&
                      edit.mileage === ""
                    ) {
                      setWorkOrderError("Mileage is required to mark completed.");
                      return;
                    }
                    if (
                      (session.role === "lead" || session.role === "admin") &&
                      edit.status === "completed" &&
                      edit.hours === ""
                    ) {
                      setWorkOrderError("Work hours are required to mark completed.");
                      return;
                    }
                    setBusy(true);
                    try {
                      await invokeTauri("update_work_order_status", {
                        input: {
                          work_order_id: wo.id,
                          status:
                            session.role === "lead" || session.role === "admin"
                              ? edit.status
                              : "in_progress",
                          mileage: edit.mileage === "" ? null : Number(edit.mileage),
                          work_hours: edit.hours === "" ? null : Number(edit.hours),
                          is_driver: isDriver,
                        },
                        role: session.role ?? null,
                        actor: session.username ?? null,
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
      {!workOrders.length && (
        <div className="table-row">
          {session.role === "volunteer" ? "No assigned work orders." : "No work orders yet."}
        </div>
      )}
    </div>
  );
}

export default React.memo(WorkOrdersTable);
