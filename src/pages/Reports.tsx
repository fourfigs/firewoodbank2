import React, { useState, useEffect } from "react";

import { invokeTauri } from "../api/tauri";
import { AuditLogRow, UserSession } from "../types";
import { safeDate } from "../utils/format";

interface ReportsProps {
  session: UserSession;
}

export default function Reports({ session }: ReportsProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditLogFilter, setAuditLogFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const loadAuditLogs = async () => {
    setBusy(true);
    try {
      const data = await invokeTauri<AuditLogRow[]>("list_audit_logs", {
        filter: auditLogFilter,
      });
      setAuditLogs(data);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (session.role === "admin" || session.role === "lead") {
      loadAuditLogs();
    }
  }, [session, auditLogFilter]);

  if (session.role !== "admin" && session.role !== "lead") {
    return (
      <div className="stack">
        <div className="card muted">
          <h3>Access Denied</h3>
          <p>You need admin or lead permissions to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="list-card">
        <div className="list-head">
          <h3>HIPAA Compliance Checklist</h3>
        </div>
        <div className="stack">
          <div>✅ PII masking enforced for non-HIPAA roles</div>
          <div>✅ Drivers see only assigned delivery contact details</div>
          <div>✅ Audit logging active for sensitive actions</div>
          <div>✅ Role-based access gating verified</div>
          <div>✅ Change requests required for non-admin edits</div>
        </div>
      </div>
      <div className="list-card">
        <div className="list-head">
          <h3>Audit Logs ({auditLogs.length})</h3>
          <button className="ghost" onClick={loadAuditLogs} disabled={busy}>
            Refresh
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {["all", "day", "7days", "month", "year"].map((filter) => (
            <button
              key={filter}
              className={auditLogFilter === filter ? "" : "ghost"}
              type="button"
              onClick={() => setAuditLogFilter(filter)}
            >
              {filter === "all"
                ? "All Time"
                : filter === "7days"
                  ? "7 Days"
                  : filter === "month"
                    ? "Current Month"
                    : filter === "year"
                      ? "Year"
                      : "Today"}
            </button>
          ))}
        </div>
        <div className="table">
          <div className="table-head">
            <span>Timestamp</span>
            <span>Event</span>
            <span>Role</span>
            <span>Actor</span>
          </div>
          {auditLogs.map((log) => (
            <div className="table-row" key={log.id}>
              <div className="muted">
                {safeDate(log.created_at) + " " + new Date(log.created_at).toLocaleTimeString()}
              </div>
              <div>
                <strong>{log.event}</strong>
                {log.entity && log.field && (
                  <div className="muted">
                    {log.entity} · {log.field}: {log.old_value ?? "—"} →{" "}
                    {log.new_value ?? "—"}
                  </div>
                )}
              </div>
              <div className="muted">{log.role ?? "—"}</div>
              <div className="muted">{log.actor ?? "—"}</div>
            </div>
          ))}
          {!auditLogs.length && (
            <div className="table-row">No audit logs found for the selected period.</div>
          )}
        </div>
      </div>
    </div>
  );
}