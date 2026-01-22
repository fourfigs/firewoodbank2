import React, { useState } from "react";

interface HelpTooltipProps {
  content: string;
  children?: React.ReactNode;
}

export default function HelpTooltip({ content, children }: HelpTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "4px" }}>
      {children}
      <span
        style={{
          cursor: "help",
          color: "#666",
          fontSize: "0.9rem",
          fontWeight: "bold",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          border: "1px solid #666",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        ?
      </span>
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "0",
            marginBottom: "8px",
            padding: "8px 12px",
            background: "#333",
            color: "white",
            borderRadius: "6px",
            fontSize: "0.85rem",
            maxWidth: "250px",
            zIndex: 1000,
            pointerEvents: "none",
            boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
            whiteSpace: "normal",
          }}
        >
          {content}
          <div
            style={{
              position: "absolute",
              bottom: "-6px",
              left: "12px",
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
