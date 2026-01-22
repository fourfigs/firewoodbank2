import React, { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastNotificationProps {
  toast: Toast | null;
  onClose: () => void;
  duration?: number;
}

export default function ToastNotification({
  toast,
  onClose,
  duration = 4000,
}: ToastNotificationProps) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast, duration, onClose]);

  if (!toast) return null;

  const getBackgroundColor = () => {
    switch (toast.type) {
      case "success":
        return "#d4edda";
      case "error":
        return "#f8d7da";
      case "info":
        return "#d1ecf1";
      default:
        return "#e9ecef";
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case "success":
        return "#155724";
      case "error":
        return "#721c24";
      case "info":
        return "#0c5460";
      default:
        return "#383d41";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 10000,
        minWidth: "300px",
        maxWidth: "500px",
        padding: "1rem",
        borderRadius: "8px",
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          color: getTextColor(),
          cursor: "pointer",
          fontSize: "1.2rem",
          padding: "0",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Close"
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
