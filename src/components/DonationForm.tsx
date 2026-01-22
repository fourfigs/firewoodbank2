import React, { useState } from "react";

import { invokeTauri } from "../api/tauri";
import { UserSession } from "../types";

interface DonationFormProps {
  session: UserSession;
  onDonationAdded: () => Promise<void>;
  onCancel: () => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}

export default function DonationForm({
  session,
  onDonationAdded,
  onCancel,
  busy,
  setBusy,
}: DonationFormProps) {
  const [formData, setFormData] = useState({
    donor_name: "",
    donor_contact: "",
    donation_type: "wood",
    description: "",
    quantity: "",
    unit: "",
    monetary_value: "",
    received_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const [error, setError] = useState<string | null>(null);

  const donationTypes = [
    { value: "wood", label: "Firewood" },
    { value: "money", label: "Monetary" },
    { value: "equipment", label: "Equipment/Tools" },
    { value: "service", label: "Service/Volunteer Time" },
    { value: "land", label: "Land/Property" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.description.trim()) {
      setError("Description is required.");
      return;
    }

    const quantity = formData.quantity ? parseFloat(formData.quantity) : null;
    const monetaryValue = formData.monetary_value ? parseFloat(formData.monetary_value) : null;

    if (quantity !== null && (isNaN(quantity) || quantity <= 0)) {
      setError("Quantity must be a valid number greater than zero.");
      return;
    }

    if (monetaryValue !== null && (isNaN(monetaryValue) || monetaryValue <= 0)) {
      setError("Monetary value must be a valid number greater than zero.");
      return;
    }

    setBusy(true);
    try {
      await invokeTauri("create_donation", {
        input: {
          donor_name: formData.donor_name.trim() || null,
          donor_contact: formData.donor_contact.trim() || null,
          donation_type: formData.donation_type,
          description: formData.description.trim(),
          quantity: quantity,
          unit: formData.unit.trim() || null,
          monetary_value: monetaryValue,
          received_date: formData.received_date,
          notes: formData.notes.trim() || null,
        },
        role: session.role,
        actor: session.username,
      });

      await onDonationAdded();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record donation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <h3>Record Donation</h3>

        {error && (
          <div className="pill" style={{ background: "#fbe2e2", color: "#b3261e", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="grid">
          <label>
            Donation Type *
            <select
              value={formData.donation_type}
              onChange={(e) => setFormData({ ...formData, donation_type: e.target.value })}
            >
              {donationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Description *
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was donated?"
            />
          </label>

          <label>
            Donor Name
            <input
              type="text"
              value={formData.donor_name}
              onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
              placeholder="Who donated this?"
            />
          </label>

          <label>
            Donor Contact
            <input
              type="text"
              value={formData.donor_contact}
              onChange={(e) => setFormData({ ...formData, donor_contact: e.target.value })}
              placeholder="Phone, email, or address"
            />
          </label>

          <label>
            Quantity
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="How much? (optional)"
            />
          </label>

          <label>
            Unit
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="cords, dollars, hours, etc."
            />
          </label>

          <label>
            Estimated Value ($)
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.monetary_value}
              onChange={(e) => setFormData({ ...formData, monetary_value: e.target.value })}
              placeholder="Dollar value (optional)"
            />
          </label>

          <label>
            Date Received *
            <input
              type="date"
              required
              value={formData.received_date}
              onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
            />
          </label>
        </div>

        <label>
          Additional Notes
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional details..."
            rows={3}
          />
        </label>

        <div className="actions">
          <button
            type="submit"
            className="ping"
            disabled={busy}
          >
            {busy ? "Saving..." : "Record Donation"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}