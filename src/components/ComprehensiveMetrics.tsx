import React, { useMemo } from "react";

import { ClientRow, DeliveryEventRow, InventoryRow, UserRow, WorkOrderRow } from "../types";

interface ComprehensiveMetricsProps {
  clients: ClientRow[];
  workOrders: WorkOrderRow[];
  deliveries: DeliveryEventRow[];
  inventory: InventoryRow[];
  users: UserRow[];
  expenses?: any[];
  donations?: any[];
}

/**
 * Comprehensive Community Impact Metrics
 *
 * Enhanced January 2026 with financial tracking integration:
 * - Real-time community impact (households served, wood distributed)
 * - Operational efficiency KPIs (completion rates, volunteer engagement)
 * - Financial transparency (revenue/expenses, net position)
 * - Resource utilization (inventory health, team capacity)
 *
 * See APP_TSX_TOC.md for integration points in main app
 */
export default function ComprehensiveMetrics({
  clients,
  workOrders,
  deliveries,
  inventory,
  users,
  expenses = [],
  donations = [],
}: ComprehensiveMetricsProps) {
  const metrics = useMemo(() => {
    // Core operational metrics
    const completedWorkOrders = workOrders.filter(wo =>
      wo.status?.toLowerCase() === "completed"
    );

    const activeWorkOrders = workOrders.filter(wo =>
      ["scheduled", "in_progress", "delivered"].includes(wo.status?.toLowerCase() || "")
    );

    // Wood distribution metrics
    const totalWoodDelivered = completedWorkOrders.reduce((sum, wo) => {
      return sum + (wo.delivery_size_cords || 0);
    }, 0);

    const totalWoodPickedUp = completedWorkOrders.reduce((sum, wo) => {
      return sum + (wo.pickup_quantity_cords || 0);
    }, 0);

    const totalWoodDistributed = totalWoodDelivered + totalWoodPickedUp;

    // Client impact metrics
    const approvedClients = clients.filter(c =>
      c.approval_status?.toLowerCase() === "approved"
    );

    const servedClients = clients.filter(c =>
      clients.some(client =>
        workOrders.some(wo =>
          wo.client_id === client.id &&
          wo.status?.toLowerCase() === "completed"
        )
      )
    );

    // Volunteer impact
    const volunteers = users.filter(u =>
      u.role?.toLowerCase() === "volunteer"
    );

    const activeVolunteers = volunteers.filter(v =>
      deliveries.some(d =>
        d.assigned_user_ids_json &&
        JSON.parse(d.assigned_user_ids_json).includes(v.id)
      )
    );

    // Inventory health
    const totalInventoryValue = inventory.reduce((sum, item) => {
      // Rough estimation - could be enhanced with actual costs
      return sum + (item.quantity_on_hand * 50); // $50/cord estimate
    }, 0);

    const lowStockItems = inventory.filter(item =>
      item.quantity_on_hand <= item.reorder_threshold
    );

    // Work order efficiency
    const avgDeliverySize = completedWorkOrders.length > 0
      ? totalWoodDelivered / completedWorkOrders.length
      : 0;

    // Financial metrics
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalDonationsValue = donations.reduce((sum, don) => sum + (don.monetary_value || 0), 0);
    const netPosition = totalDonationsValue - totalExpenses;

    // Monthly trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDeliveries = deliveries.filter(d => {
      const deliveryDate = new Date(d.start_date);
      return deliveryDate >= thirtyDaysAgo;
    });

    const recentWorkOrders = completedWorkOrders.filter(wo => {
      const scheduledDate = wo.scheduled_date ? new Date(wo.scheduled_date) : null;
      return scheduledDate && scheduledDate >= thirtyDaysAgo;
    });

    const recentExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.expense_date);
      return expDate >= thirtyDaysAgo;
    });

    return {
      operational: {
        totalClients: clients.length,
        approvedClients: approvedClients.length,
        servedClients: servedClients.length,
        activeWorkOrders: activeWorkOrders.length,
        completedWorkOrders: completedWorkOrders.length,
        totalDeliveries: deliveries.length,
        recentDeliveries: recentDeliveries.length,
      },
      wood: {
        totalDistributed: totalWoodDistributed,
        delivered: totalWoodDelivered,
        pickedUp: totalWoodPickedUp,
        avgDeliverySize: avgDeliverySize,
        recentDistributed: recentWorkOrders.reduce((sum, wo) =>
          sum + (wo.delivery_size_cords || 0) + (wo.pickup_quantity_cords || 0), 0
        ),
      },
      people: {
        totalVolunteers: volunteers.length,
        activeVolunteers: activeVolunteers.length,
        totalStaff: users.filter(u =>
          ["staff", "employee", "lead", "admin"].includes(u.role?.toLowerCase() || "")
        ).length,
        totalDrivers: users.filter(u => u.is_driver).length,
      },
      inventory: {
        totalItems: inventory.length,
        totalValue: totalInventoryValue,
        lowStockItems: lowStockItems.length,
        reservedQuantity: inventory.reduce((sum, item) =>
          sum + item.reserved_quantity, 0
        ),
      },
      efficiency: {
        completionRate: workOrders.length > 0
          ? (completedWorkOrders.length / workOrders.length) * 100
          : 0,
        clientSatisfaction: servedClients.length > 0
          ? (servedClients.length / approvedClients.length) * 100
          : 0,
      },
      financial: {
        totalExpenses,
        totalDonationsValue,
        netPosition,
        recentExpenses: recentExpenses.length,
      }
    };
  }, [clients, workOrders, deliveries, inventory, users]);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatNumber = (num: number, decimals = 1) =>
    num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className="stack">
      {/* Impact Overview */}
      <div className="card">
        <h3>Community Impact Overview</h3>
        <div className="two-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Households Served</h4>
            </div>
            <p style={{ fontSize: 32, margin: 0, color: "#2d6b3d" }}>
              {metrics.operational.servedClients}
            </p>
            <p className="muted">
              of {metrics.operational.approvedClients} approved clients
            </p>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Wood Distributed</h4>
            </div>
            <p style={{ fontSize: 32, margin: 0, color: "#e67f1e" }}>
              {formatNumber(metrics.wood.totalDistributed)} cords
            </p>
            <p className="muted">
              {formatNumber(metrics.wood.recentDistributed)} cords this month
            </p>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      {(expenses.length > 0 || donations.length > 0) && (
        <div className="card">
          <h3>Financial Overview</h3>
          <div className="two-up">
            <div className="list-card">
              <div className="list-head">
                <h4>Revenue & Expenses</h4>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ fontSize: 24, margin: 0 }}>
                  <span style={{ color: "#2d6b3d" }}>
                    +{formatCurrency(metrics.financial.totalDonationsValue)}
                  </span>{" "}
                  <span style={{ color: "#b3261e" }}>
                    -{formatCurrency(metrics.financial.totalExpenses)}
                  </span>
                </p>
                <p className="muted">
                  Net: {formatCurrency(metrics.financial.netPosition)}
                </p>
              </div>
            </div>
            <div className="list-card">
              <div className="list-head">
                <h4>Recent Activity</h4>
              </div>
              <div className="stack" style={{ gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Expenses this month:</span>
                  <span>{metrics.financial.recentExpenses}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Donations recorded:</span>
                  <span>{donations.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operational Metrics */}
      <div className="card">
        <h3>Operational Performance</h3>
        <div className="three-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Work Order Completion</h4>
            </div>
            <p style={{ fontSize: 28, margin: 0 }}>
              {formatNumber(metrics.efficiency.completionRate)}%
            </p>
            <p className="muted">
              {metrics.operational.completedWorkOrders} of {metrics.operational.totalClients} orders
            </p>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Active Deliveries</h4>
            </div>
            <p style={{ fontSize: 28, margin: 0 }}>
              {metrics.operational.activeWorkOrders}
            </p>
            <p className="muted">
              {metrics.operational.recentDeliveries} scheduled this month
            </p>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Volunteer Engagement</h4>
            </div>
            <p style={{ fontSize: 28, margin: 0 }}>
              {metrics.people.activeVolunteers}
            </p>
            <p className="muted">
              of {metrics.people.totalVolunteers} registered volunteers
            </p>
          </div>
        </div>
      </div>

      {/* Resource Management */}
      <div className="card">
        <h3>Resource Management</h3>
        <div className="two-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Inventory Status</h4>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: 24, margin: 0 }}>
                {formatCurrency(metrics.inventory.totalValue)} estimated value
              </p>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total Items:</span>
                <span>{metrics.inventory.totalItems}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Low Stock Alerts:</span>
                <span style={{ color: metrics.inventory.lowStockItems > 0 ? "#b3261e" : "#2d6b3d" }}>
                  {metrics.inventory.lowStockItems}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Reserved Quantity:</span>
                <span>{formatNumber(metrics.inventory.reservedQuantity)} cords</span>
              </div>
            </div>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Team Capacity</h4>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Staff Members:</span>
                <span>{metrics.people.totalStaff}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Licensed Drivers:</span>
                <span>{metrics.people.totalDrivers}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Active Volunteers:</span>
                <span>{metrics.people.activeVolunteers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown */}
      <div className="card">
        <h3>Wood Distribution Breakdown</h3>
        <div className="two-up">
          <div className="list-card">
            <div className="list-head">
              <h4>By Delivery Type</h4>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Direct Deliveries:</span>
                <span>{formatNumber(metrics.wood.delivered)} cords</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Pickup Services:</span>
                <span>{formatNumber(metrics.wood.pickedUp)} cords</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Total Distributed:</span>
                <span>{formatNumber(metrics.wood.totalDistributed)} cords</span>
              </div>
            </div>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Efficiency Metrics</h4>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Avg Delivery Size:</span>
                <span>{formatNumber(metrics.wood.avgDeliverySize)} cords</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Client Satisfaction:</span>
                <span>{formatNumber(metrics.efficiency.clientSatisfaction)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Future Enhancement Placeholders */}
      <div className="card muted">
        <h3>Financial & Time Tracking (Coming Soon)</h3>
        <div className="stack">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div className="pill" style={{ background: "#f1e6d7", color: "#8b5a2b" }}>
              💰 Expense Tracking
            </div>
            <div className="pill" style={{ background: "#f1e6d7", color: "#8b5a2b" }}>
              ⏰ Volunteer Hours
            </div>
            <div className="pill" style={{ background: "#f1e6d7", color: "#8b5a2b" }}>
              🎁 Donation Management
            </div>
            <div className="pill" style={{ background: "#f1e6d7", color: "#8b5a2b" }}>
              📊 Financial Reports
            </div>
          </div>
          <p className="muted">
            Enhanced metrics including expense tracking, volunteer hour attribution,
            donation management, and comprehensive financial reporting are planned
            for the next development phase.
          </p>
        </div>
      </div>
    </div>
  );
}