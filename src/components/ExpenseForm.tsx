import React, { useState } from "react";

import { invokeTauri } from "../api/tauri";
import { UserSession } from "../types";

interface ExpenseFormProps {
  session: UserSession;
  onExpenseAdded: () => Promise<void>;
  onCancel: () => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}

export default function ExpenseForm({
  session,
  onExpenseAdded,
  onCancel,
  busy,
  setBusy,
}: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "supplies",
    vendor: "",
    expense_date: new Date().toISOString().split('T')[0],
    work_order_id: "",
    notes: "",
  });

  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: "fuel", label: "Fuel" },
    { value: "equipment", label: "Equipment" },
    { value: "supplies", label: "Supplies" },
    { value: "maintenance", label: "Maintenance" },
    { value: "insurance", label: "Insurance" },
    { value: "utilities", label: "Utilities" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }

    if (!formData.description.trim()) {
      setError("Description is required.");
      return;
    }

    setBusy(true);
    try {
      await invokeTauri("create_expense", {
        input: {
          description: formData.description.trim(),
          amount: amount,
          category: formData.category,
          vendor: formData.vendor.trim() || null,
          expense_date: formData.expense_date,
          work_order_id: formData.work_order_id.trim() || null,
          notes: formData.notes.trim() || null,
        },
        role: session.role,
        actor: session.username,
      });

      await onExpenseAdded();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <h3>Record Expense</h3>

        {error && (
          <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="grid">
          <label>
            Description *
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was purchased or paid for?"
            />
          </label>

          <label>
            Amount *
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </label>

          <label>
            Category *
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Vendor
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="Where was it purchased?"
            />
          </label>

          <label>
            Date *
            <input
              type="date"
              required
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            />
          </label>

          <label>
            Related Work Order
            <input
              type="text"
              value={formData.work_order_id}
              onChange={(e) => setFormData({ ...formData, work_order_id: e.target.value })}
              placeholder="Work order ID if applicable"
            />
          </label>
        </div>

        <label>
          Notes
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional details..."
            rows={3}
          />
        </label>

        <div className="actions">
          <button
            type="submit"
            className="ping"
            disabled={busy}
          >
            {busy ? "Saving..." : "Save Expense"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}