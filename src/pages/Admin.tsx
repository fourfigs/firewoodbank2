import React from "react";
import AdminPanel from "../components/AdminPanel";
import { UserSession } from "../types";

interface AdminPageProps {
  session: UserSession;
}

// Wrapper for AdminPanel component - extracted from App.tsx
export default function AdminPage({ session }: AdminPageProps) {
  return <AdminPanel session={session} />;
}