import React, { useMemo } from "react";

import { ClientRow, DeliveryEventRow, InventoryRow, UserRow, WorkOrderRow } from "../types";
import logo from "../assets/logo.png";

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
 * Enhanced Comprehensive Community Impact Metrics
 * 
 * Features beautiful CSS-based charts and visualizations:
 * - Bar charts for distribution metrics
 * - Line charts for trends
 * - Donut charts for breakdowns
 * - Progress indicators
 * - Print-ready with letterhead support
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

    // Client impact metrics - count households instead of individual clients
    const approvedClients = clients.filter(c =>
      c.approval_status?.toLowerCase() === "approved"
    );

    // Group clients by household_id to count unique households
    // Clients with the same household_id count as one household
    // Clients without household_id count as individual households
    const householdGroups = new Map<string, Set<string>>();
    const individualHouseholds = new Set<string>();
    
    clients.forEach(client => {
      if (client.household_id) {
        // This client belongs to a household
        const householdKey = client.household_id;
        if (!householdGroups.has(householdKey)) {
          householdGroups.set(householdKey, new Set());
        }
        householdGroups.get(householdKey)!.add(client.id);
        // Also add the household head (the client with id === household_id)
        householdGroups.get(householdKey)!.add(householdKey);
      } else {
        // This client is a household head (no household_id)
        individualHouseholds.add(client.id);
      }
    });

    // Count unique households (household groups + individual households)
    const totalHouseholds = householdGroups.size + individualHouseholds.size;

    // For served clients, count households that have at least one client with completed work orders
    const servedHouseholdIds = new Set<string>();
    clients.forEach(client => {
      const hasCompletedWorkOrder = workOrders.some(wo =>
        wo.client_id === client.id &&
        wo.status?.toLowerCase() === "completed"
      );
      
      if (hasCompletedWorkOrder) {
        if (client.household_id) {
          // Add the household this client belongs to
          servedHouseholdIds.add(client.household_id);
        } else {
          // This is an individual household
          servedHouseholdIds.add(client.id);
        }
      }
    });

    const servedClients = Array.from(servedHouseholdIds).length;

    // For approved clients, count households
    const approvedHouseholdIds = new Set<string>();
    approvedClients.forEach(client => {
      if (client.household_id) {
        approvedHouseholdIds.add(client.household_id);
      } else {
        approvedHouseholdIds.add(client.id);
      }
    });
    const approvedHouseholds = approvedHouseholdIds.size;

    // Track minors vs adults in households
    const householdMinorsSet = new Set<string>();
    const householdAdultsSet = new Set<string>();
    
    clients.forEach(client => {
      // is_minor is stored as INTEGER (0 or 1) in SQLite, can be null/undefined
      const isMinor = (client.is_minor ?? 0) === 1;
      const householdKey = client.household_id || client.id;
      
      if (isMinor) {
        householdMinorsSet.add(householdKey);
      } else {
        householdAdultsSet.add(householdKey);
      }
    });
    
    // Count households with minors vs adults
    const householdsWithMinors = householdMinorsSet.size;
    const householdsWithAdults = householdAdultsSet.size;
    
    // Count individual clients (not households) by age
    const totalMinors = clients.filter(c => (c.is_minor ?? 0) === 1).length;
    const totalAdults = clients.filter(c => (c.is_minor ?? 0) !== 1).length;

    // Volunteer impact
    const volunteers = users.filter(u =>
      u.role?.toLowerCase() === "volunteer"
    );
    
    // Track volunteers/employees by age (when date_of_birth is available in UserRow)
    // Note: UserRow doesn't currently have date_of_birth/is_minor fields
    // This structure is ready for when those fields are added
    const volunteerMinors = volunteers.filter(_v => {
      // TODO: Add date_of_birth/is_minor to UserRow type and calculate here
      return false; // Placeholder until UserRow has these fields
    });
    const volunteerAdults = volunteers.length - volunteerMinors.length;
    
    const staff = users.filter(u =>
      ["staff", "employee", "lead", "admin"].includes(u.role?.toLowerCase() || "")
    );
    
    const staffMinors = staff.filter(_s => {
      // TODO: Add date_of_birth/is_minor to UserRow type and calculate here
      return false; // Placeholder until UserRow has these fields
    });
    const staffAdults = staff.length - staffMinors.length;

    const activeVolunteers = volunteers.filter(v =>
      deliveries.some(d =>
        d.assigned_user_ids_json &&
        JSON.parse(d.assigned_user_ids_json).includes(v.id)
      )
    );

    // Inventory health
    const totalInventoryValue = inventory.reduce((sum, item) => {
      const name = (item.name || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const unit = (item.unit || "").toLowerCase();
      
      if (!unit.includes("cord")) {
        return sum + (item.quantity_on_hand * 50);
      }
      
      const isUnsplit = 
        name.includes("unsplit") || name.includes("round") || name.includes("log") ||
        cat.includes("log") || cat.includes("round") || cat.includes("unsplit");
      
      const valuePerCord = isUnsplit ? 200 : 450;
      return sum + (item.quantity_on_hand * valuePerCord);
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

    // Status breakdown for chart
    const statusBreakdown = {
      completed: completedWorkOrders.length,
      in_progress: workOrders.filter(wo => wo.status?.toLowerCase() === "in_progress").length,
      scheduled: workOrders.filter(wo => wo.status?.toLowerCase() === "scheduled").length,
      draft: workOrders.filter(wo => wo.status?.toLowerCase() === "draft").length,
      cancelled: workOrders.filter(wo => wo.status?.toLowerCase() === "cancelled").length,
    };

    // Monthly distribution data (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthOrders = completedWorkOrders.filter(wo => {
        const scheduledDate = wo.scheduled_date ? new Date(wo.scheduled_date) : null;
        return scheduledDate && scheduledDate >= monthStart && scheduledDate <= monthEnd;
      });
      
      const monthWood = monthOrders.reduce((sum, wo) => 
        sum + (wo.delivery_size_cords || 0) + (wo.pickup_quantity_cords || 0), 0
      );
      
      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        wood: monthWood,
        orders: monthOrders.length,
      });
    }

    const maxWood = Math.max(...monthlyData.map(d => d.wood), 1);
    const maxOrders = Math.max(...monthlyData.map(d => d.orders), 1);

    return {
      operational: {
        totalClients: totalHouseholds,
        approvedClients: approvedHouseholds,
        servedClients: servedClients,
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
        volunteerMinors: volunteerMinors.length,
        volunteerAdults: volunteerAdults,
        totalStaff: staff.length,
        staffMinors: staffMinors.length,
        staffAdults: staffAdults,
        totalDrivers: users.filter(u => u.is_driver).length,
      },
      demographics: {
        householdMinors: householdsWithMinors,
        householdAdults: householdsWithAdults,
        totalMinors: totalMinors,
        totalAdults: totalAdults,
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
        clientSatisfaction: servedClients > 0 && approvedHouseholds > 0
          ? (servedClients / approvedHouseholds) * 100
          : 0,
      },
      financial: {
        totalExpenses,
        totalDonationsValue,
        netPosition,
        recentExpenses: recentExpenses.length,
      },
      charts: {
        statusBreakdown,
        monthlyData,
        maxWood,
        maxOrders,
      }
    };
  }, [clients, workOrders, deliveries, inventory, users, expenses, donations]);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatNumber = (num: number, decimals = 1) =>
    num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  // Calculate donut chart percentages
  const totalStatus = Object.values(metrics.charts.statusBreakdown).reduce((a, b) => a + b, 0);
  const statusPercentages = Object.entries(metrics.charts.statusBreakdown).map(([status, count]) => ({
    status,
    count,
    percentage: totalStatus > 0 ? (count / totalStatus) * 100 : 0,
  }));

  const statusColors: Record<string, string> = {
    completed: "#2d6b3d",
    in_progress: "#e67f1e",
    scheduled: "#4f46e5",
    draft: "#9ca3af",
    cancelled: "#b3261e",
  };

  return (
    <div className="metrics-dashboard">
      {/* Print Header - Only visible when printing */}
      <div className="print-header">
        <div className="print-letterhead">
          <div className="letterhead-logo">
            <img src={logo} alt="NM-ERA Firewood Bank" />
          </div>
          <div className="letterhead-text">
            <h1>NM-ERA Firewood Bank</h1>
            <p>Community Impact Metrics Report</p>
            <p className="print-date">{new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
        </div>
      </div>

      <div className="metrics-header">
        <h2>Community Impact Dashboard</h2>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">🏠</div>
          <div className="metric-content">
            <div className="metric-label">Households Served</div>
            <div className="metric-value">{metrics.operational.servedClients}</div>
            <div className="metric-sublabel">of {metrics.operational.approvedClients} approved</div>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">🔥</div>
          <div className="metric-content">
            <div className="metric-label">Wood Distributed</div>
            <div className="metric-value">{formatNumber(metrics.wood.totalDistributed)}</div>
            <div className="metric-sublabel">cords total</div>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <div className="metric-label">Completion Rate</div>
            <div className="metric-value">{formatNumber(metrics.efficiency.completionRate)}%</div>
            <div className="metric-sublabel">{metrics.operational.completedWorkOrders} completed</div>
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <div className="metric-label">Active Volunteers</div>
            <div className="metric-value">{metrics.people.activeVolunteers}</div>
            <div className="metric-sublabel">of {metrics.people.totalVolunteers} registered</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Monthly Trend Chart */}
        <div className="chart-card">
          <h3>Monthly Distribution Trend</h3>
          <div className="chart-container">
            <div className="bar-chart">
              {metrics.charts.monthlyData.map((data, idx) => (
                <div key={idx} className="bar-group">
                  <div className="bar-wrapper">
                    <div 
                      className="bar wood-bar"
                      style={{ 
                        height: `${(data.wood / metrics.charts.maxWood) * 100}%`,
                        backgroundColor: "#2d6b3d"
                      }}
                      title={`${formatNumber(data.wood)} cords`}
                    />
                    <div 
                      className="bar orders-bar"
                      style={{ 
                        height: `${(data.orders / metrics.charts.maxOrders) * 100}%`,
                        backgroundColor: "#e67f1e"
                      }}
                      title={`${data.orders} orders`}
                    />
                  </div>
                  <div className="bar-label">{data.month}</div>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: "#2d6b3d" }}></span>
                <span>Wood (cords)</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: "#e67f1e" }}></span>
                <span>Orders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Breakdown Donut Chart */}
        <div className="chart-card">
          <h3>Work Order Status</h3>
          <div className="chart-container">
            <div className="donut-chart">
              <svg viewBox="0 0 200 200" className="donut-svg">
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="20"
                />
                {(() => {
                  let currentPercent = 0;
                  return statusPercentages.map(({ status, percentage }) => {
                    const startPercent = currentPercent;
                    currentPercent += percentage;
                    const circumference = 2 * Math.PI * 80;
                    const offset = circumference - (startPercent / 100) * circumference;
                    const dashArray = (percentage / 100) * circumference;
                    
                    return (
                      <circle
                        key={status}
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke={statusColors[status] || "#9ca3af"}
                        strokeWidth="20"
                        strokeDasharray={`${dashArray} ${circumference}`}
                        strokeDashoffset={offset}
                        transform="rotate(-90 100 100)"
                        style={{ transition: "all 0.3s ease" }}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="donut-center">
                <div className="donut-center-value">{totalStatus}</div>
                <div className="donut-center-label">Total Orders</div>
              </div>
            </div>
            <div className="donut-legend">
              {statusPercentages.map(({ status, count, percentage }) => (
                <div key={status} className="donut-legend-item">
                  <span 
                    className="donut-legend-color" 
                    style={{ backgroundColor: statusColors[status] || "#9ca3af" }}
                  ></span>
                  <span className="donut-legend-label">{status.replace('_', ' ')}</span>
                  <span className="donut-legend-value">{count} ({formatNumber(percentage)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown */}
      <div className="chart-card full-width">
        <h3>Wood Distribution Breakdown</h3>
        <div className="distribution-grid">
          <div className="distribution-item">
            <div className="distribution-label">Direct Deliveries</div>
            <div className="distribution-bar-container">
              <div 
                className="distribution-bar"
                style={{ 
                  width: `${(metrics.wood.delivered / metrics.wood.totalDistributed) * 100}%`,
                  backgroundColor: "#2d6b3d"
                }}
              />
            </div>
            <div className="distribution-value">{formatNumber(metrics.wood.delivered)} cords</div>
          </div>
          <div className="distribution-item">
            <div className="distribution-label">Pickup Services</div>
            <div className="distribution-bar-container">
              <div 
                className="distribution-bar"
                style={{ 
                  width: `${(metrics.wood.pickedUp / metrics.wood.totalDistributed) * 100}%`,
                  backgroundColor: "#e67f1e"
                }}
              />
            </div>
            <div className="distribution-value">{formatNumber(metrics.wood.pickedUp)} cords</div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      {(expenses.length > 0 || donations.length > 0) && (
        <div className="chart-card full-width">
          <h3>Financial Overview</h3>
          <div className="financial-grid">
            <div className="financial-item positive">
              <div className="financial-label">Total Donations</div>
              <div className="financial-value">+{formatCurrency(metrics.financial.totalDonationsValue)}</div>
            </div>
            <div className="financial-item negative">
              <div className="financial-label">Total Expenses</div>
              <div className="financial-value">-{formatCurrency(metrics.financial.totalExpenses)}</div>
            </div>
            <div className="financial-item net">
              <div className="financial-label">Net Position</div>
              <div className="financial-value" style={{ 
                color: metrics.financial.netPosition >= 0 ? "#2d6b3d" : "#b3261e" 
              }}>
                {formatCurrency(metrics.financial.netPosition)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operational Details */}
      <div className="details-grid">
        <div className="detail-card">
          <h4>Operational Performance</h4>
          <div className="detail-list">
            <div className="detail-item">
              <span>Active Work Orders</span>
              <span className="detail-value">{metrics.operational.activeWorkOrders}</span>
            </div>
            <div className="detail-item">
              <span>Recent Deliveries (30 days)</span>
              <span className="detail-value">{metrics.operational.recentDeliveries}</span>
            </div>
            <div className="detail-item">
              <span>Avg Delivery Size</span>
              <span className="detail-value">{formatNumber(metrics.wood.avgDeliverySize)} cords</span>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h4>Resource Management</h4>
          <div className="detail-list">
            <div className="detail-item">
              <span>Inventory Value</span>
              <span className="detail-value">{formatCurrency(metrics.inventory.totalValue)}</span>
            </div>
            <div className="detail-item">
              <span>Total Items</span>
              <span className="detail-value">{metrics.inventory.totalItems}</span>
            </div>
            <div className="detail-item">
              <span>Low Stock Alerts</span>
              <span className="detail-value" style={{ 
                color: metrics.inventory.lowStockItems > 0 ? "#b3261e" : "#2d6b3d" 
              }}>
                {metrics.inventory.lowStockItems}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h4>Team Capacity</h4>
          <div className="detail-list">
            <div className="detail-item">
              <span>Staff Members</span>
              <span className="detail-value">{metrics.people.totalStaff}</span>
            </div>
            <div className="detail-item">
              <span>Licensed Drivers</span>
              <span className="detail-value">{metrics.people.totalDrivers}</span>
            </div>
            <div className="detail-item">
              <span>Client Satisfaction</span>
              <span className="detail-value">{formatNumber(metrics.efficiency.clientSatisfaction)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demographics Section */}
      <div className="chart-card full-width">
        <h3>Demographics Breakdown</h3>
        <div className="demographics-grid">
          <div className="demographics-section">
            <h4>Households</h4>
            <div className="demographics-breakdown">
              <div className="demographic-item">
                <div className="demographic-label">Households with Minors</div>
                <div className="demographic-bar-container">
                  <div 
                    className="demographic-bar minor"
                    style={{ 
                      width: `${metrics.operational.totalClients > 0 ? (metrics.demographics.householdMinors / metrics.operational.totalClients) * 100 : 0}%`,
                      backgroundColor: "#f59e0b"
                    }}
                  />
                </div>
                <div className="demographic-value">{metrics.demographics.householdMinors}</div>
              </div>
              <div className="demographic-item">
                <div className="demographic-label">Households with Adults Only</div>
                <div className="demographic-bar-container">
                  <div 
                    className="demographic-bar adult"
                    style={{ 
                      width: `${metrics.operational.totalClients > 0 ? (metrics.demographics.householdAdults / metrics.operational.totalClients) * 100 : 0}%`,
                      backgroundColor: "#2d6b3d"
                    }}
                  />
                </div>
                <div className="demographic-value">{metrics.demographics.householdAdults}</div>
              </div>
            </div>
            <div className="demographics-summary">
              <div className="summary-item">
                <span>Total Individual Clients (Minors):</span>
                <span className="summary-value">{metrics.demographics.totalMinors}</span>
              </div>
              <div className="summary-item">
                <span>Total Individual Clients (Adults):</span>
                <span className="summary-value">{metrics.demographics.totalAdults}</span>
              </div>
            </div>
          </div>

          <div className="demographics-section">
            <h4>Volunteers & Staff</h4>
            <div className="demographics-breakdown">
              <div className="demographic-item">
                <div className="demographic-label">Volunteers (Minors)</div>
                <div className="demographic-bar-container">
                  <div 
                    className="demographic-bar minor"
                    style={{ 
                      width: `${metrics.people.totalVolunteers > 0 ? (metrics.people.volunteerMinors / metrics.people.totalVolunteers) * 100 : 0}%`,
                      backgroundColor: "#f59e0b"
                    }}
                  />
                </div>
                <div className="demographic-value">{metrics.people.volunteerMinors}</div>
              </div>
              <div className="demographic-item">
                <div className="demographic-label">Volunteers (Adults)</div>
                <div className="demographic-bar-container">
                  <div 
                    className="demographic-bar adult"
                    style={{ 
                      width: `${metrics.people.totalVolunteers > 0 ? (metrics.people.volunteerAdults / metrics.people.totalVolunteers) * 100 : 0}%`,
                      backgroundColor: "#2d6b3d"
                    }}
                  />
                </div>
                <div className="demographic-value">{metrics.people.volunteerAdults}</div>
              </div>
              <div className="demographic-item">
                <div className="demographic-label">Staff (Minors)</div>
                <div className="demographic-bar-container">
                  <div 
                    className="demographic-bar minor"
                    style={{ 
                      width: `${metrics.people.totalStaff > 0 ? (metrics.people.staffMinors / metrics.people.totalStaff) * 100 : 0}%`,
                      backgroundColor: "#f59e0b"
                    }}
                  />
                </div>
                <div className="demographic-value">{metrics.people.staffMinors}</div>
              </div>
              <div className="demographic-item">
                <div className="demographic-label">Staff (Adults)</div>
                <div className="demographic-bar-container">
                  <div 
                    className="demographic-bar adult"
                    style={{ 
                      width: `${metrics.people.totalStaff > 0 ? (metrics.people.staffAdults / metrics.people.totalStaff) * 100 : 0}%`,
                      backgroundColor: "#2d6b3d"
                    }}
                  />
                </div>
                <div className="demographic-value">{metrics.people.staffAdults}</div>
              </div>
            </div>
            <div className="demographics-note" style={{ fontSize: "0.875rem", color: "#666", marginTop: "1rem", fontStyle: "italic" }}>
              Note: Age tracking for volunteers and staff requires date of birth fields to be added to user profiles.
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .metrics-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .print-header {
          display: none;
        }

        .metrics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .metrics-header h2 {
          margin: 0;
          font-size: 2rem;
          color: var(--brand-green);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .metric-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border-left: 4px solid;
          transition: transform 0.2s;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }

        .metric-card.primary { border-left-color: #2d6b3d; }
        .metric-card.success { border-left-color: #2d6b3d; }
        .metric-card.warning { border-left-color: #e67f1e; }
        .metric-card.info { border-left-color: #4f46e5; }

        .metric-icon {
          font-size: 3rem;
          line-height: 1;
        }

        .metric-content {
          flex: 1;
        }

        .metric-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.2;
        }

        .metric-sublabel {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .charts-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }

        .chart-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .chart-card.full-width {
          grid-column: 1 / -1;
        }

        .chart-card h3 {
          margin: 0 0 20px;
          font-size: 1.25rem;
          color: var(--brand-green);
        }

        .chart-container {
          position: relative;
        }

        .bar-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          height: 200px;
          gap: 12px;
          margin-bottom: 16px;
        }

        .bar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .bar-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          width: 100%;
          height: 100%;
        }

        .bar {
          flex: 1;
          min-height: 4px;
          border-radius: 4px 4px 0 0;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .bar:hover {
          opacity: 0.8;
        }

        .bar-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 16px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }

        .donut-chart {
          position: relative;
          width: 200px;
          height: 200px;
          margin: 0 auto 24px;
        }

        .donut-svg {
          width: 100%;
          height: 100%;
        }

        .donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .donut-center-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .donut-center-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .donut-legend-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.875rem;
        }

        .donut-legend-color {
          width: 20px;
          height: 20px;
          border-radius: 50%;
        }

        .donut-legend-label {
          flex: 1;
          text-transform: capitalize;
          color: var(--text-main);
        }

        .donut-legend-value {
          color: var(--text-muted);
          font-weight: 600;
        }

        .distribution-grid {
          display: grid;
          gap: 20px;
        }

        .distribution-item {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .distribution-label {
          min-width: 140px;
          font-weight: 600;
          color: var(--text-main);
        }

        .distribution-bar-container {
          flex: 1;
          height: 32px;
          background: #f3f4f6;
          border-radius: 16px;
          overflow: hidden;
        }

        .distribution-bar {
          height: 100%;
          border-radius: 16px;
          transition: width 0.5s ease;
        }

        .distribution-value {
          min-width: 100px;
          text-align: right;
          font-weight: 700;
          color: var(--text-main);
        }

        .financial-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .financial-item {
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }

        .financial-item.positive {
          background: #f0fdf4;
          border: 2px solid #2d6b3d;
        }

        .financial-item.negative {
          background: #fef2f2;
          border: 2px solid #b3261e;
        }

        .financial-item.net {
          background: #f9fafb;
          border: 2px solid #6b7280;
        }

        .financial-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 8px;
          font-weight: 600;
        }

        .financial-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .detail-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .detail-card h4 {
          margin: 0 0 16px;
          color: var(--brand-green);
          font-size: 1.125rem;
        }

        .detail-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .detail-value {
          font-weight: 700;
          color: var(--text-main);
        }

        .demographics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 32px;
          margin-top: 20px;
        }

        .demographics-section {
          padding: 20px;
          background: #f9fafb;
          border-radius: 12px;
        }

        .demographics-section h4 {
          margin: 0 0 20px;
          color: var(--brand-green);
          font-size: 1.125rem;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 12px;
        }

        .demographics-breakdown {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .demographic-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .demographic-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .demographic-bar-container {
          height: 32px;
          background: #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
        }

        .demographic-bar {
          height: 100%;
          border-radius: 16px;
          transition: width 0.5s ease;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 12px;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .demographic-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          text-align: right;
        }

        .demographics-summary {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .summary-value {
          font-weight: 700;
          color: var(--brand-green);
        }

        .demographics-note {
          font-size: 0.875rem;
          color: #666;
          margin-top: 1rem;
          font-style: italic;
          padding: 12px;
          background: #fff3cd;
          border-left: 4px solid #f59e0b;
          border-radius: 4px;
        }

        /* Print Styles */
        @media print {
          body {
            background: white;
          }

          .print-header {
            display: block;
            margin-bottom: 40px;
            border-bottom: 3px solid var(--brand-green);
            padding-bottom: 20px;
          }

          .print-letterhead {
            display: flex;
            align-items: center;
            gap: 24px;
          }

          .letterhead-logo img {
            height: 80px;
            width: auto;
          }

          .letterhead-text h1 {
            margin: 0;
            font-size: 2rem;
            color: var(--brand-green);
          }

          .letterhead-text p {
            margin: 4px 0;
            color: var(--text-muted);
          }

          .print-date {
            font-size: 0.875rem;
            font-style: italic;
          }

          .metrics-header button,
          .ghost {
            display: none;
          }

          .metrics-dashboard {
            padding: 0;
          }

          .metric-card,
          .chart-card,
          .detail-card {
            page-break-inside: avoid;
            box-shadow: none;
            border: 1px solid #e5e7eb;
          }

          .charts-row {
            page-break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
}
