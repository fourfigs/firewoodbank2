import React, { useState } from "react";

const DEFAULT_EVENT_COLORS: Record<string, string> = {
  delivery: "#e67f1e",
  cutting: "#2e7d32",
  splitting: "#1565c0",
  hauling: "#6a1b9a",
  other: "#607d8b",
};

interface EventCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (input: {
    title: string;
    description?: string | null;
    event_type: string;
    start_date: string;
    end_date?: string | null;
    color_code?: string | null;
  }) => Promise<void>;
}

export default function EventCreationModal({
  isOpen,
  onClose,
  onCreateEvent,
}: EventCreationModalProps) {
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_type: "cutting",
    start_date: "",
    end_date: "",
    color_code: DEFAULT_EVENT_COLORS.cutting,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleEventTypeChange = (value: string) => {
    const color = DEFAULT_EVENT_COLORS[value] ?? DEFAULT_EVENT_COLORS.other;
    setEventForm((prev) => ({
      ...prev,
      event_type: value,
      color_code: color,
      title: prev.title || `${value.charAt(0).toUpperCase()}${value.slice(1)} day`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!eventForm.start_date) {
      setError("Pick a date/time for the event.");
      return;
    }
    const title =
      eventForm.title ||
      `${eventForm.event_type.charAt(0).toUpperCase()}${eventForm.event_type.slice(1)} day`;
    setBusy(true);
    try {
      await onCreateEvent({
        title,
        description: eventForm.description || null,
        event_type: eventForm.event_type,
        start_date: eventForm.start_date,
        end_date: eventForm.end_date || null,
        color_code: eventForm.color_code || null,
      });
      setEventForm({
        title: "",
        description: "",
        event_type: "cutting",
        start_date: "",
        end_date: "",
        color_code: DEFAULT_EVENT_COLORS.cutting,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule event.");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setEventForm({
      title: "",
      description: "",
      event_type: "cutting",
      start_date: "",
      end_date: "",
      color_code: DEFAULT_EVENT_COLORS.cutting,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create Schedule Event</h3>
        {error && (
          <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="stack">
          <label>
            Event Type
            <select
              value={eventForm.event_type}
              onChange={(e) => handleEventTypeChange(e.target.value)}
            >
              <option value="delivery">Delivery</option>
              <option value="cutting">Cutting</option>
              <option value="splitting">Splitting</option>
              <option value="hauling">Hauling</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Title
            <input
              type="text"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              placeholder="Leave blank to use default"
            />
          </label>
          <label>
            Start Date & Time
            <input
              type="datetime-local"
              required
              value={eventForm.start_date}
              onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
            />
          </label>
          <label>
            End Date & Time (Optional)
            <input
              type="datetime-local"
              value={eventForm.end_date}
              onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
            />
          </label>
          <label>
            Description (Optional)
            <textarea
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              rows={3}
              placeholder="Add any notes about this event..."
            />
          </label>
          <div className="actions">
            <button className="ping" type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create Event"}
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
