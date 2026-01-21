import React, { useMemo } from "react";
import { DeliveryEventRow, InventoryRow, UserRow, UserSession, WorkOrderRow } from "../types";

interface MetricsProps {
  session: UserSession;
  deliveries: DeliveryEventRow[];
  inventory: InventoryRow[];
  users: UserRow[];
  workOrders: WorkOrderRow[];
}

export default function Metrics({ session, deliveries, inventory, users, workOrders }: MetricsProps) {
  // Wood inventory summary
  const woodSummary = useMemo(() => {
    let split = 0;
    let unsplit = 0;

    inventory.forEach((item) => {
      const name = (item.name || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const unit = (item.unit || "").toLowerCase();
      const qty = item.quantity_on_hand;

      // Check for split firewood
      if (name.includes("split") && (name.includes("firewood") || name.includes("wood")) && !name.includes("unsplit")) {
        split += qty;
      } else if (cat.includes("split") && !cat.includes("unsplit")) {
        split += qty;
      }
      // Check for unsplit/rounds/logs
      else if (name.includes("unsplit") || name.includes("round") || name.includes("log")) {
        unsplit += qty;
      } else if (cat.includes("log") || cat.includes("round") || cat.includes("unsplit")) {
        unsplit += qty;
      }
      // Also check if it's a wood category with cords unit
      else if (cat === "wood" && unit.includes("cord")) {
        split += qty; // Default to split if unclear
      }
    });

    return { split, unsplit };
  }, [inventory]);

  // Work order metrics
  const workOrderMetrics = useMemo(() => {
    const total = workOrders.length;
    const completed = workOrders.filter(wo => wo.status?.toLowerCase() === "completed").length;
    const pending = workOrders.filter(wo =>
      ["received", "pending", "scheduled", "in_progress"].includes(wo.status?.toLowerCase() || "")
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, completionRate };
  }, [workOrders]);

  // User metrics
  const userMetrics = useMemo(() => {
    const total = users.length;
    const drivers = users.filter(u => u.is_driver).length;
    const hipaaCertified = users.filter(u => u.hipaa_certified).length;

    return { total, drivers, hipaaCertified };
  }, [users]);

  // Recent deliveries
  const recentDeliveries = useMemo(() => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    return deliveries
      .filter(d => d.scheduled_date && new Date(d.scheduled_date) >= last7Days)
      .length;
  }, [deliveries]);

  return (
    <div className="stack">
      <div className="list-card">
        <div className="list-head">
          <h3>Firewood Bank Metrics</h3>
        </div>
        <div className="stack">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {/* Wood Inventory */}
            <div className="card">
              <h4>Wood Inventory</h4>
              <div className="stack">
                <div className="metric">
                  <span className="metric-value">{woodSummary.split.toFixed(1)}</span>
                  <span className="metric-label">Split Cords</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{woodSummary.unsplit.toFixed(1)}</span>
                  <span className="metric-label">Unsplit Cords</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{(woodSummary.split + woodSummary.unsplit).toFixed(1)}</span>
                  <span className="metric-label">Total Cords</span>
                </div>
              </div>
            </div>

            {/* Work Orders */}
            <div className="card">
              <h4>Work Orders</h4>
              <div className="stack">
                <div className="metric">
                  <span className="metric-value">{workOrderMetrics.total}</span>
                  <span className="metric-label">Total Orders</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{workOrderMetrics.pending}</span>
                  <span className="metric-label">Pending Orders</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{workOrderMetrics.completionRate}%</span>
                  <span className="metric-label">Completion Rate</span>
                </div>
              </div>
            </div>

            {/* Team */}
            <div className="card">
              <h4>Team</h4>
              <div className="stack">
                <div className="metric">
                  <span className="metric-value">{userMetrics.total}</span>
                  <span className="metric-label">Total Users</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{userMetrics.drivers}</span>
                  <span className="metric-label">Drivers</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{userMetrics.hipaaCertified}</span>
                  <span className="metric-label">HIPAA Certified</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <h4>Recent Activity</h4>
              <div className="stack">
                <div className="metric">
                  <span className="metric-value">{recentDeliveries}</span>
                  <span className="metric-label">Deliveries (7 days)</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{workOrderMetrics.completed}</span>
                  <span className="metric-label">Orders Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Inventory Alerts */}
      <div className="list-card">
        <div className="list-head">
          <h3>Inventory Alerts</h3>
        </div>
        <div className="stack">
          {inventory
            .filter(item => item.quantity_on_hand <= item.reorder_threshold)
            .map(item => (
              <div key={item.id} className="alert warning">
                <strong>{item.name}</strong> is low: {item.quantity_on_hand.toFixed(1)} {item.unit}
                {item.reorder_amount && (
                  <span> (reorder: {item.reorder_amount} {item.unit})</span>
                )}
              </div>
            ))}
          {inventory.filter(item => item.quantity_on_hand <= item.reorder_threshold).length === 0 && (
            <div className="alert success">All inventory levels are adequate</div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="list-card">
        <div className="list-head">
          <h3>Quick Stats</h3>
        </div>
        <div className="table">
          <div className="table-head">
            <span>Metric</span>
            <span>Value</span>
          </div>
          <div className="table-row">
            <div>Active Clients</div>
            <div>{workOrders.filter(wo => wo.client_id).length}</div>
          </div>
          <div className="table-row">
            <div>Average Order Size</div>
            <div>
              {workOrderMetrics.total > 0
                ? (workOrders.reduce((sum, wo) => sum + (wo.delivery_size_cords || 0), 0) / workOrderMetrics.total).toFixed(1)
                : 0} cords
            </div>
          </div>
          <div className="table-row">
            <div>Driver Utilization</div>
            <div>{userMetrics.total > 0 ? Math.round((userMetrics.drivers / userMetrics.total) * 100) : 0}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}