#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use anyhow::Result;
use std::path::PathBuf;
use db::init_pool;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::{Manager, State};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    pool: SqlitePool,
}

fn resolve_database_url() -> String {
    // Prefer explicit env var if provided (absolute path recommended).
    if let Ok(url) = std::env::var("DATABASE_URL") {
        return url;
    }
    // Fallback to a db file at project root when running in dev (current dir is usually src-tauri).
    let mut root_db = PathBuf::from("../firewoodbank.db");
    if !root_db.exists() {
        // Try local dir as last resort.
        root_db = PathBuf::from("firewoodbank.db");
    }
    format!(
        "sqlite://{}",
        root_db
            .canonicalize()
            .unwrap_or(root_db)
            .to_string_lossy()
    )
}

#[derive(Debug, Deserialize)]
struct ClientInput {
    client_number: String,
    client_title: Option<String>,
    name: String,
    physical_address_line1: String,
    physical_address_line2: Option<String>,
    physical_address_city: String,
    physical_address_state: String,
    physical_address_postal_code: String,
    mailing_address_line1: Option<String>,
    mailing_address_line2: Option<String>,
    mailing_address_city: Option<String>,
    mailing_address_state: Option<String>,
    mailing_address_postal_code: Option<String>,
    telephone: Option<String>,
    email: Option<String>,
    date_of_onboarding: Option<String>,
    how_did_they_hear_about_us: Option<String>,
    referring_agency: Option<String>,
    approval_status: Option<String>,
    denial_reason: Option<String>,
    gate_combo: Option<String>,
    notes: Option<String>,
    created_by_user_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct ClientRow {
    id: String,
    name: String,
    client_number: String,
    email: Option<String>,
    telephone: Option<String>,
    approval_status: String,
    physical_address_line1: String,
    physical_address_line2: Option<String>,
    physical_address_city: String,
    physical_address_state: String,
    physical_address_postal_code: String,
    mailing_address_line1: Option<String>,
    mailing_address_line2: Option<String>,
    mailing_address_city: Option<String>,
    mailing_address_state: Option<String>,
    mailing_address_postal_code: Option<String>,
    gate_combo: Option<String>,
    notes: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct ClientConflictRow {
    id: String,
    name: String,
    client_number: String,
    physical_address_line1: String,
    physical_address_city: String,
    physical_address_state: String,
}

#[derive(Debug, Deserialize)]
struct InventoryInput {
    name: String,
    category: Option<String>,
    quantity_on_hand: f64,
    unit: String,
    reorder_threshold: f64,
    reorder_amount: Option<f64>,
    notes: Option<String>,
    created_by_user_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct InventoryRow {
    id: String,
    name: String,
    category: Option<String>,
    quantity_on_hand: f64,
    unit: String,
    reorder_threshold: f64,
    reorder_amount: Option<f64>,
    notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct WorkOrderInput {
    client_id: String,
    client_number: String,
    client_title: Option<String>,
    client_name: String,
    physical_address_line1: String,
    physical_address_line2: Option<String>,
    physical_address_city: String,
    physical_address_state: String,
    physical_address_postal_code: String,
    mailing_address_line1: Option<String>,
    mailing_address_line2: Option<String>,
    mailing_address_city: Option<String>,
    mailing_address_state: Option<String>,
    mailing_address_postal_code: Option<String>,
    telephone: Option<String>,
    email: Option<String>,
    directions: Option<String>,
    gate_combo: Option<String>,
    other_heat_source_gas: bool,
    other_heat_source_electric: bool,
    other_heat_source_other: Option<String>,
    notes: Option<String>,
    scheduled_date: Option<String>,
    status: Option<String>,
    created_by_user_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct WorkOrderRow {
    id: String,
    client_name: String,
    client_number: String,
    status: String,
    scheduled_date: Option<String>,
    gate_combo: Option<String>,
    notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DeliveryEventInput {
    title: String,
    description: Option<String>,
    event_type: String,
    work_order_id: Option<String>,
    start_date: String,
    end_date: Option<String>,
    color_code: Option<String>,
    assigned_user_ids_json: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct DeliveryEventRow {
    id: String,
    title: String,
    event_type: String,
    start_date: String,
    end_date: Option<String>,
    work_order_id: Option<String>,
    color_code: Option<String>,
}

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
async fn create_client(state: State<'_, AppState>, input: ClientInput) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let approval_status = input.approval_status.unwrap_or_else(|| "pending".to_string());

    // Enforce: a name can only have one address; check conflicts before insert.
    let conflicts = sqlx::query_as::<_, ClientConflictRow>(
        r#"
        SELECT
            id,
            name,
            client_number,
            physical_address_line1,
            physical_address_city,
            physical_address_state
        FROM clients
        WHERE is_deleted = 0
          AND (
            lower(name) = lower(?1)
            OR lower(name) LIKE '%' || lower(?1) || '%'
            OR lower(?1) LIKE '%' || lower(name) || '%'
          )
        "#
    )
    .bind(&input.name)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    for existing in conflicts {
        let same_address = existing.physical_address_line1.eq_ignore_ascii_case(&input.physical_address_line1)
            && existing
                .physical_address_city
                .eq_ignore_ascii_case(&input.physical_address_city)
            && existing
                .physical_address_state
                .eq_ignore_ascii_case(&input.physical_address_state);
        if !same_address {
            return Err(format!(
                "Name '{}' already exists at a different address (#{}, {} {})",
                existing.name, existing.client_number, existing.physical_address_line1, existing.physical_address_city
            ));
        }
    }

    let query = r#"
        INSERT INTO clients (
            id, client_number, client_title, name,
            physical_address_line1, physical_address_line2, physical_address_city,
            physical_address_state, physical_address_postal_code,
            mailing_address_line1, mailing_address_line2, mailing_address_city,
            mailing_address_state, mailing_address_postal_code,
            telephone, email, date_of_onboarding,
            how_did_they_hear_about_us, referring_agency, approval_status,
            denial_reason, gate_combo, notes, created_by_user_id
        )
        VALUES (
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?
        )
    "#;

    sqlx::query(query)
        .bind(&id)
        .bind(&input.client_number)
        .bind(&input.client_title)
        .bind(&input.name)
        .bind(&input.physical_address_line1)
        .bind(&input.physical_address_line2)
        .bind(&input.physical_address_city)
        .bind(&input.physical_address_state)
        .bind(&input.physical_address_postal_code)
        .bind(&input.mailing_address_line1)
        .bind(&input.mailing_address_line2)
        .bind(&input.mailing_address_city)
        .bind(&input.mailing_address_state)
        .bind(&input.mailing_address_postal_code)
        .bind(&input.telephone)
        .bind(&input.email)
        .bind(&input.date_of_onboarding)
        .bind(&input.how_did_they_hear_about_us)
        .bind(&input.referring_agency)
        .bind(&approval_status)
        .bind(&input.denial_reason)
        .bind(&input.gate_combo)
        .bind(&input.notes)
        .bind(&input.created_by_user_id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
async fn list_clients(state: State<'_, AppState>) -> Result<Vec<ClientRow>, String> {
    let rows = sqlx::query_as::<_, ClientRow>(
        r#"
        SELECT
            id,
            name,
            client_number,
            email,
            telephone,
            approval_status,
            physical_address_line1,
            physical_address_line2,
            physical_address_city,
            physical_address_state,
            physical_address_postal_code,
            mailing_address_line1,
            mailing_address_line2,
            mailing_address_city,
            mailing_address_state,
            mailing_address_postal_code,
            gate_combo,
            notes
        FROM clients
        WHERE is_deleted = 0
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
async fn check_client_conflict(
    state: State<'_, AppState>,
    name: String,
) -> Result<Vec<ClientConflictRow>, String> {
    let rows = sqlx::query_as::<_, ClientConflictRow>(
        r#"
        SELECT
            id,
            name,
            client_number,
            physical_address_line1,
            physical_address_city,
            physical_address_state
        FROM clients
        WHERE is_deleted = 0
          AND (
            lower(name) = lower(?1)
            OR lower(name) LIKE '%' || lower(?1) || '%'
            OR lower(?1) LIKE '%' || lower(name) || '%'
          )
        "#
    )
    .bind(&name)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
async fn create_inventory_item(
    state: State<'_, AppState>,
    input: InventoryInput,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let query = r#"
        INSERT INTO inventory_items (
            id, name, category, quantity_on_hand, unit,
            reorder_threshold, reorder_amount, notes, created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#;

    sqlx::query(query)
        .bind(&id)
        .bind(&input.name)
        .bind(&input.category)
        .bind(input.quantity_on_hand)
        .bind(&input.unit)
        .bind(input.reorder_threshold)
        .bind(input.reorder_amount)
        .bind(&input.notes)
        .bind(&input.created_by_user_id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
async fn list_inventory_items(state: State<'_, AppState>) -> Result<Vec<InventoryRow>, String> {
    let rows = sqlx::query_as::<_, InventoryRow>(
        r#"
        SELECT
            id,
            name,
            category,
            quantity_on_hand,
            unit,
            reorder_threshold,
            reorder_amount,
            notes
        FROM inventory_items
        WHERE is_deleted = 0
        ORDER BY name ASC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
async fn create_work_order(
    state: State<'_, AppState>,
    input: WorkOrderInput,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let status = input.status.unwrap_or_else(|| "draft".to_string());
    let query = r#"
        INSERT INTO work_orders (
            id, client_id, client_number, client_title, client_name,
            physical_address_line1, physical_address_line2, physical_address_city,
            physical_address_state, physical_address_postal_code,
            mailing_address_line1, mailing_address_line2, mailing_address_city,
            mailing_address_state, mailing_address_postal_code,
            telephone, email, directions, gate_combo,
            other_heat_source_gas, other_heat_source_electric, other_heat_source_other,
            notes, scheduled_date, status, created_by_user_id
        )
        VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?
        )
    "#;

    sqlx::query(query)
        .bind(&id)
        .bind(&input.client_id)
        .bind(&input.client_number)
        .bind(&input.client_title)
        .bind(&input.client_name)
        .bind(&input.physical_address_line1)
        .bind(&input.physical_address_line2)
        .bind(&input.physical_address_city)
        .bind(&input.physical_address_state)
        .bind(&input.physical_address_postal_code)
        .bind(&input.mailing_address_line1)
        .bind(&input.mailing_address_line2)
        .bind(&input.mailing_address_city)
        .bind(&input.mailing_address_state)
        .bind(&input.mailing_address_postal_code)
        .bind(&input.telephone)
        .bind(&input.email)
        .bind(&input.directions)
        .bind(&input.gate_combo)
        .bind(input.other_heat_source_gas)
        .bind(input.other_heat_source_electric)
        .bind(&input.other_heat_source_other)
        .bind(&input.notes)
        .bind(&input.scheduled_date)
        .bind(&status)
        .bind(&input.created_by_user_id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
async fn list_work_orders(state: State<'_, AppState>) -> Result<Vec<WorkOrderRow>, String> {
    let rows = sqlx::query_as::<_, WorkOrderRow>(
        r#"
        SELECT
            id,
            client_name,
            client_number,
            status,
            scheduled_date,
            gate_combo,
            notes
        FROM work_orders
        WHERE is_deleted = 0
        ORDER BY (scheduled_date IS NULL), datetime(scheduled_date) DESC, created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
async fn create_delivery_event(
    state: State<'_, AppState>,
    input: DeliveryEventInput,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let query = r#"
        INSERT INTO delivery_events (
            id, title, description, event_type, work_order_id,
            start_date, end_date, color_code, assigned_user_ids_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#;

    sqlx::query(query)
        .bind(&id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(&input.event_type)
        .bind(&input.work_order_id)
        .bind(&input.start_date)
        .bind(&input.end_date)
        .bind(&input.color_code)
        .bind(&input.assigned_user_ids_json)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
async fn list_delivery_events(
    state: State<'_, AppState>,
) -> Result<Vec<DeliveryEventRow>, String> {
    let rows = sqlx::query_as::<_, DeliveryEventRow>(
        r#"
        SELECT
            id,
            title,
            event_type,
            start_date,
            end_date,
            work_order_id,
            color_code
        FROM delivery_events
        WHERE is_deleted = 0
        ORDER BY datetime(start_date) ASC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

fn main() -> Result<()> {
    let app = tauri::Builder::default()
        .setup(|app| {
            let database_url = resolve_database_url();
            tauri::async_runtime::block_on(async {
                let pool = init_pool(&database_url).await?;
                app.manage(AppState { pool });
                Ok::<(), anyhow::Error>(())
            })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            create_client,
            list_clients,
            check_client_conflict,
            create_inventory_item,
            list_inventory_items,
            create_work_order,
            list_work_orders,
            create_delivery_event,
            list_delivery_events
        ])
        .run(tauri::generate_context!())?;

    Ok(app)
}

