import React, { useMemo, useState } from "react";

import { ExpenseRow, DonationRow, TimeEntryRow, BudgetCategoryRow } from "../types";

interface FinancialReportProps {
  expenses: ExpenseRow[];
  donations: DonationRow[];
  timeEntries: TimeEntryRow[];
  budgetCategories: BudgetCategoryRow[];
}

type ReportPeriod = 'month' | 'quarter' | 'year';

export default function FinancialReport({
  expenses,
  donations,
  timeEntries,
  budgetCategories,
}: FinancialReportProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('month');

  const reportData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (selectedPeriod) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        const quarterEnd = new Date(now.getFullYear(), quarterStart + 3, 0);
        periodLabel = `Q${Math.floor(quarterStart / 3) + 1} ${now.getFullYear()}`;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = now.getFullYear().toString();
        break;
    }

    // Filter data for the selected period
    const periodExpenses = expenses.filter(exp => new Date(exp.expense_date) >= startDate);
    const periodDonations = donations.filter(don => new Date(don.received_date) >= startDate);
    const periodTimeEntries = timeEntries.filter(entry => new Date(entry.date_worked) >= startDate);

    // Calculate totals
    const totalExpenses = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalDonations = periodDonations.reduce((sum, don) => sum + (don.monetary_value || 0), 0);
    const netIncome = totalDonations - totalExpenses;

    // Expense breakdown by category
    const expensesByCategory = periodExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    // Donation breakdown by type
    const donationsByType = periodDonations.reduce((acc, don) => {
      acc[don.donation_type] = (acc[don.donation_type] || 0) + (don.monetary_value || 0);
      return acc;
    }, {} as Record<string, number>);

    // Time tracking summary
    const volunteerHours = periodTimeEntries
      .filter(entry => entry.is_volunteer_time)
      .reduce((sum, entry) => sum + entry.hours_worked, 0);

    const paidHours = periodTimeEntries
      .filter(entry => !entry.is_volunteer_time)
      .reduce((sum, entry) => sum + entry.hours_worked, 0);

    const laborCost = periodTimeEntries
      .filter(entry => !entry.is_volunteer_time && entry.hourly_rate)
      .reduce((sum, entry) => sum + (entry.hours_worked * (entry.hourly_rate || 0)), 0);

    // Budget analysis
    const budgetAnalysis = budgetCategories
      .filter(cat => cat.category_type === 'expense')
      .map(cat => {
        const spent = expensesByCategory[cat.id] || 0;
        const budget = cat.annual_budget || 0;
        const monthlyBudget = budget / 12;
        const quarterlyBudget = budget / 4;

        let periodBudget: number;
        switch (selectedPeriod) {
          case 'month':
            periodBudget = monthlyBudget;
            break;
          case 'quarter':
            periodBudget = quarterlyBudget;
            break;
          case 'year':
            periodBudget = budget;
            break;
        }

        return {
          category: cat.name,
          spent,
          budget: periodBudget,
          variance: periodBudget - spent,
          percentUsed: periodBudget > 0 ? (spent / periodBudget) * 100 : 0,
        };
      });

    // Monthly trends for the last 6 months
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate >= monthStart && expDate <= monthEnd;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      const monthDonations = donations
        .filter(don => {
          const donDate = new Date(don.received_date);
          return donDate >= monthStart && donDate <= monthEnd;
        })
        .reduce((sum, don) => sum + (don.monetary_value || 0), 0);

      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        expenses: monthExpenses,
        donations: monthDonations,
        net: monthDonations - monthExpenses,
      });
    }

    return {
      periodLabel,
      summary: {
        totalExpenses,
        totalDonations,
        netIncome,
        volunteerHours,
        paidHours,
        laborCost,
      },
      breakdowns: {
        expensesByCategory,
        donationsByType,
      },
      budgetAnalysis,
      monthlyTrends,
    };
  }, [expenses, donations, timeEntries, budgetCategories, selectedPeriod]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatNumber = (num: number, decimals = 1) =>
    num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className="stack">
      {/* Report Header */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3>Financial Report - {reportData.periodLabel}</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {(['month', 'quarter', 'year'] as ReportPeriod[]).map((period) => (
              <button
                key={period}
                className={selectedPeriod === period ? "" : "ghost"}
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="three-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Revenue</h4>
            </div>
            <p style={{ fontSize: 32, margin: 0, color: "#2d6b3d" }}>
              {formatCurrency(reportData.summary.totalDonations)}
            </p>
            <p className="muted">
              From {Object.keys(reportData.breakdowns.donationsByType).length} donation types
            </p>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Expenses</h4>
            </div>
            <p style={{ fontSize: 32, margin: 0, color: "#b3261e" }}>
              {formatCurrency(reportData.summary.totalExpenses)}
            </p>
            <p className="muted">
              Across {Object.keys(reportData.breakdowns.expensesByCategory).length} categories
            </p>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Net Income</h4>
            </div>
            <p style={{
              fontSize: 32,
              margin: 0,
              color: reportData.summary.netIncome >= 0 ? "#2d6b3d" : "#b3261e"
            }}>
              {formatCurrency(reportData.summary.netIncome)}
            </p>
            <p className="muted">
              {reportData.summary.netIncome >= 0 ? "Surplus" : "Deficit"}
            </p>
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="card">
        <h3>Expense Breakdown</h3>
        <div className="table">
          <div className="table-head">
            <span>Category</span>
            <span>Amount</span>
            <span>% of Total</span>
          </div>
          {Object.entries(reportData.breakdowns.expensesByCategory)
            .sort(([,a], [,b]) => b - a)
            .map(([category, amount]) => (
              <div key={category} className="table-row">
                <div style={{ textTransform: "capitalize" }}>{category.replace('_', ' ')}</div>
                <div>{formatCurrency(amount)}</div>
                <div>{formatNumber((amount / reportData.summary.totalExpenses) * 100)}%</div>
              </div>
            ))}
          {Object.keys(reportData.breakdowns.expensesByCategory).length === 0 && (
            <div className="table-row">
              <div colSpan={3} style={{ textAlign: "center" }}>No expenses recorded for this period</div>
            </div>
          )}
        </div>
      </div>

      {/* Donation Breakdown */}
      <div className="card">
        <h3>Donation Breakdown</h3>
        <div className="table">
          <div className="table-head">
            <span>Type</span>
            <span>Amount</span>
            <span>% of Total</span>
          </div>
          {Object.entries(reportData.breakdowns.donationsByType)
            .sort(([,a], [,b]) => b - a)
            .map(([type, amount]) => (
              <div key={type} className="table-row">
                <div style={{ textTransform: "capitalize" }}>{type.replace('_', ' ')}</div>
                <div>{formatCurrency(amount)}</div>
                <div>{formatNumber((amount / reportData.summary.totalDonations) * 100)}%</div>
              </div>
            ))}
          {Object.keys(reportData.breakdowns.donationsByType).length === 0 && (
            <div className="table-row">
              <div colSpan={3} style={{ textAlign: "center" }}>No donations recorded for this period</div>
            </div>
          )}
        </div>
      </div>

      {/* Budget Analysis */}
      <div className="card">
        <h3>Budget Analysis</h3>
        <div className="table">
          <div className="table-head">
            <span>Category</span>
            <span>Budget</span>
            <span>Spent</span>
            <span>Variance</span>
            <span>% Used</span>
          </div>
          {reportData.budgetAnalysis.map((item) => (
            <div key={item.category} className="table-row">
              <div>{item.category}</div>
              <div>{formatCurrency(item.budget)}</div>
              <div>{formatCurrency(item.spent)}</div>
              <div style={{ color: item.variance >= 0 ? "#2d6b3d" : "#b3261e" }}>
                {formatCurrency(Math.abs(item.variance))}
                {item.variance >= 0 ? " under" : " over"}
              </div>
              <div>
                <div style={{
                  display: "inline-block",
                  width: 60,
                  height: 6,
                  background: "#f1e6d7",
                  borderRadius: 3,
                  marginRight: 8,
                  position: "relative"
                }}>
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    width: `${Math.min(item.percentUsed, 100)}%`,
                    background: item.percentUsed > 90 ? "#b3261e" : item.percentUsed > 75 ? "#e67f1e" : "#2d6b3d",
                    borderRadius: 3,
                  }} />
                </div>
                {formatNumber(item.percentUsed)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="card">
        <h3>Monthly Trends</h3>
        <div style={{ overflowX: "auto" }}>
          <div className="table">
            <div className="table-head">
              <span>Month</span>
              <span>Revenue</span>
              <span>Expenses</span>
              <span>Net</span>
            </div>
            {reportData.monthlyTrends.map((month) => (
              <div key={month.month} className="table-row">
                <div>{month.month}</div>
                <div style={{ color: "#2d6b3d" }}>{formatCurrency(month.donations)}</div>
                <div style={{ color: "#b3261e" }}>{formatCurrency(month.expenses)}</div>
                <div style={{ color: month.net >= 0 ? "#2d6b3d" : "#b3261e" }}>
                  {formatCurrency(month.net)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Labor Summary */}
      <div className="card">
        <h3>Labor Summary</h3>
        <div className="two-up">
          <div className="list-card">
            <div className="list-head">
              <h4>Hours Worked</h4>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Volunteer Hours:</span>
                <span>{formatNumber(reportData.summary.volunteerHours)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Paid Hours:</span>
                <span>{formatNumber(reportData.summary.paidHours)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Total Hours:</span>
                <span>{formatNumber(reportData.summary.volunteerHours + reportData.summary.paidHours)}</span>
              </div>
            </div>
          </div>
          <div className="list-card">
            <div className="list-head">
              <h4>Labor Costs</h4>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Paid Labor Cost:</span>
                <span>{formatCurrency(reportData.summary.laborCost)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Volunteer Value:</span>
                <span>{formatCurrency(reportData.summary.volunteerHours * 25)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Total Labor Value:</span>
                <span>{formatCurrency(reportData.summary.laborCost + (reportData.summary.volunteerHours * 25))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}