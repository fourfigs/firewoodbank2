import React, { useState, useEffect } from "react";
import { invokeTauri } from "../api/tauri";
import { UserSession } from "../types";
import ConfirmationModal from "./ConfirmationModal";

type ChangeRequestRow = {
  id: string;
  title: string;
  description: string;
  requested_by_user_id: string;
  status: string; // 'open', 'resolved', 'rejected'
  resolution_notes?: string;
  resolved_by_user_id?: string;
  created_at: string;
};

interface StaffTabProps {
  session: UserSession;
}

export default function StaffTab({ session }: StaffTabProps) {
  const [changeRequests, setChangeRequests] = useState<ChangeRequestRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestRow | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const loadChangeRequests = async () => {
    try {
      const data = await invokeTauri<ChangeRequestRow[]>("list_change_requests", {
        status: "open",
      });
      setChangeRequests(data);
    } catch (e: any) {
      setError(e.toString());
    }
  };

  useEffect(() => {
    loadChangeRequests();
  }, []);

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
      <div className="card">
        <h3>Change Requests</h3>
        <p className="muted">
          Review and resolve change requests submitted by workers and clients.
        </p>
      </div>

      {error && (
        <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e" }}>
          {error} <button onClick={() => setError(null)}>x</button>
        </div>
      )}

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
