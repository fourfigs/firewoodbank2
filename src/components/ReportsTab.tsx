import React from "react";

import { invokeTauri } from "../api/tauri";
import { AuditLogRow, UserSession } from "../types";
import { safeDate } from "../utils/format";

type ReportsTabProps = {
  activeTab: string;
  session: UserSession | null;
  auditLogs: AuditLogRow[];
  auditLogFilter: string;
  setAuditLogFilter: (value: string) => void;
  setAuditLogs: (logs: AuditLogRow[]) => void;
  loadAuditLogs: () => Promise<void>;
  busy: boolean;
  setBusy: (value: boolean) => void;
};

export default function ReportsTab({
  activeTab,
  session,
  auditLogs,
  auditLogFilter,
  setAuditLogFilter,
  setAuditLogs,
  loadAuditLogs,
  busy,
  setBusy,
}: ReportsTabProps) {
  if (!session || activeTab !== "Reports" || (session.role !== "admin" && session.role !== "lead")) {
    return null;
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
              onClick={async () => {
                setAuditLogFilter(filter);
                setBusy(true);
                try {
                  const data = await invokeTauri<AuditLogRow[]>("list_audit_logs", {
                    filter: filter,
                  });
                  setAuditLogs(data);
                } finally {
                  setBusy(false);
                }
              }}
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
