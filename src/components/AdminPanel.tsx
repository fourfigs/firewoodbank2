import React, { useState, useEffect } from "react";
import { invokeTauri } from "../api/tauri";
import ConfirmationModal from "./ConfirmationModal";

type MotdRow = {
  id: string;
  message: string;
  active_from?: string;
  active_to?: string;
  created_at: string;
};

type UserSession = {
  name: string;
  username: string;
  role: string;
};

interface AdminPanelProps {
  session: UserSession;
}

export default function AdminPanel({ session }: AdminPanelProps) {
  const [motds, setMotds] = useState<MotdRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  // MOTD Form
  const [motdForm, setMotdForm] = useState({
    message: "",
    active_from: "",
    active_to: "",
  });

  const loadMotds = async () => {
    try {
      // Fetch ALL (including inactive) to manage them
      const data = await invokeTauri<MotdRow[]>("list_motd", { activeOnly: false });
      setMotds(data);
    } catch (e: any) {
      setError(e.toString());
    }
  };

  useEffect(() => {
    loadMotds();
  }, []);

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
    setDeleteConfirmation({ isOpen: true, id });
  };

  const confirmDeleteMotd = async () => {
    if (!deleteConfirmation.id) return;
    setBusy(true);
    try {
      await invokeTauri("delete_motd", { id: deleteConfirmation.id });
      await loadMotds();
      setDeleteConfirmation({ isOpen: false, id: null });
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">

      {error && (
        <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e" }}>
          {error} <button onClick={() => setError(null)}>x</button>
        </div>
      )}

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

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Message"
        message="Delete this message?"
        confirmLabel="Delete"
        onConfirm={confirmDeleteMotd}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: null })}
        confirmButtonStyle={{ background: "#b3261e", color: "white" }}
      />
    </div>
  );
}
