import React, { useState, useMemo } from "react";
import { invokeTauri } from "../api/tauri";
import { InventoryRow, UserSession } from "../types";

interface InventoryProps {
  session: UserSession;
  inventory: InventoryRow[];
  busy: boolean;
  // State management props
  showInventoryForm: boolean;
  setShowInventoryForm: (show: boolean) => void;
  editingInventoryId: string | null;
  setEditingInventoryId: (id: string | null) => void;
  inventoryError: string | null;
  setInventoryError: (error: string | null) => void;
  // Form data
  inventoryForm: any;
  setInventoryForm: (form: any) => void;
  // Actions
  loadInventory: () => Promise<void>;
}

const INVENTORY_CATEGORIES = ["Wood", "Tools", "Gas", "Other"] as const;

export default function Inventory(props: InventoryProps) {
  const {
    session,
    inventory,
    busy,
    showInventoryForm,
    setShowInventoryForm,
    editingInventoryId,
    setEditingInventoryId,
    inventoryError,
    setInventoryError,
    inventoryForm,
    setInventoryForm,
    loadInventory,
  } = props;

  const canManage = session?.role === "admin" || session?.role === "lead";

  // Calculate low stock items
  const lowStockItems = useMemo(() => {
    return inventory.filter(item =>
      item.quantity_on_hand <= item.reorder_threshold
    );
  }, [inventory]);

  const resetInventoryForm = () => {
    setEditingInventoryId(null);
    setInventoryForm({
      name: "",
      category: "",
      customCategory: "",
      quantity_on_hand: 0,
      unit: "pcs",
      reorder_threshold: 0,
      reorder_amount: 0,
      notes: "",
    });
    setShowInventoryForm(false);
    setInventoryError(null);
  };

  const buildBlankInventoryForm = () => ({
    name: "",
    category: "",
    customCategory: "",
    quantity_on_hand: 0,
    unit: "pcs",
    reorder_threshold: 0,
    reorder_amount: 0,
    notes: "",
  });

  return (
    <div className="stack">
      {/* Header with actions */}
      <div className="card">
        <div className="add-header">
          {canManage && (
            <button
              type="button"
              className="icon-button"
              title="Add inventory item"
              onClick={() => {
                if (showInventoryForm) {
                  resetInventoryForm();
                } else {
                  setInventoryForm(buildBlankInventoryForm());
                  setShowInventoryForm(true);
                }
              }}
              disabled={busy}
            >
              +
            </button>
          )}
          <h3>Inventory Management</h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="badge">
              {inventory.length} items
            </span>
            {lowStockItems.length > 0 && (
              <span className="badge" style={{ background: "#f44336", color: "white" }}>
                {lowStockItems.length} low stock
              </span>
            )}
          </div>
        </div>

        {!canManage && (
          <p className="muted">Only leads or admins can manage inventory.</p>
        )}
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div className="card" style={{ borderLeft: "4px solid #f44336" }}>
          <h4 style={{ color: "#f44336", margin: "0 0 0.5rem 0" }}>
            ⚠️ Low Stock Alerts
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {lowStockItems.map(item => (
              <span
                key={item.id}
                className="badge"
                style={{
                  background: "#ffebee",
                  color: "#c62828",
                  border: "1px solid #ffcdd2"
                }}
              >
                {item.name}: {item.quantity_on_hand} {item.unit} (need {item.reorder_threshold})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Inventory form */}
      {showInventoryForm && (
        <div className="card">
          <h4>{editingInventoryId ? "Edit Inventory Item" : "Add Inventory Item"}</h4>

          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              setInventoryError(null);

              const qty = Number(inventoryForm.quantity_on_hand);
              if (!Number.isFinite(qty) || qty < 0) {
                setInventoryError("Quantity must be a valid positive number.");
                return;
              }

              const threshold = Number(inventoryForm.reorder_threshold);
              if (!Number.isFinite(threshold) || threshold < 0) {
                setInventoryError("Threshold must be a valid positive number.");
                return;
              }

              try {
                // Resolve category: use customCategory if "Other" selected
                const resolvedCategory =
                  inventoryForm.category === "Other"
                    ? inventoryForm.customCategory || ""
                    : inventoryForm.category;

                const payload = {
                  name: inventoryForm.name,
                  category: resolvedCategory,
                  quantity_on_hand: qty,
                  unit: inventoryForm.unit,
                  reorder_threshold: threshold,
                  reorder_amount:
                    inventoryForm.reorder_amount === null ||
                    inventoryForm.reorder_amount === undefined
                      ? null
                      : Number(inventoryForm.reorder_amount),
                  notes: inventoryForm.notes,
                  created_by_user_id: null,
                };

                if (editingInventoryId) {
                  await invokeTauri("update_inventory_item", {
                    input: {
                      ...payload,
                      id: editingInventoryId,
                    },
                    role: session?.role ?? null,
                    actor: session?.username ?? null,
                  });
                } else {
                  await invokeTauri("create_inventory_item", { input: payload });
                }

                await loadInventory();
                resetInventoryForm();
              } catch (err) {
                setInventoryError(typeof err === "string" ? err : "Failed to save inventory item");
              }
            }}
          >
            <label>
              Item Name *
              <input
                required
                value={inventoryForm.name}
                onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })}
              />
            </label>

            <label>
              Category
              <select
                value={inventoryForm.category}
                onChange={(e) => setInventoryForm({ ...inventoryForm, category: e.target.value })}
              >
                <option value="">Select category</option>
                {INVENTORY_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            {inventoryForm.category === "Other" && (
              <label>
                Custom Category
                <input
                  value={inventoryForm.customCategory}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, customCategory: e.target.value })}
                  placeholder="Enter custom category"
                />
              </label>
            )}

            <label>
              Current Quantity *
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={inventoryForm.quantity_on_hand}
                onChange={(e) => setInventoryForm({ ...inventoryForm, quantity_on_hand: e.target.value })}
              />
            </label>

            <label>
              Unit *
              <select
                required
                value={inventoryForm.unit}
                onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
              >
                <option value="pcs">pieces (pcs)</option>
                <option value="gal">gallons (gal)</option>
                <option value="qt">quarts (qt)</option>
                <option value="lbs">pounds (lbs)</option>
                <option value="kg">kilograms (kg)</option>
                <option value="ft">feet (ft)</option>
                <option value="m">meters (m)</option>
              </select>
            </label>

            <label>
              Reorder Threshold *
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={inventoryForm.reorder_threshold}
                onChange={(e) => setInventoryForm({ ...inventoryForm, reorder_threshold: e.target.value })}
              />
            </label>

            <label>
              Reorder Amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={inventoryForm.reorder_amount}
                onChange={(e) => setInventoryForm({ ...inventoryForm, reorder_amount: e.target.value })}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Notes
              <textarea
                value={inventoryForm.notes}
                onChange={(e) => setInventoryForm({ ...inventoryForm, notes: e.target.value })}
                rows={3}
              />
            </label>

            {inventoryError && (
              <div className="error-message" style={{ gridColumn: "1 / -1" }}>
                {inventoryError}
              </div>
            )}

            <div className="actions" style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? "Saving..." : editingInventoryId ? "Update Item" : "Add Item"}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={resetInventoryForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory list */}
      <div className="card">
        <div style={{ maxHeight: "600px", overflow: "auto" }}>
          {inventory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
              No inventory items yet. {canManage && "Add your first item above."}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => {
                  const isLowStock = item.quantity_on_hand <= item.reorder_threshold;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        {item.notes && (
                          <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td>{item.category || "Uncategorized"}</td>
                      <td>
                        <span style={{
                          fontWeight: isLowStock ? "bold" : "normal",
                          color: isLowStock ? "#f44336" : "inherit"
                        }}>
                          {item.quantity_on_hand} {item.unit}
                        </span>
                        {item.reorder_threshold > 0 && (
                          <div style={{ fontSize: "0.8rem", color: "#666" }}>
                            Threshold: {item.reorder_threshold}
                          </div>
                        )}
                      </td>
                      <td>
                        {isLowStock ? (
                          <span className="badge" style={{ background: "#ffebee", color: "#c62828" }}>
                            Low Stock
                          </span>
                        ) : (
                          <span className="badge" style={{ background: "#e8f5e9", color: "#2d6b3d" }}>
                            In Stock
                          </span>
                        )}
                      </td>
                      <td>
                        {canManage && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => {
                              setEditingInventoryId(item.id);
                              setInventoryForm({
                                name: item.name,
                                category: INVENTORY_CATEGORIES.includes(item.category as any)
                                  ? item.category
                                  : "Other",
                                customCategory: INVENTORY_CATEGORIES.includes(item.category as any)
                                  ? ""
                                  : item.category,
                                quantity_on_hand: item.quantity_on_hand,
                                unit: item.unit,
                                reorder_threshold: item.reorder_threshold,
                                reorder_amount: item.reorder_amount || 0,
                                notes: item.notes || "",
                              });
                              setShowInventoryForm(true);
                            }}
                            disabled={busy}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}