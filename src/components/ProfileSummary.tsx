import React from "react";

type ProfileSummaryProps = {
  weekly: number;
  monthly: number;
  total: number;
};

function ProfileSummary({ weekly, monthly, total }: ProfileSummaryProps) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        padding: "0.75rem",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <strong>Weekly Hours:</strong> {weekly.toFixed(1)}
        </div>
        <div>
          <strong>Monthly Hours:</strong> {monthly.toFixed(1)}
        </div>
        <div>
          <strong>Total Hours:</strong> {total.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

export default React.memo(ProfileSummary);
