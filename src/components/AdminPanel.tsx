import React, { useState, useEffect } from "react";
import { invokeTauri } from "../api/tauri";
import { MotdRow, ChangeRequestRow, UserSession } from "../types";

interface AdminPanelProps {
  session: UserSession;
}

export default function AdminPanel({ session }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"motd" | "changeRequests">("motd");
  const [motds, setMotds] = useState<MotdRow[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MOTD Form
  const [motdForm, setMotdForm] = useState({
    message: "",
    active_from: "",
    active_to: "",
  });

  // Change Request Action
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestRow | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const loadMotds = async () => {
    try {
      // Fetch ALL (including inactive) to manage them
      const data = await invokeTauri<MotdRow[]>("list_motd", { activeOnly: false });
      setMotds(data);
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const loadChangeRequests = async () => {
    try {
      const data = await invokeTauri<ChangeRequestRow[]>("list_change_requests", {
        status: "open",
      }); // Start with open
      setChangeRequests(data);
    } catch (e: any) {
      setError(e.toString());
    }
  };

  useEffect(() => {
    if (activeTab === "motd") loadMotds();
    if (activeTab === "changeRequests") loadChangeRequests();
  }, [activeTab]);

  const handleCreateMotd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await invokeTauri("create_motd", {
        input: {
          message: motdForm.message,
          active_from: motdForm.active_from || null,
          active_to: motdForm.active_to || null,
          created_by_user_id: session.username, // Using username as ID ref for now
        },
      });
      setMotdForm({ message: "", active_from: "", active_to: "" });
      await loadMotds();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMotd = async (id: string) => {
    if (!window.confirm("Delete this message?")) return;
    setBusy(true);
    try {
      await invokeTauri("delete_motd", { id });
      await loadMotds();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setBusy(false);
    }
  };

  const handleResolveRequest = async (status: "resolved" | "rejected") => {
    if (!selectedRequest) return;
    setBusy(true);
    try {
      await invokeTauri("resolve_change_request", {
        id: selectedRequest.id,
        status,
        resolutionNotes: resolutionNotes,
        resolvedByUserId: session.username,
      });
      setSelectedRequest(null);
      setResolutionNotes("");
      await loadChangeRequests();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div
        style={{
          display: "flex",
          gap: "1rem",
          borderBottom: "1px solid #ddd",
          paddingBottom: "0.5rem",
        }}
      >
        <button
          className={activeTab === "motd" ? "ping" : "ghost"}
          onClick={() => setActiveTab("motd")}
        >
          MOTD Management
        </button>
        <button
          className={activeTab === "changeRequests" ? "ping" : "ghost"}
          onClick={() => setActiveTab("changeRequests")}
        >
          Change Requests
        </button>
      </div>

      {error && (
        <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e" }}>
          {error} <button onClick={() => setError(null)}>x</button>
        </div>
      )}

      {activeTab === "motd" && (
        <div className="grid-2">
          <div className="card">
            <h3>Add Message</h3>
            <form onSubmit={handleCreateMotd} className="stack">
              <label>
                Message
                <textarea
                  required
                  value={motdForm.message}
                  onChange={(e) => setMotdForm({ ...motdForm, message: e.target.value })}
                  rows={3}
                />
              </label>
              <label>
                Active From (Optional)
                <input
                  type="datetime-local"
                  value={motdForm.active_from}
                  onChange={(e) => setMotdForm({ ...motdForm, active_from: e.target.value })}
                />
              </label>
              <label>
                Active To (Optional)
                <input
                  type="datetime-local"
                  value={motdForm.active_to}
                  onChange={(e) => setMotdForm({ ...motdForm, active_to: e.target.value })}
                />
              </label>
              <button className="ping" type="submit" disabled={busy}>
                Publish
              </button>
            </form>
          </div>
          <div className="card">
            <h3>Current Messages</h3>
            <div className="stack" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {motds.map((m) => (
                <div
                  key={m.id}
                  className="card-item"
                  style={{ border: "1px solid #eee", padding: "0.5rem" }}
                >
                  <div>{m.message}</div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>
                    From: {m.active_from ? new Date(m.active_from).toLocaleString() : "Now"} <br />
                    To: {m.active_to ? new Date(m.active_to).toLocaleString() : "Forever"}
                  </div>
                  <button
                    className="ghost"
                    style={{ color: "#b3261e", fontSize: "0.8rem" }}
                    onClick={() => handleDeleteMotd(m.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "changeRequests" && (
        <div className="card">
          <h3>Open Requests</h3>
          <div className="table">
            <div className="table-head">
              <span>Title</span>
              <span>Requester</span>
              <span>Created</span>
              <span>Action</span>
            </div>
            {changeRequests.map((r) => (
              <div key={r.id} className="table-row">
                <div>
                  <strong>{r.title}</strong>
                  <div className="muted">{r.description}</div>
                </div>
                <div>{r.requested_by_user_id}</div>
                <div>{new Date(r.created_at).toLocaleDateString()}</div>
                <div>
                  <button className="ghost" onClick={() => setSelectedRequest(r)}>
                    Resolve/Reject
                  </button>
                </div>
              </div>
            ))}
            {changeRequests.length === 0 && <div className="table-row">No open requests.</div>}
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Resolve Request: {selectedRequest.title}</h3>
            <p>{selectedRequest.description}</p>
            <label>
              Resolution Notes
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Reason for rejection or confirmation of fix..."
              />
            </label>
            <div className="actions">
              <button
                className="ping"
                onClick={() => handleResolveRequest("resolved")}
                disabled={busy}
              >
                Resolve (Done)
              </button>
              <button
                className="ghost"
                style={{ color: "#b3261e" }}
                onClick={() => handleResolveRequest("rejected")}
                disabled={busy}
              >
                Reject
              </button>
              <button className="ghost" onClick={() => setSelectedRequest(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
