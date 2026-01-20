import React, { useState, useMemo } from "react";
import { UserRow, UserSession } from "../types";

interface WorkerDirectoryProps {
  session: UserSession;
  users: UserRow[];
  busy: boolean;
  // State management props
  selectedWorker: UserRow | null;
  setSelectedWorker: (worker: UserRow | null) => void;
  workerEdit: Partial<UserRow> | null;
  setWorkerEdit: (edit: Partial<UserRow> | null) => void;
  workerError: string | null;
  setWorkerError: (error: string | null) => void;
  showWorkerForm: boolean;
  setShowWorkerForm: (show: boolean) => void;
  // Actions
  loadUsers: () => Promise<void>;
}

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const SCHEDULE_OPTIONS = [
  { value: "", label: "Not Available" },
  { value: "am", label: "AM" },
  { value: "pm", label: "PM" },
  { value: "call", label: "Call to Check" },
  { value: "call_prior", label: "Call Prior" },
] as const;

export default function WorkerDirectory(props: WorkerDirectoryProps) {
  const {
    session,
    users,
    busy,
    selectedWorker,
    setSelectedWorker,
    workerEdit,
    setWorkerEdit,
    workerError,
    setWorkerError,
    showWorkerForm,
    setShowWorkerForm,
    loadUsers,
  } = props;

  const canManage = session.role === "admin" || session.role === "lead";

  // Filter to show only session user + workers (for admin/lead)
  const visibleWorkers = useMemo(() => {
    if (canManage) {
      return users;
    }
    // For other roles, only show their own profile
    return users.filter(u => u.name === session.name);
  }, [users, session, canManage]);

  // Parse schedule from JSON string
  const parseSchedule = (scheduleStr: string | null): Record<string, string> => {
    if (!scheduleStr) return {};
    try {
      return JSON.parse(scheduleStr);
    } catch {
      return {};
    }
  };

  // Format schedule for display
  const formatSchedule = (schedule: Record<string, string>): string => {
    const availableDays = DAYS_OF_WEEK.filter(day => schedule[day] && schedule[day] !== "");
    if (availableDays.length === 0) return "No availability set";

    if (availableDays.length === 7 && Object.values(schedule).every(v => v === schedule.monday)) {
      return `${SCHEDULE_OPTIONS.find(opt => opt.value === schedule.monday)?.label || schedule.monday} (All days)`;
    }

    return availableDays
      .map(day => `${day.slice(0, 3)}: ${SCHEDULE_OPTIONS.find(opt => opt.value === schedule[day])?.label || schedule[day]}`)
      .join(", ");
  };

  return (
    <div className="stack">
      {/* Header */}
      <div className="card">
        <div className="add-header">
          {(session.role === "admin" || session.role === "lead") && (
            <button
              type="button"
              className="icon-button"
              title="Add new worker"
              onClick={() => setShowWorkerForm(true)}
              disabled={busy}
            >
              +
            </button>
          )}
          <h3>Worker Directory</h3>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span className="badge">
              {visibleWorkers.length} workers
            </span>
            <span className="badge" style={{ background: "#4caf50", color: "white" }}>
              {visibleWorkers.filter(w => w.is_driver).length} drivers
            </span>
            <span className="badge" style={{ background: "#2196f3", color: "white" }}>
              {visibleWorkers.filter(w => w.hipaa_certified).length} HIPAA certified
            </span>
          </div>
        </div>

        {!canManage && (
          <p className="muted">You can only view and edit your own profile.</p>
        )}
      </div>

      {/* Worker list */}
      <div className="card">
        <div style={{ maxHeight: "600px", overflow: "auto" }}>
          {visibleWorkers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
              No workers found.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Driver</th>
                  <th>HIPAA</th>
                  <th>Schedule</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleWorkers.map(worker => {
                  const schedule = parseSchedule(worker.availability_schedule);
                  const canManage = session.role === "admin" || session.role === "lead";
                  const canEdit = canManage || worker.name === session.name;

                  return (
                    <tr key={worker.id}>
                      <td>
                        <strong>{worker.name}</strong>
                        {worker.email && (
                          <div style={{ fontSize: "0.8rem", color: "#666" }}>
                            {worker.email}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          textTransform: "capitalize",
                          fontWeight: worker.role === "admin" ? "bold" : "normal",
                          color: worker.role === "admin" ? "#f44336" :
                                 worker.role === "lead" ? "#ff9800" : "#666"
                        }}>
                          {worker.role}
                        </span>
                      </td>
                      <td>{worker.telephone || "N/A"}</td>
                      <td>
                        {worker.is_driver ? (
                          <span className="badge" style={{ background: "#4caf50", color: "white" }}>
                            ✓ Driver
                          </span>
                        ) : (
                          <span className="badge" style={{ background: "#f5f5f5", color: "#666" }}>
                            Not Driver
                          </span>
                        )}
                      </td>
                      <td>
                        {worker.hipaa_certified ? (
                          <span className="badge" style={{ background: "#2196f3", color: "white" }}>
                            ✓ Certified
                          </span>
                        ) : (
                          <span className="badge" style={{ background: "#f5f5f5", color: "#666" }}>
                            Not Certified
                          </span>
                        )}
                      </td>
                      <td style={{ maxWidth: "200px" }}>
                        <div style={{ fontSize: "0.8rem" }}>
                          {formatSchedule(schedule)}
                        </div>
                      </td>
                      <td>
                        {canEdit && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => {
                              setSelectedWorker(worker);
                              setWorkerEdit({ ...worker });
                            }}
                            disabled={busy}
                          >
                            Edit Profile
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Worker Profile Edit Modal */}
      {workerEdit && selectedWorker && (
        <div className="modal-overlay" onClick={() => setWorkerEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Worker Profile - {selectedWorker.name}</h3>
              <button
                className="ghost"
                onClick={() => setWorkerEdit(null)}
                style={{ padding: "0.25rem 0.5rem" }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setWorkerError(null);

                  try {
                    // TODO: Implement worker profile update
                    console.log("Update worker profile:", workerEdit);
                    setWorkerEdit(null);
                    await loadUsers();
                  } catch (err) {
                    setWorkerError(typeof err === "string" ? err : "Failed to update worker profile");
                  }
                }}
              >
                {/* Basic Information */}
                <div className="form-grid">
                  <label>
                    Phone
                    <input
                      type="tel"
                      value={workerEdit.telephone || ""}
                      onChange={(e) => setWorkerEdit({ ...workerEdit, telephone: e.target.value })}
                    />
                  </label>

                  <label>
                    Email
                    <input
                      type="email"
                      value={workerEdit.email || ""}
                      onChange={(e) => setWorkerEdit({ ...workerEdit, email: e.target.value })}
                    />
                  </label>
                </div>

                {/* Schedule Section */}
                <fieldset style={{ marginTop: "1rem" }}>
                  <legend>Weekly Schedule</legend>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem" }}>
                    {DAYS_OF_WEEK.map(day => {
                      const schedule = parseSchedule(workerEdit.availability_schedule);
                      return (
                        <label key={day} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <span style={{ fontWeight: "bold", textTransform: "capitalize", fontSize: "0.9rem" }}>
                            {day.slice(0, 3)}
                          </span>
                          <select
                            value={schedule[day] || ""}
                            onChange={(e) => {
                              const newSchedule = { ...schedule, [day]: e.target.value };
                              setWorkerEdit({
                                ...workerEdit,
                                availability_schedule: JSON.stringify(newSchedule)
                              });
                            }}
                            style={{ padding: "0.25rem", fontSize: "0.8rem" }}
                          >
                            {SCHEDULE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>

                  <label style={{ marginTop: "0.5rem" }}>
                    Schedule Notes
                    <textarea
                      value={workerEdit.availability_notes || ""}
                      onChange={(e) => setWorkerEdit({ ...workerEdit, availability_notes: e.target.value })}
                      placeholder="Additional notes about availability..."
                      rows={2}
                      style={{ width: "100%" }}
                    />
                  </label>
                </fieldset>

                {/* Certifications Section */}
                <fieldset style={{ marginTop: "1rem" }}>
                  <legend>Certifications & Permissions</legend>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={workerEdit.is_driver || false}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, is_driver: e.target.checked })}
                      />
                      <span>Driver License (enables delivery assignments)</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={workerEdit.hipaa_certified || false}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, hipaa_certified: e.target.checked })}
                      />
                      <span>HIPAA Certified (removes PII filters)</span>
                    </label>
                  </div>

                  <div className="form-grid" style={{ marginTop: "0.5rem" }}>
                    <label>
                      Driver License Status
                      <select
                        value={workerEdit.driver_license_status || ""}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, driver_license_status: e.target.value })}
                      >
                        <option value="">Not Set</option>
                        <option value="valid">Valid</option>
                        <option value="expired">Expired</option>
                        <option value="suspended">Suspended</option>
                        <option value="none">No License</option>
                      </select>
                    </label>

                    <label>
                      License Number
                      <input
                        value={workerEdit.driver_license_number || ""}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, driver_license_number: e.target.value })}
                      />
                    </label>

                    <label>
                      License Expires
                      <input
                        type="date"
                        value={workerEdit.driver_license_expires_on || ""}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, driver_license_expires_on: e.target.value })}
                      />
                    </label>

                    <label>
                      Working Vehicle
                      <input
                        value={workerEdit.vehicle || ""}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, vehicle: e.target.value })}
                        placeholder="Make/Model or description"
                      />
                    </label>
                  </div>
                </fieldset>

                {/* Address Information */}
                <fieldset style={{ marginTop: "1rem" }}>
                  <legend>Address Information</legend>
                  <div className="form-grid">
                    <label>
                      Physical Address Line 1
                      <input
                        value={workerEdit.physical_address_line1 || ""}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, physical_address_line1: e.target.value })}
                      />
                    </label>

                    <label>
                      Physical Address Line 2
                      <input
                        value={workerEdit.physical_address_line2 || ""}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, physical_address_line2: e.target.value })}
                      />
                    </label>

                    <label>
                      City
                      <input
                        value={workerEdit.physical_address_city || ""}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, physical_address_city: e.target.value })}
                      />
                    </label>

                    <label>
                      State
                      <input
                        value={workerEdit.physical_address_state || ""}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, physical_address_state: e.target.value })}
                      />
                    </label>

                    <label>
                      ZIP Code
                      <input
                        value={workerEdit.physical_address_postal_code || ""}
                        onChange={(e) => setWorkerEdit({ ...workerEdit, physical_address_postal_code: e.target.value })}
                      />
                    </label>
                  </div>
                </fieldset>

                {workerError && (
                  <div className="error-message" style={{ marginTop: "1rem" }}>
                    {workerError}
                  </div>
                )}

                <div className="actions" style={{ marginTop: "1rem" }}>
                  <button type="submit" className="primary" disabled={busy}>
                    Update Profile
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setWorkerEdit(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Worker Form Modal */}
      {showWorkerForm && (
        <div className="modal-overlay" onClick={() => setShowWorkerForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Worker</h3>
              <button
                className="ghost"
                onClick={() => setShowWorkerForm(false)}
                style={{ padding: "0.25rem 0.5rem" }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>Add new worker form coming soon...</p>
              <p>This will include name, contact info, role assignment, and auto-generated username.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}