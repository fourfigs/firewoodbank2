//! Stage 0 schema design for the Community Firewood Bank app.
//! Derived from CommunityFirewoodBank_Onboard.pdf, CommunityFirewoodBank_Order.pdf, and CommunityFirewoodBank_Invoice.pdf.
//! Sync-ready: UUID primary keys + created_at/updated_at/is_deleted/last_synced_at/version on all entities.

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

pub type Timestamp = DateTime<Utc>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncMeta {
    pub id: Uuid,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub last_synced_at: Option<Timestamp>,
    pub version: i64,
    pub is_deleted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Address {
    pub line1: String,
    pub line2: Option<String>,
    pub city: String,
    pub state: String,
    pub postal_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactInfo {
    pub telephone: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ApprovalStatus {
    Approved,
    Denied,
    Pending,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub meta: SyncMeta,
    pub client_number: String,              // “Client #” on onboarding form
    pub client_title: Option<String>,       // Mr/Ms/Dr, etc.
    pub name: String,                       // Full name from onboarding form
    pub physical_address: Address,
    pub mailing_address: Option<Address>,
    pub contact: ContactInfo,
    pub date_of_onboarding: Option<Timestamp>,
    pub how_did_they_hear_about_us: Option<String>,
    pub referring_agency: Option<String>,
    pub approval_status: ApprovalStatus,
    pub denial_reason: Option<String>,
    pub gate_combo: Option<String>,
    pub notes: Option<String>,
    pub created_by_user_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeatSourceInfo {
    pub gas: bool,
    pub electric: bool,
    pub other: Option<String>, // free-text “Other” entry
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WorkOrderStatus {
    Draft,
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkOrder {
    pub meta: SyncMeta,
    pub client_id: Uuid,
    pub client_number: String,
    pub client_title: Option<String>,
    pub client_name: String,
    pub physical_address: Address,
    pub mailing_address: Option<Address>,
    pub contact: ContactInfo,
    pub directions: Option<String>,
    pub gate_combo: Option<String>,
    pub other_heat_source: HeatSourceInfo,
    pub notes: Option<String>,
    pub scheduled_date: Option<Timestamp>,
    pub status: WorkOrderStatus,
    pub created_by_user_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceLineItem {
    pub id: Uuid,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientSnapshot {
    pub client_id: Uuid,
    pub client_number: String,
    pub client_title: Option<String>,
    pub client_name: String,
    pub physical_address: Address,
    pub mailing_address: Option<Address>,
    pub contact: ContactInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InvoiceStatus {
    Draft,
    Sent,
    Paid,
    Void,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub meta: SyncMeta,
    pub work_order_id: Uuid,
    pub invoice_number: String,
    pub invoice_date: Timestamp,
    pub line_items: Vec<InvoiceLineItem>,
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
    pub client_snapshot: ClientSnapshot,
    pub notes: Option<String>,
    pub status: InvoiceStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserRole {
    Admin,
    Lead,
    Staff,
    Driver,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub meta: SyncMeta,
    pub name: String,
    pub email: Option<String>,
    pub telephone: Option<String>,
    pub role: UserRole,
    pub availability_notes: Option<String>,
    pub driver_license_status: Option<String>,
    pub vehicle: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryItem {
    pub meta: SyncMeta,
    pub name: String,
    pub category: Option<String>, // chainsaws, bar oil, gas, helmets, etc.
    pub quantity_on_hand: f64,
    pub unit: String,             // e.g., “pcs”, “gal”, “qt”
    pub reorder_threshold: f64,
    pub reorder_amount: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DeliveryEventType {
    Delivery,
    Meeting,
    Workday,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeliveryEvent {
    pub meta: SyncMeta,
    pub title: String,
    pub description: Option<String>,
    pub event_type: DeliveryEventType,
    pub work_order_id: Option<Uuid>,
    pub start_date: Timestamp,
    pub end_date: Option<Timestamp>,
    pub color_code: Option<String>,
    pub assigned_user_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChangeRequestStatus {
    Open,
    InReview,
    Approved,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeRequest {
    pub meta: SyncMeta,
    pub title: String,
    pub description: String,
    pub requested_by_user_id: Uuid,
    pub status: ChangeRequestStatus,
    pub resolution_notes: Option<String>,
    pub resolved_by_user_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Motd {
    pub meta: SyncMeta,
    pub message: String,
    pub active_from: Option<Timestamp>,
    pub active_to: Option<Timestamp>,
    pub created_by_user_id: Option<Uuid>,
}

