import React from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  inline?: boolean;
}

export default function LoadingSpinner({ size = "medium", inline = false }: LoadingSpinnerProps) {
  const sizeMap = {
    small: "16px",
    medium: "24px",
    large: "32px",
  };

  const spinnerSize = sizeMap[size];

  return (
    <div
      style={{
        display: inline ? "inline-block" : "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: inline ? "0" : "1rem",
      }}
    >
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `3px solid #f3f3f3`,
          borderTop: `3px solid #1f5131`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
