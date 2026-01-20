import React from "react";
import AdminPanel from "../components/AdminPanel";

// Wrapper for AdminPanel component - extracted from App.tsx
export default function AdminPage(props: any) {
  return <AdminPanel {...props} />;
}