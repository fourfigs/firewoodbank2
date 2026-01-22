import React, { useState } from "react";

import { invokeTauri } from "../api/tauri";
import { UserSession, WorkOrderRow, UserRow } from "../types";

interface TimeEntryFormProps {
  session: UserSession;
  users: UserRow[];
  workOrders: WorkOrderRow[];
  onTimeEntryAdded: () => Promise<void>;
  onCancel: () => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}

export default function TimeEntryForm({
  session,
  users,
  workOrders,
  onTimeEntryAdded,
  onCancel,
  busy,
  setBusy,
}: TimeEntryFormProps) {
  const [formData, setFormData] = useState({
    user_id: session.userId || "",
    work_order_id: "",
    activity_type: "delivery",
    hours_worked: "",
    is_volunteer_time: "true",
    hourly_rate: "",
    date_worked: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const [error, setError] = useState<string | null>(null);

  const activityTypes = [
    { value: "delivery", label: "Wood Delivery" },
    { value: "pickup", label: "Wood Pickup" },
    { value: "maintenance", label: "Equipment Maintenance" },
    { value: "admin", label: "Administrative Work" },
    { value: "training", label: "Training/Education" },
    { value: "meeting", label: "Meeting/Planning" },
    { value: "other", label: "Other" },
  ];

  // Filter work orders to only show recent ones (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentWorkOrders = workOrders.filter(wo => {
    const createdDate = wo.created_at ? new Date(wo.created_at) : null;
    const scheduledDate = wo.scheduled_date ? new Date(wo.scheduled_date) : null;
    return (createdDate && createdDate >= ninetyDaysAgo) ||
           (scheduledDate && scheduledDate >= ninetyDaysAgo);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hours = parseFloat(formData.hours_worked);
    if (isNaN(hours) || hours <= 0) {
      setError("Hours worked must be a valid number greater than zero.");
      return;
    }

    const hourlyRate = formData.hourly_rate ? parseFloat(formData.hourly_rate) : null;
    if (hourlyRate !== null && (isNaN(hourlyRate) || hourlyRate < 0)) {
      setError("Hourly rate must be a valid number.");
      return;
    }

    const isVolunteer = formData.is_volunteer_time === "true";

    // If not volunteer time, hourly rate is required
    if (!isVolunteer && hourlyRate === null) {
      setError("Hourly rate is required for paid time.");
      return;
    }

    setBusy(true);
    try {
      await invokeTauri("create_time_entry", {
        input: {
          user_id: formData.user_id,
          work_order_id: formData.work_order_id || null,
          activity_type: formData.activity_type,
          hours_worked: hours,
          is_volunteer_time: isVolunteer,
          hourly_rate: hourlyRate,
          date_worked: formData.date_worked,
          notes: formData.notes.trim() || null,
        },
        role: session.role,
        actor: session.username,
      });

      await onTimeEntryAdded();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record time entry");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <h3>Record Time Entry</h3>

        {error && (
          <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="grid">
          <label>
            Person *
            <select
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              required
            >
              <option value="">Select person...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </label>

          <label>
            Activity Type *
            <select
              value={formData.activity_type}
              onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
            >
              {activityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hours Worked *
            <input
              type="number"
              step="0.25"
              min="0.25"
              required
              value={formData.hours_worked}
              onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
              placeholder="2.5"
            />
          </label>

          <label>
            Time Type *
            <select
              value={formData.is_volunteer_time}
              onChange={(e) => setFormData({ ...formData, is_volunteer_time: e.target.value })}
            >
              <option value="true">Volunteer Time</option>
              <option value="false">Paid Time</option>
            </select>
          </label>

          {formData.is_volunteer_time === "false" && (
            <label>
              Hourly Rate *
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                placeholder="25.00"
              />
            </label>
          )}

          <label>
            Date Worked *
            <input
              type="date"
              required
              value={formData.date_worked}
              onChange={(e) => setFormData({ ...formData, date_worked: e.target.value })}
            />
          </label>

          <label>
            Related Work Order
            <select
              value={formData.work_order_id}
              onChange={(e) => setFormData({ ...formData, work_order_id: e.target.value })}
            >
              <option value="">Not related to specific work order</option>
              {recentWorkOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.client_name} - {wo.scheduled_date || wo.created_at?.slice(0, 10)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Notes
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional details about the work performed..."
            rows={3}
          />
        </label>

        <div className="actions">
          <button
            type="submit"
            className="ping"
            disabled={busy}
          >
            {busy ? "Saving..." : "Record Time"}
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