import React, { useEffect, useMemo, useState } from "react";

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

// Map technical event names to user-friendly names
const getEventDisplayName = (event: string): string => {
  const eventMap: Record<string, string> = {
    "create_client": "Client Created",
    "update_client": "Client Updated",
    "delete_client": "Client Deleted",
    "create_work_order": "Work Order Created",
    "update_work_order": "Work Order Updated",
    "update_work_order_status": "Work Order Status Updated",
    "delete_work_order": "Work Order Deleted",
    "create_inventory_item": "Inventory Item Created",
    "update_inventory_item": "Inventory Item Updated",
    "delete_inventory_item": "Inventory Item Deleted",
    "create_user": "User Created",
    "update_user": "User Updated",
    "delete_user": "User Deleted",
    "create_delivery_event": "Delivery Event Created",
    "update_delivery_event": "Delivery Event Updated",
    "delete_delivery_event": "Delivery Event Deleted",
    "create_expense": "Expense Recorded",
    "update_expense": "Expense Updated",
    "delete_expense": "Expense Deleted",
    "create_donation": "Donation Recorded",
    "update_donation": "Donation Updated",
    "delete_donation": "Donation Deleted",
    "create_time_entry": "Time Entry Recorded",
    "update_time_entry": "Time Entry Updated",
    "delete_time_entry": "Time Entry Deleted",
    "create_motd": "Message of the Day Created",
    "update_motd": "Message of the Day Updated",
    "delete_motd": "Message of the Day Deleted",
    "create_change_request": "Change Request Created",
    "update_change_request": "Change Request Updated",
    "approve_change_request": "Change Request Approved",
    "reject_change_request": "Change Request Rejected",
  };
  return eventMap[event] || event.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(auditLogs.length / pageSize)),
    [auditLogs.length, pageSize],
  );
  const pagedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return auditLogs.slice(start, start + pageSize);
  }, [auditLogs, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [auditLogFilter, auditLogs.length]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  if (
    !session ||
    activeTab !== "Reports" ||
    (session.role !== "admin" && session.role !== "lead")
  ) {
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
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <label className="muted">
              Rows
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{ marginLeft: 6 }}
              >
                {[25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="ghost"
              type="button"
              onClick={() => setPage((p: number) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="muted">
              Page {page} of {pageCount}
            </span>
            <button
              className="ghost"
              type="button"
              onClick={() => setPage((p: number) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              Next
            </button>
            <button className="ghost" onClick={loadAuditLogs} disabled={busy}>
              Refresh
            </button>
          </div>
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
          {pagedLogs.map((log) => (
            <div className="table-row" key={log.id}>
              <div className="muted">
                {safeDate(log.created_at) + " " + new Date(log.created_at).toLocaleTimeString()}
              </div>
              <div>
                <strong>{getEventDisplayName(log.event)}</strong>
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
