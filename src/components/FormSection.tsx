import React, { useState } from "react";

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  required?: boolean;
}

export default function FormSection({
  title,
  children,
  defaultOpen = true,
  required = false,
}: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        marginBottom: "1rem",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          background: isOpen ? "#f5f5f5" : "#fafafa",
          border: "none",
          borderBottom: isOpen ? "1px solid #ddd" : "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold",
          fontSize: "1rem",
        }}
      >
        <span>
          {title}
          {required && <span style={{ color: "#b3261e", marginLeft: "4px" }}>*</span>}
        </span>
        <span style={{ fontSize: "1.2rem", color: "#666" }}>
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: "1rem" }}>
          {children}
        </div>
      )}
    </div>
  );
}
