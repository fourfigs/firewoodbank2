import React, { useState } from "react";

import { invokeTauri } from "../api/tauri";
import { UserSession } from "../types";

interface UpdateCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateCreated: () => Promise<void>;
  session: UserSession;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}

export default function UpdateCreationModal({
  isOpen,
  onClose,
  onUpdateCreated,
  session,
  busy,
  setBusy,
}: UpdateCreationModalProps) {
  const [formData, setFormData] = useState({
    message: "",
    active_from: "",
    active_to: "",
  });
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.message.trim()) {
      setError("Message is required.");
      return;
    }

    setBusy(true);
    try {
      await invokeTauri("create_motd", {
        input: {
          message: formData.message.trim(),
          active_from: formData.active_from || null,
          active_to: formData.active_to || null,
          created_by_user_id: session.userId,
        },
      });

      setFormData({
        message: "",
        active_from: "",
        active_to: "",
      });
      await onUpdateCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create update.");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setFormData({
      message: "",
      active_from: "",
      active_to: "",
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create Update</h3>
        {error && (
          <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="stack">
          <label>
            Message *
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter the update message..."
              rows={4}
              required
            />
          </label>
          <label>
            Active From (Optional)
            <input
              type="datetime-local"
              value={formData.active_from}
              onChange={(e) => setFormData({ ...formData, active_from: e.target.value })}
            />
            <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Leave blank to activate immediately
            </div>
          </label>
          <label>
            Active To (Optional)
            <input
              type="datetime-local"
              value={formData.active_to}
              onChange={(e) => setFormData({ ...formData, active_to: e.target.value })}
            />
            <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Leave blank for no expiration
            </div>
          </label>
          <div className="actions">
            <button className="ping" type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create Update"}
            </button>
            <button className="ghost" type="button" onClick={handleClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
