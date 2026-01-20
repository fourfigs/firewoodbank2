import React from "react";
import Dashboard from "../components/Dashboard";

// Wrapper for Dashboard component - extracted from App.tsx
export default function DashboardPage(props: any) {
  return <Dashboard {...props} />;
}