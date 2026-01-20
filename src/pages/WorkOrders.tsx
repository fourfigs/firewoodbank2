import React, { useState, useMemo } from "react";
import { WorkOrderRow, UserRow, UserSession, ClientRow } from "../types";

interface WorkOrdersProps {
  session: UserSession;
  workOrders: WorkOrderRow[];
  users: UserRow[];
  clients: ClientRow[];
  busy: boolean;
  // State management props
  selectedWorkOrder: WorkOrderRow | null;
  setSelectedWorkOrder: (workOrder: WorkOrderRow | null) => void;
  workOrderDetailOpen: boolean;
  setWorkOrderDetailOpen: (open: boolean) => void;
  workOrderEditMode: boolean;
  setWorkOrderEditMode: (edit: boolean) => void;
  workOrderEditForm: any;
  setWorkOrderEditForm: (form: any) => void;
  // Form state props
  showWorkOrderForm: boolean;
  setShowWorkOrderForm: (show: boolean) => void;
  workOrderNewClientEnabled: boolean;
  setWorkOrderNewClientEnabled: (enabled: boolean) => void;
  workOrderNewClient: any;
  setWorkOrderNewClient: (client: any) => void;
  newWorkOrderId: string;
  setNewWorkOrderId: (id: string) => void;
  newWorkOrderEntryDate: string;
  setNewWorkOrderEntryDate: (date: string) => void;
  workOrderError: string | null;
  setWorkOrderError: (error: string | null) => void;
  // Actions
  loadWorkOrders: () => Promise<void>;
}

const WORK_ORDER_STATUSES = [
  "draft",
  "scheduled",
  "in_progress",
  "picked_up",
  "completed",
  "cancelled",
] as const;

export default function WorkOrders(props: WorkOrdersProps) {
  const {
    session,
    workOrders,
    users,
    clients,
    busy,
    selectedWorkOrder,
    setSelectedWorkOrder,
    workOrderDetailOpen,
    setWorkOrderDetailOpen,
    workOrderEditMode,
    setWorkOrderEditMode,
    workOrderEditForm,
    setWorkOrderEditForm,
    showWorkOrderForm,
    setShowWorkOrderForm,
    workOrderNewClientEnabled,
    setWorkOrderNewClientEnabled,
    workOrderNewClient,
    setWorkOrderNewClient,
    newWorkOrderId,
    setNewWorkOrderId,
    newWorkOrderEntryDate,
    setNewWorkOrderEntryDate,
    workOrderError,
    setWorkOrderError,
    loadWorkOrders,
  } = props;

  const canCreateWorkOrders = session?.role === "admin" || session?.role === "staff";

  // Calculate work order statistics
  const workOrderStats = useMemo(() => {
    const total = workOrders.length;
    const byStatus = WORK_ORDER_STATUSES.reduce((acc, status) => {
      acc[status] = workOrders.filter(wo => wo.status === status).length;
      return acc;
    }, {} as Record<string, number>);

    return { total, byStatus };
  }, [workOrders]);

  // Get client name from work order
  const getClientName = (workOrder: WorkOrderRow) => {
    if (workOrder.client_name) return workOrder.client_name;
    if (workOrder.client_id) {
      const client = clients.find(c => c.id === workOrder.client_id);
      return client?.name || "Unknown Client";
    }
    return "No Client";
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "#9e9e9e";
      case "scheduled": return "#2196f3";
      case "in_progress": return "#ff9800";
      case "picked_up": return "#9c27b0";
      case "completed": return "#4caf50";
      case "cancelled": return "#f44336";
      default: return "#9e9e9e";
    }
  };

  return (
    <div className="stack">
      {/* Header with stats and actions */}
      <div className="card">
        <div className="add-header">
          {canCreateWorkOrders && (
            <button
              type="button"
              className="icon-button"
              title="Create new work order"
              onClick={() => setShowWorkOrderForm(true)}
              disabled={busy}
            >
              +
            </button>
          )}
          <h3>Work Orders</h3>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span className="badge">
              {workOrderStats.total} total
            </span>
            {Object.entries(workOrderStats.byStatus).map(([status, count]) => (
              count > 0 && (
                <span
                  key={status}
                  className="badge"
                  style={{
                    background: getStatusColor(status),
                    color: "white"
                  }}
                >
                  {status}: {count}
                </span>
              )
            ))}
          </div>
        </div>

        {!canCreateWorkOrders && (
          <p className="muted">Only leads or admins can create work orders.</p>
        )}
      </div>

      {/* Status filter buttons */}
      <div className="card">
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            style={{
              padding: "0.4rem 0.75rem",
              background: "#e67f1e",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            All ({workOrderStats.total})
          </button>
          {WORK_ORDER_STATUSES.map(status => {
            const count = workOrderStats.byStatus[status] || 0;
            return (
              count > 0 && (
                <button
                  key={status}
                  type="button"
                  style={{
                    padding: "0.4rem 0.75rem",
                    background: getStatusColor(status),
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {status.replace("_", " ")} ({count})
                </button>
              )
            );
          })}
        </div>
      </div>

      {/* Work orders list */}
      <div className="card">
        <div style={{ maxHeight: "600px", overflow: "auto" }}>
          {workOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
              No work orders yet. {canCreateWorkOrders && "Create your first work order above."}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Scheduled Date</th>
                  <th>Wood Size</th>
                  <th>Pickup/Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map(workOrder => (
                  <tr key={workOrder.id}>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                          setSelectedWorkOrder(workOrder);
                          setWorkOrderDetailOpen(true);
                        }}
                      >
                        {getClientName(workOrder)}
                      </button>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                          background: getStatusColor(workOrder.status),
                          color: "white",
                          textTransform: "capitalize",
                        }}
                      >
                        {workOrder.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {workOrder.scheduled_date
                        ? new Date(workOrder.scheduled_date).toLocaleDateString()
                        : "Not scheduled"
                      }
                    </td>
                    <td>{workOrder.wood_size_label || workOrder.delivery_size_label || "N/A"}</td>
                    <td>{workOrder.pickup_delivery_type || "delivery"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setSelectedWorkOrder(workOrder);
                            setWorkOrderDetailOpen(true);
                          }}
                        >
                          View
                        </button>
                        {(session.role === "admin" || session.role === "lead") && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => {
                              setSelectedWorkOrder(workOrder);
                              setWorkOrderEditMode(true);
                              setWorkOrderEditForm({
                                scheduled_date: workOrder.scheduled_date || "",
                                status: workOrder.status,
                                assignees: workOrder.assignees_json ? JSON.parse(workOrder.assignees_json) : [],
                                mileage: workOrder.mileage?.toString() || "",
                                notes: workOrder.notes || "",
                              });
                              setWorkOrderDetailOpen(true);
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Work Order Detail Modal */}
      {workOrderDetailOpen && selectedWorkOrder && (
        <div className="modal-overlay" onClick={() => setWorkOrderDetailOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Work Order Details</h3>
              <button
                className="ghost"
                onClick={() => setWorkOrderDetailOpen(false)}
                style={{ padding: "0.25rem 0.5rem" }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <strong>Client:</strong> {getClientName(selectedWorkOrder)}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span
                    style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "12px",
                      fontSize: "0.8rem",
                      background: getStatusColor(selectedWorkOrder.status),
                      color: "white",
                      textTransform: "capitalize",
                    }}
                  >
                    {selectedWorkOrder.status.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <strong>Scheduled Date:</strong>{" "}
                  {selectedWorkOrder.scheduled_date
                    ? new Date(selectedWorkOrder.scheduled_date).toLocaleDateString()
                    : "Not scheduled"
                  }
                </div>
                <div>
                  <strong>Order ID:</strong> {selectedWorkOrder.id.slice(0, 8).toUpperCase()}
                </div>
                <div>
                  <strong>Wood Size:</strong> {selectedWorkOrder.wood_size_label || selectedWorkOrder.delivery_size_label || "N/A"}
                </div>
                <div>
                  <strong>Pickup/Delivery:</strong> {selectedWorkOrder.pickup_delivery_type || "delivery"}
                </div>
              </div>

              {selectedWorkOrder.notes && (
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Notes:</strong>
                  <p style={{ margin: "0.5rem 0", whiteSpace: "pre-wrap" }}>
                    {selectedWorkOrder.notes}
                  </p>
                </div>
              )}

              {selectedWorkOrder.directions && (
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Directions:</strong>
                  <p style={{ margin: "0.5rem 0", whiteSpace: "pre-wrap" }}>
                    {selectedWorkOrder.directions}
                  </p>
                </div>
              )}

              {selectedWorkOrder.gate_combo && (
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Gate Combo:</strong> {selectedWorkOrder.gate_combo}
                </div>
              )}

              {selectedWorkOrder.mileage && (
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Mileage:</strong> {selectedWorkOrder.mileage} miles
                </div>
              )}

              {selectedWorkOrder.default_mileage && (
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Default Mileage:</strong> {selectedWorkOrder.default_mileage} miles
                </div>
              )}

              {/* Edit mode */}
              {workOrderEditMode && (
                <div style={{ borderTop: "1px solid #ddd", paddingTop: "1rem", marginTop: "1rem" }}>
                  <h4>Edit Work Order</h4>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      // TODO: Implement work order update logic
                      console.log("Update work order:", workOrderEditForm);
                    }}
                  >
                    <div className="form-grid">
                      <label>
                        Scheduled Date
                        <input
                          type="date"
                          value={workOrderEditForm.scheduled_date}
                          onChange={(e) => setWorkOrderEditForm({
                            ...workOrderEditForm,
                            scheduled_date: e.target.value
                          })}
                        />
                      </label>

                      <label>
                        Status
                        <select
                          value={workOrderEditForm.status}
                          onChange={(e) => setWorkOrderEditForm({
                            ...workOrderEditForm,
                            status: e.target.value
                          })}
                        >
                          {WORK_ORDER_STATUSES.map(status => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Mileage
                        <input
                          type="number"
                          value={workOrderEditForm.mileage}
                          onChange={(e) => setWorkOrderEditForm({
                            ...workOrderEditForm,
                            mileage: e.target.value
                          })}
                        />
                      </label>
                    </div>

                    <label>
                      Notes
                      <textarea
                        value={workOrderEditForm.notes}
                        onChange={(e) => setWorkOrderEditForm({
                          ...workOrderEditForm,
                          notes: e.target.value
                        })}
                        rows={3}
                      />
                    </label>

                    {workOrderError && (
                      <div className="error-message">{workOrderError}</div>
                    )}

                    <div className="actions">
                      <button type="submit" className="primary" disabled={busy}>
                        Update Work Order
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setWorkOrderEditMode(false);
                          setWorkOrderEditForm({
                            scheduled_date: "",
                            status: "",
                            assignees: [],
                            mileage: "",
                            notes: "",
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Work Order Creation Form Modal */}
      {showWorkOrderForm && (
        <div className="modal-overlay" onClick={() => setShowWorkOrderForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Work Order</h3>
              <button
                className="ghost"
                onClick={() => setShowWorkOrderForm(false)}
                style={{ padding: "0.25rem 0.5rem" }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>Work order creation form coming soon...</p>
              <p>This will include client selection, delivery details, wood sizing, etc.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}