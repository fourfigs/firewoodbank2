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
                <select
                  className="pill"
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
                <select
                  className="pill"
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
                <select
                  className="pill"
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
