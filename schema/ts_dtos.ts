// Stage 0 schema design for the Community Firewood Bank app.
// Derived from CommunityFirewoodBank_Onboard.pdf, CommunityFirewoodBank_Order.pdf, and CommunityFirewoodBank_Invoice.pdf.
// Sync-ready: UUID PK + createdAt/updatedAt/isDeleted/lastSyncedAt/version on all entities.

export type UUID = string;
export type Timestamp = string; // ISO 8601

export interface SyncMeta {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSyncedAt?: Timestamp;
  version: number;
  isDeleted: boolean;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface ContactInfo {
  telephone?: string;
  email?: string;
}

export type ApprovalStatus = "approved" | "denied" | "pending";

export interface Client {
  meta: SyncMeta;
  clientNumber: string;
  clientTitle?: string;
  name: string;
  physicalAddress: Address;
  mailingAddress?: Address;
  contact: ContactInfo;
  dateOfOnboarding?: Timestamp;
  howDidTheyHearAboutUs?: string;
  referringAgency?: string;
  approvalStatus: ApprovalStatus;
  denialReason?: string;
  gateCombo?: string;
  notes?: string;
  createdByUserId?: UUID;
}

export interface HeatSourceInfo {
  gas: boolean;
  electric: boolean;
  other?: string; // free-text “Other”
}

export type WorkOrderStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "picked_up"
  | "completed"
  | "cancelled";

export interface WorkOrder {
  meta: SyncMeta;
  clientId: UUID;
  clientNumber: string;
  clientTitle?: string;
  clientName: string;
  physicalAddress: Address;
  mailingAddress?: Address;
  contact: ContactInfo;
  directions?: string;
  gateCombo?: string;
  otherHeatSource: HeatSourceInfo;
  notes?: string;
  scheduledDate?: Timestamp;
  status: WorkOrderStatus;
  deliverySizeLabel?: string;
  deliverySizeCords?: number;
  pickupDeliveryType?: string;
  pickupQuantityCords?: number;
  pickupLength?: number;
  pickupWidth?: number;
  pickupHeight?: number;
  pickupUnits?: string;
  createdByUserId?: UUID;
}

export interface InvoiceLineItem {
  id: UUID;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ClientSnapshot {
  clientId: UUID;
  clientNumber: string;
  clientTitle?: string;
  clientName: string;
  physicalAddress: Address;
  mailingAddress?: Address;
  contact: ContactInfo;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface Invoice {
  meta: SyncMeta;
  workOrderId: UUID;
  invoiceNumber: string;
  invoiceDate: Timestamp;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  clientSnapshot: ClientSnapshot;
  notes?: string;
  status: InvoiceStatus;
}

export type UserRole = "admin" | "lead" | "staff" | "volunteer";

export interface User {
  meta: SyncMeta;
  name: string;
  email?: string;
  telephone?: string;
  role: UserRole;
  availabilityNotes?: string;
  driverLicenseStatus?: string;
  driverLicenseNumber?: string;
  driverLicenseExpiresOn?: string;
  vehicle?: string;
  isDriver?: boolean;
  hipaaCertified?: boolean;
}

export interface InventoryItem {
  meta: SyncMeta;
  name: string;
  category?: string; // chainsaws, bar oil, gas, helmets, etc.
  quantityOnHand: number;
  unit: string; // e.g., “pcs”, “gal”, “qt”
  reorderThreshold: number;
  reorderAmount?: number;
  notes?: string;
}

export type DeliveryEventType = "delivery" | "meeting" | "workday";

export interface DeliveryEvent {
  meta: SyncMeta;
  title: string;
  description?: string;
  eventType: DeliveryEventType;
  workOrderId?: UUID;
  startDate: Timestamp;
  endDate?: Timestamp;
  colorCode?: string;
  assignedUserIds: UUID[];
}

export type ChangeRequestStatus = "open" | "in_review" | "approved" | "rejected";

export interface ChangeRequest {
  meta: SyncMeta;
  title: string;
  description: string;
  requestedByUserId: UUID;
  status: ChangeRequestStatus;
  resolutionNotes?: string;
  resolvedByUserId?: UUID;
}

export interface Motd {
  meta: SyncMeta;
  message: string;
  activeFrom?: Timestamp;
  activeTo?: Timestamp;
  createdByUserId?: UUID;
}

