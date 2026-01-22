import React, { useState } from "react";

interface WorkOrderStatusDropdownProps {
  currentStatus: string;
  userRole: string;
  isDriver: boolean;
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

const getStatusDescription = (status: string): string => {
  const descriptions: Record<string, string> = {
    draft: "Initial work order created but not yet scheduled",
    scheduled: "Work order is scheduled for a specific date/time",
    in_progress: "Work is currently being performed",
    delivered: "Delivery completed, awaiting final confirmation",
    completed: "Work order fully completed and closed",
    cancelled: "Work order was cancelled and will not be completed",
    picked_up: "Pickup completed",
    issue: "There is an issue that needs attention",
  };
  return descriptions[status.toLowerCase()] || "Unknown status";
};

// Define valid status transitions based on current status and user role
const getValidStatuses = (currentStatus: string, userRole: string, isDriver: boolean) => {
  const status = currentStatus.toLowerCase();

  // Terminal states - no transitions allowed
  if (["completed", "cancelled", "picked_up"].includes(status)) {
    return [currentStatus];
  }

  const validStatuses: Record<string, string[]> = {
    draft: ["draft", "scheduled", "cancelled"],
    scheduled: ["scheduled", "in_progress", "completed", "cancelled"],
    in_progress: ["in_progress", "delivered", "completed", "issue", "cancelled"],
    delivered: ["delivered", "completed", "in_progress", "cancelled"],
    issue: ["issue", "in_progress", "cancelled"],
  };

  // Drivers have limited status options
  if (isDriver && !["admin", "lead"].includes(userRole.toLowerCase())) {
    const driverStatuses: Record<string, string[]> = {
      scheduled: ["scheduled", "in_progress"],
      in_progress: ["in_progress", "delivered", "issue"],
      delivered: ["delivered"], // Can't change once delivered
      issue: ["issue", "in_progress"],
    };
    return driverStatuses[status] || [currentStatus];
  }

  // Staff can do most transitions but not complete orders
  if (["staff", "employee"].includes(userRole.toLowerCase())) {
    const staffStatuses = (validStatuses[status] || [currentStatus]).filter(
      s => s !== "completed" || status === "completed"
    );
    return staffStatuses;
  }

  // Admins and leads can do all transitions
  return validStatuses[status] || [currentStatus];
};

const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    draft: "#6b7280", // gray
    scheduled: "#3b82f6", // blue
    in_progress: "#f59e0b", // amber
    delivered: "#10b981", // emerald
    completed: "#059669", // green
    cancelled: "#ef4444", // red
    picked_up: "#059669", // green
    issue: "#dc2626", // red
  };
  return statusColors[status.toLowerCase()] || "#6b7280";
};

const formatStatusLabel = (status: string) => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function WorkOrderStatusDropdown({
  currentStatus,
  userRole,
  isDriver,
  onStatusChange,
  disabled = false,
}: WorkOrderStatusDropdownProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const validStatuses = getValidStatuses(currentStatus, userRole, isDriver);
  const canChangeStatus = validStatuses.length > 1 && !disabled;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={currentStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        disabled={!canChangeStatus}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          backgroundColor: getStatusColor(currentStatus) + "20",
          borderColor: getStatusColor(currentStatus),
          color: getStatusColor(currentStatus),
          fontWeight: "bold",
          padding: "4px 8px",
          borderRadius: "4px",
          border: `1px solid ${getStatusColor(currentStatus)}`,
          cursor: canChangeStatus ? "pointer" : "default",
        }}
      >
        {validStatuses.map((status) => (
          <option key={status} value={status}>
            {formatStatusLabel(status)}
          </option>
        ))}
      </select>
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: "8px",
            padding: "8px 12px",
            background: "#333",
            color: "white",
            borderRadius: "6px",
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
            zIndex: 1000,
            pointerEvents: "none",
            boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            {formatStatusLabel(currentStatus)}
          </div>
          <div>{getStatusDescription(currentStatus)}</div>
          {validStatuses.length > 1 && (
            <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>Available next statuses:</div>
              {validStatuses
                .filter((s) => s !== currentStatus)
                .map((s) => (
                  <div key={s} style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                    • {formatStatusLabel(s)}
                  </div>
                ))}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: "-6px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #333",
            }}
          />
        </div>
      )}
    </div>
  );
}