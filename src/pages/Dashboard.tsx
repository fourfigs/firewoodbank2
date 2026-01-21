import React from "react";
import Dashboard from "../components/Dashboard";
import { DeliveryEventRow, InventoryRow, MotdRow, UserRow, UserSession, WorkOrderRow } from "../types";

interface DashboardPageProps {
  session: UserSession;
  deliveries: DeliveryEventRow[];
  inventory: InventoryRow[];
  motdItems: MotdRow[];
  users: UserRow[];
  userDeliveryHours: { hours: number; deliveries: number; woodCreditCords: number };
  workOrders: WorkOrderRow[];
}

// Wrapper for Dashboard component - extracted from App.tsx
export default function DashboardPage(props: DashboardPageProps) {
  return <Dashboard {...props} onWorkerSelect={() => {}} />;
}