import React, { useMemo, useState } from "react";

import { invokeTauri } from "../api/tauri";
import { ExpenseRow, DonationRow, TimeEntryRow, BudgetCategoryRow, UserSession, UserRow, WorkOrderRow } from "../types";
import ExpenseForm from "./ExpenseForm";
import DonationForm from "./DonationForm";
import TimeEntryForm from "./TimeEntryForm";
import FinancialReport from "./FinancialReport";

interface FinancialDashboardProps {
  session: UserSession;
  expenses: ExpenseRow[];
  donations: DonationRow[];
  timeEntries: TimeEntryRow[];
  budgetCategories: BudgetCategoryRow[];
  users: UserRow[];
  workOrders: WorkOrderRow[];
  onRefreshExpenses: () => Promise<void>;
  onRefreshDonations: () => Promise<void>;
  onRefreshTimeEntries: () => Promise<void>;
  onRefreshBudgetCategories: () => Promise<void>;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}

export default function FinancialDashboard({
  session,
  expenses,
  donations,
  timeEntries,
  budgetCategories,
  users,
  workOrders,
  onRefreshExpenses,
  onRefreshDonations,
  onRefreshTimeEntries,
  onRefreshBudgetCategories,
  busy,
  setBusy,
}: FinancialDashboardProps) {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>({});
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const canEditBudgets =
    session.role === "admin" || session.role === "lead" || session.role === "staff";
  const financialMetrics = useMemo(() => {
    // Expense metrics
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const expensesByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    // Donation metrics
    const totalDonationsValue = donations.reduce((sum, don) => sum + (don.monetary_value || 0), 0);

    const donationsByType = donations.reduce((acc, don) => {
      acc[don.donation_type] = (acc[don.donation_type] || 0) + (don.monetary_value || 0);
      return acc;
    }, {} as Record<string, number>);

    // Time tracking metrics
    const totalVolunteerHours = timeEntries
      .filter(entry => entry.is_volunteer_time === 1)
      .reduce((sum, entry) => sum + entry.hours_worked, 0);

    const totalPaidHours = timeEntries
      .filter(entry => entry.is_volunteer_time === 0)
      .reduce((sum, entry) => sum + entry.hours_worked, 0);

    const totalLaborCost = timeEntries
      .filter(entry => entry.is_volunteer_time === 0 && entry.hourly_rate)
      .reduce((sum, entry) => sum + (entry.hours_worked * (entry.hourly_rate || 0)), 0);

    // Budget analysis
    const expenseBudgets = budgetCategories
      .filter(cat => cat.category_type === 'expense' && cat.annual_budget)
      .map(cat => ({
        category: cat.id,
        name: cat.name,
        budget: cat.annual_budget!,
        spent: expensesByCategory[cat.id] || 0,
        remaining: cat.annual_budget! - (expensesByCategory[cat.id] || 0),
        percentUsed: ((expensesByCategory[cat.id] || 0) / cat.annual_budget!) * 100
      }));

    // Monthly trends (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.expense_date);
      return expDate >= threeMonthsAgo;
    });

    const recentDonations = donations.filter(don => {
      const donDate = new Date(don.received_date);
      return donDate >= threeMonthsAgo;
    });

    return {
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
        recent: recentExpenses.length,
        monthlyAvg: recentExpenses.length > 0 ? recentExpenses.reduce((sum, exp) => sum + exp.amount, 0) / 3 : 0,
      },
      donations: {
        totalValue: totalDonationsValue,
        byType: donationsByType,
        count: donations.length,
        recent: recentDonations.length,
      },
      time: {
        volunteerHours: totalVolunteerHours,
        paidHours: totalPaidHours,
        totalHours: totalVolunteerHours + totalPaidHours,
        laborCost: totalLaborCost,
        volunteerValue: totalVolunteerHours * 31, // Volunteer hours valued at $31/hour
      },
      budget: {
        categories: expenseBudgets,
        totalBudget: expenseBudgets.reduce((sum, cat) => sum + cat.budget, 0),
        totalSpent: expenseBudgets.reduce((sum, cat) => sum + cat.spent, 0),
      }
    };
  }, [expenses, donations, timeEntries, budgetCategories]);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (num: number, decimals = 1) =>
    num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const handleBudgetChange = (id: string, value: string) => {
    setEditingBudgets((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveBudget = async (id: string) => {
    if (!canEditBudgets) return;
    const raw = editingBudgets[id] ?? "";
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && (Number.isNaN(parsed) || parsed < 0)) {
      setBudgetError("Budget must be a non-negative number or blank.");
      return;
    }
    setBudgetError(null);
    setBusy(true);
    try {
      await invokeTauri("update_budget_category", {
        input: {
          id,
          annual_budget: parsed,
        },
        role: session.role,
        actor: session.username,
      });
      await onRefreshBudgetCategories();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update budget category.";
      setBudgetError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      {/* Financial Overview */}
      <div className="card">
        <h3>Financial Overview</h3>
        <div className="three-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Total Expenses</h4>
              <span className="muted">This period</span>
            </div>
            <p style={{ fontSize: 32, margin: 0, color: "#b3261e" }}>
              {formatCurrency(financialMetrics.expenses.total)}
            </p>
            <p className="muted">
              {formatCurrency(financialMetrics.expenses.monthlyAvg)}/month avg
            </p>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Donations Received</h4>
              <span className="muted">Total value</span>
            </div>
            <p style={{ fontSize: 32, margin: 0, color: "#2d6b3d" }}>
              {formatCurrency(financialMetrics.donations.totalValue)}
            </p>
            <p className="muted">
              {financialMetrics.donations.count} donations
            </p>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Net Position</h4>
              <span className="muted">Revenue - Expenses</span>
            </div>
            <p style={{
              fontSize: 32,
              margin: 0,
              color: financialMetrics.donations.totalValue - financialMetrics.expenses.total >= 0 ? "#2d6b3d" : "#b3261e"
            }}>
              {formatCurrency(financialMetrics.donations.totalValue - financialMetrics.expenses.total)}
            </p>
            <p className="muted">
              {formatCurrency(financialMetrics.donations.totalValue - financialMetrics.expenses.total >= 0 ?
                financialMetrics.donations.totalValue - financialMetrics.expenses.total :
                financialMetrics.expenses.total - financialMetrics.donations.totalValue)} surplus
            </p>
          </div>
        </div>
      </div>

      {/* Labor & Volunteer Impact */}
      <div className="card">
        <h3>Labor & Volunteer Impact</h3>
        <div className="three-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Volunteer Hours</h4>
              <span className="muted">Community contribution</span>
            </div>
            <p style={{ fontSize: 28, margin: 0, color: "#e67f1e" }}>
              {formatNumber(financialMetrics.time.volunteerHours)}
            </p>
            <p className="muted">
              ${formatNumber(financialMetrics.time.volunteerValue)} estimated value
            </p>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Paid Hours</h4>
              <span className="muted">Staff time</span>
            </div>
            <p style={{ fontSize: 28, margin: 0 }}>
              {formatNumber(financialMetrics.time.paidHours)}
            </p>
            <p className="muted">
              ${formatNumber(financialMetrics.time.laborCost)} labor cost
            </p>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Total Hours</h4>
              <span className="muted">Combined effort</span>
            </div>
            <p style={{ fontSize: 28, margin: 0, color: "#2d6b3d" }}>
              {formatNumber(financialMetrics.time.totalHours)}
            </p>
            <p className="muted">
              {formatNumber(financialMetrics.time.totalHours / financialMetrics.donations.count || 1)} hrs/donation
            </p>
          </div>
        </div>
      </div>

      {/* Time Tracking */}
      <div className="card">
        <h3>Time Tracking</h3>
        <div className="two-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Recent Time Entries</h4>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="ping small"
                  onClick={() => setShowTimeEntryForm(true)}
                  disabled={busy}
                >
                  + Log Time
                </button>
                <button className="ghost" onClick={onRefreshTimeEntries} disabled={busy}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              {timeEntries.slice(0, 3).map((entry) => (
                <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>
                      {users.find(u => u.id === entry.user_id)?.name || "Unknown"}
                    </div>
                    <div className="muted" style={{ fontSize: "0.875rem" }}>
                      {entry.activity_type} • {entry.date_worked}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>{entry.hours_worked}h</div>
                    <div className="pill" style={{
                      background: entry.is_volunteer_time ? "#e8f5e9" : "#fff3cd",
                      color: entry.is_volunteer_time ? "#2d6b3d" : "#856404",
                      fontSize: "0.75rem"
                    }}>
                      {entry.is_volunteer_time ? "Volunteer" : "Paid"}
                    </div>
                  </div>
                </div>
              ))}
              {timeEntries.length === 0 && (
                <p className="muted">No time entries recorded yet</p>
              )}
            </div>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Time Summary</h4>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Volunteer Hours:</span>
                <span>{formatNumber(financialMetrics.time.volunteerHours)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Paid Hours:</span>
                <span>{formatNumber(financialMetrics.time.paidHours)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Total Hours:</span>
                <span>{formatNumber(financialMetrics.time.totalHours)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Analysis */}
      <div className="card">
        <h3>Budget Analysis</h3>
        <div className="two-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Budget Overview</h4>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: 24, margin: 0 }}>
                {formatCurrency(financialMetrics.budget.totalSpent)} spent of {formatCurrency(financialMetrics.budget.totalBudget)}
              </p>
              <p className="muted">
                {formatNumber((financialMetrics.budget.totalSpent / financialMetrics.budget.totalBudget) * 100)}% of annual budget
              </p>
            </div>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Budget Categories</h4>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              {budgetError && (
                <div
                  className="pill"
                  style={{ background: "#fbe2e2", color: "#b3261e" }}
                >
                  {budgetError}
                </div>
              )}
              {budgetCategories
                .filter((cat) => cat.category_type === "expense")
                .map((cat) => {
                  const metrics = financialMetrics.budget.categories.find(
                    (m) => m.category === cat.id,
                  );
                  const displayBudget =
                    editingBudgets[cat.id] ??
                    (cat.annual_budget != null ? String(cat.annual_budget) : "");
                  const percentUsed = metrics?.percentUsed ?? 0;
                  return (
                    <div
                      key={cat.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: canEditBudgets
                          ? "2fr 1.2fr 1fr auto"
                          : "2fr 1.2fr 1fr",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span>{cat.name}</span>
                      <div>
                        <span className="muted">Budget: </span>
                        {canEditBudgets ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={displayBudget}
                            onChange={(e) =>
                              handleBudgetChange(cat.id, e.target.value)
                            }
                            style={{
                              width: "110px",
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "1px solid #d7c6b6",
                              fontSize: "0.85rem",
                            }}
                            disabled={busy}
                          />
                        ) : (
                          <strong>
                            {cat.annual_budget != null
                              ? formatCurrency(cat.annual_budget)
                              : "—"}
                          </strong>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 60, textAlign: "right" }}>
                          {formatNumber(percentUsed)}%
                        </span>
                        <div
                          style={{
                            width: 60,
                            height: 6,
                            background: "#f1e6d7",
                            borderRadius: 3,
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: `${Math.min(percentUsed, 100)}%`,
                              background:
                                percentUsed > 90
                                  ? "#b3261e"
                                  : percentUsed > 75
                                  ? "#e67f1e"
                                  : "#2d6b3d",
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </div>
                      {canEditBudgets && (
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => handleSaveBudget(cat.id)}
                          disabled={busy}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                        >
                          Save
                        </button>
                      )}
                    </div>
                  );
                })}
              {budgetCategories.filter((c) => c.category_type === "expense").length ===
                0 && <p className="muted">No expense budget categories configured.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3>Recent Financial Activity</h3>
        <div className="two-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Recent Expenses</h4>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="ping small"
                  onClick={() => setShowExpenseForm(true)}
                  disabled={busy}
                >
                  + Add Expense
                </button>
                <button className="ghost" onClick={onRefreshExpenses} disabled={busy}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              {expenses.slice(0, 5).map((exp) => (
                <div key={exp.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ flex: 1 }}>{exp.description}</span>
                  <span style={{ color: "#b3261e" }}>{formatCurrency(exp.amount)}</span>
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="muted">No expenses recorded yet</p>
              )}
            </div>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Recent Donations</h4>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="ping small"
                  onClick={() => setShowDonationForm(true)}
                  disabled={busy}
                >
                  + Record Donation
                </button>
                <button className="ghost" onClick={onRefreshDonations} disabled={busy}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              {donations.slice(0, 5).map((don) => (
                <div key={don.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ flex: 1 }}>{don.description}</span>
                  <span style={{ color: "#2d6b3d" }}>
                    {don.monetary_value ? formatCurrency(don.monetary_value) : "In-kind"}
                  </span>
                </div>
              ))}
              {donations.length === 0 && (
                <p className="muted">No donations recorded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Reports */}
      <div className="card">
        <h3>Detailed Financial Reports</h3>
        <FinancialReport
          expenses={expenses}
          donations={donations}
          timeEntries={timeEntries}
          budgetCategories={budgetCategories}
        />
      </div>

      {/* Action Items */}
      <div className="card muted">
        <h3>Next Steps for Financial Management</h3>
        <div className="stack">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div className="pill" style={{ background: "#f1e6d7", color: "#8b5a2b" }}>
              📊 Expense Categories
            </div>
            <div className="pill" style={{ background: "#f1e6d7", color: "#8b5a2b" }}>
              🎁 Donor Management
            </div>
            <div className="pill" style={{ background: "#f1e6d7", color: "#8b5a2b" }}>
              ⏰ Time Tracking Integration
            </div>
            <div className="pill" style={{ background: "#f1e6d7", color: "#8b5a2b" }}>
              📈 Financial Reports
            </div>
            <div className="pill" style={{ background: "#f1e6d7", color: "#8b5a2b" }}>
              📄 Receipt Storage
            </div>
          </div>
          <p className="muted">
            Enhanced financial features including detailed expense categorization,
            donor relationship management, automated time tracking integration,
            comprehensive financial reporting, and digital receipt management
            are planned for the next development phase.
          </p>
        </div>
      </div>

      {/* Form Modals */}
      {showExpenseForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowExpenseForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ExpenseForm
              session={session}
              onExpenseAdded={onRefreshExpenses}
              onCancel={() => setShowExpenseForm(false)}
              busy={busy}
              setBusy={setBusy}
            />
          </div>
        </div>
      )}

      {showDonationForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowDonationForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DonationForm
              session={session}
              onDonationAdded={onRefreshDonations}
              onCancel={() => setShowDonationForm(false)}
              busy={busy}
              setBusy={setBusy}
            />
          </div>
        </div>
      )}

      {showTimeEntryForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowTimeEntryForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <TimeEntryForm
              session={session}
              users={users}
              workOrders={workOrders}
              onTimeEntryAdded={onRefreshTimeEntries}
              onCancel={() => setShowTimeEntryForm(false)}
              busy={busy}
              setBusy={setBusy}
            />
          </div>
        </div>
      )}
    </div>
  );
}