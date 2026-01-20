import React, { useState, useMemo } from "react";
import { ClientRow, UserSession } from "../types";

interface ClientsProps {
  session: UserSession;
  clients: ClientRow[];
  busy: boolean;
  // State management props
  mailingListSidebarOpen: boolean;
  setMailingListSidebarOpen: (open: boolean) => void;
  mailingListFilter: string;
  setMailingListFilter: (filter: string) => void;
  clientDetailSidebarOpen: boolean;
  setClientDetailSidebarOpen: (open: boolean) => void;
  selectedClientForDetail: ClientRow | null;
  setSelectedClientForDetail: (client: ClientRow | null) => void;
  clientSearch: string;
  setClientSearch: (search: string) => void;
  clientSortField: string;
  setClientSortField: (field: string) => void;
  clientSortDirection: "asc" | "desc";
  setClientSortDirection: (direction: "asc" | "desc") => void;
  // Form state props
  showClientForm: boolean;
  setShowClientForm: (show: boolean) => void;
  editingClientId: string | null;
  setEditingClientId: (id: string | null) => void;
  clientError: string | null;
  setClientError: (error: string | null) => void;
  // Client form data (will be expanded)
  clientForm: any;
  setClientForm: (form: any) => void;
}

export default function Clients(props: ClientsProps) {
  const {
    session,
    clients,
    busy,
    mailingListSidebarOpen,
    setMailingListSidebarOpen,
    mailingListFilter,
    setMailingListFilter,
    clientDetailSidebarOpen,
    setClientDetailSidebarOpen,
    selectedClientForDetail,
    setSelectedClientForDetail,
    clientSearch,
    setClientSearch,
    clientSortField,
    setClientSortField,
    clientSortDirection,
    setClientSortDirection,
    showClientForm,
    setShowClientForm,
    editingClientId,
    setEditingClientId,
    clientError,
    setClientError,
  } = props;

  // Calculate filtered clients based on mailing list filter
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Apply mailing list filter
    if (mailingListFilter === "email") {
      filtered = filtered.filter(c => !!c.email);
    } else if (mailingListFilter === "mail") {
      filtered = filtered.filter(c => !!c.physical_address_line1);
    }

    // Apply search filter
    if (clientSearch.trim()) {
      const searchTerm = clientSearch.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm) ||
        (c.physical_address_city || "").toLowerCase().includes(searchTerm) ||
        (c.telephone || "").includes(searchTerm) ||
        (c.email || "").toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (clientSortField) {
        case "first_name":
          // Split name and compare first name
          aVal = a.name.split(" ")[0] || "";
          bVal = b.name.split(" ")[0] || "";
          break;
        case "last_name":
          // Split name and compare last name
          const aParts = a.name.split(" ");
          const bParts = b.name.split(" ");
          aVal = aParts[aParts.length - 1] || "";
          bVal = bParts[bParts.length - 1] || "";
          break;
        case "phone":
          aVal = a.telephone || "";
          bVal = b.telephone || "";
          break;
        case "state":
          aVal = a.physical_address_state || "";
          bVal = b.physical_address_state || "";
          break;
        case "approval_status":
          aVal = a.approval_status || "";
          bVal = b.approval_status || "";
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return clientSortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [clients, mailingListFilter, clientSearch, clientSortField, clientSortDirection]);

  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        position: "relative",
        minHeight: "400px",
      }}
    >
      {/* Left Sidebar - Mailing List */}
      <div
        style={{
          width: mailingListSidebarOpen ? "300px" : "0",
          overflow: "hidden",
          transition: "width 0.3s ease",
          borderRight: mailingListSidebarOpen ? "1px solid #ddd" : "none",
          paddingRight: mailingListSidebarOpen ? "1rem" : "0",
        }}
      >
        {mailingListSidebarOpen && (
          <div className="list-card">
            <div className="list-head">
              <h3>Mailing List</h3>
              <button
                className="ghost"
                type="button"
                onClick={() => setMailingListSidebarOpen(false)}
                style={{ padding: "0.25rem 0.5rem" }}
              >
                ×
              </button>
            </div>

            {/* Filter buttons with icons and counts */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setMailingListFilter("all")}
                style={{
                  padding: "0.4rem 0.75rem",
                  background: mailingListFilter === "all" ? "#e67f1e" : "#f5f5f5",
                  color: mailingListFilter === "all" ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: mailingListFilter === "all" ? "bold" : "normal",
                }}
              >
                All ({clients.length})
              </button>
              <button
                type="button"
                onClick={() => setMailingListFilter("email")}
                style={{
                  padding: "0.4rem 0.75rem",
                  background: mailingListFilter === "email" ? "#2196F3" : "#f5f5f5",
                  color: mailingListFilter === "email" ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: mailingListFilter === "email" ? "bold" : "normal",
                }}
                title="Email List"
              >
                ✉ Email ({clients.filter(c => !!c.email).length})
              </button>
              <button
                type="button"
                onClick={() => setMailingListFilter("mail")}
                style={{
                  padding: "0.4rem 0.75rem",
                  background: mailingListFilter === "mail" ? "#4CAF50" : "#f5f5f5",
                  color: mailingListFilter === "mail" ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: mailingListFilter === "mail" ? "bold" : "normal",
                }}
                title="Newsletter (Mail)"
              >
                📬 Newsletter ({clients.filter(c => !!c.physical_address_line1).length})
              </button>
            </div>

            {/* Mailing list content - placeholder for now */}
            <div style={{ fontSize: "0.9rem", color: "#666" }}>
              <p>Mailing list functionality extracted from App.tsx</p>
              <p>Filtered clients: {filteredClients.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Header with search and actions */}
        <div className="card">
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "200px" }}>
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                style={{ flex: 1, padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px" }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setMailingListSidebarOpen(!mailingListSidebarOpen)}
                style={{
                  padding: "0.5rem 1rem",
                  background: mailingListSidebarOpen ? "#e67f1e" : "#f5f5f5",
                  color: mailingListSidebarOpen ? "white" : "#333",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                📧 Mailing List
              </button>

              {(session.role === "admin" || session.role === "lead") && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => setShowClientForm(true)}
                  disabled={busy}
                >
                  + Add Client
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clients list - placeholder for now */}
        <div className="card">
          <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
            <h3>Clients List</h3>
            <p>Found {filteredClients.length} clients</p>
            <p>Search: "{clientSearch}" | Sort: {clientSortField} ({clientSortDirection})</p>
            {busy && <p>Loading...</p>}
            <p>Client list table and detail modal coming next...</p>
          </div>
        </div>
      </div>

      {/* Client Detail Sidebar */}
      {clientDetailSidebarOpen && selectedClientForDetail && (
        <div
          style={{
            width: "400px",
            borderLeft: "1px solid #ddd",
            padding: "1rem",
            background: "#f9f9f9",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3>Client Details</h3>
            <button
              className="ghost"
              onClick={() => setClientDetailSidebarOpen(false)}
              style={{ padding: "0.25rem 0.5rem" }}
            >
              ×
            </button>
          </div>
          <div style={{ color: "#666" }}>
            Client detail functionality coming soon...
          </div>
        </div>
      )}
    </div>
  );
}