import React, { useState, useEffect } from "react";
import { ClientRow } from "../types";
import { invokeTauri } from "../api/tauri";

interface HouseholdSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (clientId: string) => void;
}

export default function HouseholdSelectionModal({
  isOpen,
  onClose,
  onSelect,
}: HouseholdSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setClients([]);
      return;
    }

    const searchClients = async () => {
      setLoading(true);
      try {
        const results = await invokeTauri<ClientRow[]>("list_clients_for_household", {
          search: searchTerm || undefined,
        });
        setClients(results);
      } catch (error) {
        console.error("Error searching clients:", error);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchClients();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isOpen, searchTerm]);

  if (!isOpen) return null;

  const handleSelect = (clientId: string) => {
    onSelect(clientId);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", maxHeight: "80vh" }}>
        <h3>Select Household Member</h3>
        <p style={{ marginBottom: "1rem", color: "#666" }}>
          Search for an existing client to add this person to their household.
        </p>
        
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Search by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
            autoFocus
          />
        </div>

        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
              Searching...
            </div>
          ) : clients.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
              {searchTerm ? "No clients found" : "Start typing to search for clients"}
            </div>
          ) : (
            <div>
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelect(client.id)}
                  style={{
                    padding: "1rem",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                    {client.name}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#666" }}>
                    {client.physical_address_line1}
                    {client.physical_address_city && `, ${client.physical_address_city}`}
                    {client.physical_address_state && `, ${client.physical_address_state}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="actions">
          <button className="ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
