#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use anyhow::Result;
use db::init_pool;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Sqlite, SqlitePool, Transaction};
use std::collections::HashSet;
use std::path::PathBuf;
use tauri::{Manager, State};
use uuid::Uuid;

async fn audit_db(pool: &SqlitePool, event: &str, role: &str, actor: &str) {
    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs (id, event, role, actor, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(Uuid::new_v4().to_string())
    .bind(event)
    .bind(role)
    .bind(actor)
    .execute(pool)
    .await;
}

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
    wood_size_label: Option<String>,
    wood_size_other: Option<String>,
    directions: Option<String>,
    created_by_user_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ClientUpdateInput {
    id: String,
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
    wood_size_label: Option<String>,
    wood_size_other: Option<String>,
    directions: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct ClientRow {
    id: String,
    name: String,
    client_number: String,
    email: Option<String>,
    telephone: Option<String>,
    approval_status: String,
    date_of_onboarding: Option<String>,
    how_did_they_hear_about_us: Option<String>,
    referring_agency: Option<String>,
    denial_reason: Option<String>,
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
    wood_size_label: Option<String>,
    wood_size_other: Option<String>,
    directions: Option<String>,
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
    reserved_quantity: f64,
}

#[derive(Debug, Deserialize)]
struct InventoryUpdateInput {
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
    mileage: Option<f64>,
    other_heat_source_gas: bool,
    other_heat_source_electric: bool,
    other_heat_source_other: Option<String>,
    notes: Option<String>,
    scheduled_date: Option<String>,
    status: Option<String>,
    wood_size_label: Option<String>,
    wood_size_other: Option<String>,
    delivery_size_label: Option<String>,
    delivery_size_cords: Option<f64>,
    assignees_json: Option<String>,
    created_by_user_id: Option<String>,
    created_by_display: Option<String>,
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
    telephone: Option<String>,
    physical_address_line1: Option<String>,
    physical_address_city: Option<String>,
    physical_address_state: Option<String>,
    physical_address_postal_code: Option<String>,
    mileage: Option<f64>,
    wood_size_label: Option<String>,
    wood_size_other: Option<String>,
    delivery_size_label: Option<String>,
    delivery_size_cords: Option<f64>,
    assignees_json: Option<String>,
    created_by_display: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct UserRow {
    id: String,
    name: String,
    email: Option<String>,
    telephone: Option<String>,
    role: String,
    availability_notes: Option<String>,
    availability_schedule: Option<String>,
    driver_license_status: Option<String>,
    driver_license_number: Option<String>,
    driver_license_expires_on: Option<String>,
    vehicle: Option<String>,
    hipaa_certified: i64,
    is_driver: i64,
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
    assigned_user_ids_json: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct MotdRow {
    id: String,
    message: String,
    active_from: Option<String>,
    active_to: Option<String>,
    created_at: String,
}

#[derive(Debug, Deserialize)]
struct MotdInput {
    message: String,
    active_from: Option<String>,
    active_to: Option<String>,
    created_by_user_id: Option<String>,
}

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
async fn create_client(state: State<'_, AppState>, input: ClientInput) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let approval_status = input.approval_status.unwrap_or_else(|| "pending".to_string());
    audit_db(&state.pool, "create_client", "unknown", "unknown").await;

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
            denial_reason, gate_combo, notes,
            wood_size_label, wood_size_other, directions,
            created_by_user_id
        )
        VALUES (
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?
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
        .bind(&input.wood_size_label)
        .bind(&input.wood_size_other)
        .bind(&input.directions)
        .bind(&input.created_by_user_id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
async fn list_clients(
    state: State<'_, AppState>,
    role: Option<String>,
    username: Option<String>,
    hipaa_certified: Option<bool>,
    is_driver: Option<bool>,
) -> Result<Vec<ClientRow>, String> {
    let mut rows = sqlx::query_as::<_, ClientRow>(
        r#"
        SELECT
            id,
            name,
            client_number,
            email,
            telephone,
            approval_status,
            date_of_onboarding,
            how_did_they_hear_about_us,
            referring_agency,
            denial_reason,
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
            notes,
            wood_size_label,
            wood_size_other,
            directions
        FROM clients
        WHERE is_deleted = 0
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let username_val = username.unwrap_or_default();
    let username_lower = username_val.to_lowercase();
    let is_hipaa = hipaa_certified.unwrap_or(false);
    let driver_capable = is_driver.unwrap_or(false);
    audit_db(&state.pool, "list_clients", &role_val, "unknown").await;
    if driver_capable {
        // Drivers only see clients tied to work orders they are assigned to.
        let assignments = sqlx::query!(
            r#"
            SELECT client_id, assignees_json
            FROM work_orders
            WHERE is_deleted = 0
              AND client_id IS NOT NULL
            "#
        )
        .fetch_all(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

        let mut allowed_ids: HashSet<String> = HashSet::new();
        for row in assignments {
            let client_id = row.client_id.clone();
            if !client_id.is_empty() {
                let assignees: Vec<String> = serde_json::from_str(row.assignees_json.as_deref().unwrap_or("[]"))
                    .unwrap_or_default();
                let matched = assignees
                    .iter()
                    .map(|a| a.to_lowercase())
                    .any(|a| a == username_lower);
                if matched {
                    allowed_ids.insert(client_id);
                }
            }
        }

        rows = rows
            .into_iter()
            .filter(|c| allowed_ids.contains(&c.id))
            .map(|mut c| {
                // Drivers do not need gate codes or notes from intake.
                c.gate_combo = None;
                c.notes = None;
                c
            })
            .collect();
    } else if !(role_val == "admin" || (role_val == "lead" && is_hipaa)) {
        rows.iter_mut().for_each(|c| {
            c.email = None;
            c.telephone = None;
            c.gate_combo = None;
            c.physical_address_line1 = String::from("Hidden");
            c.physical_address_city = String::from("Hidden");
            c.physical_address_state = String::from("Hidden");
            c.physical_address_postal_code = String::from("Hidden");
        });
    }

    Ok(rows)
}

#[tauri::command]
async fn update_client(state: State<'_, AppState>, input: ClientUpdateInput) -> Result<(), String> {
    let approval_status = input.approval_status.unwrap_or_else(|| "pending".to_string());
    audit_db(&state.pool, "update_client", "unknown", "unknown").await;

    let query = r#"
        UPDATE clients
        SET client_number = ?,
            client_title = ?,
            name = ?,
            physical_address_line1 = ?,
            physical_address_line2 = ?,
            physical_address_city = ?,
            physical_address_state = ?,
            physical_address_postal_code = ?,
            mailing_address_line1 = ?,
            mailing_address_line2 = ?,
            mailing_address_city = ?,
            mailing_address_state = ?,
            mailing_address_postal_code = ?,
            telephone = ?,
            email = ?,
            date_of_onboarding = ?,
            how_did_they_hear_about_us = ?,
            referring_agency = ?,
            approval_status = ?,
            denial_reason = ?,
            gate_combo = ?,
            notes = ?,
            wood_size_label = ?,
            wood_size_other = ?,
            directions = ?,
            updated_at = datetime('now')
        WHERE id = ?
    "#;

    sqlx::query(query)
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
        .bind(&input.wood_size_label)
        .bind(&input.wood_size_other)
        .bind(&input.directions)
        .bind(&input.id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn delete_client(state: State<'_, AppState>, id: String) -> Result<(), String> {
    audit_db(&state.pool, "delete_client", "unknown", "unknown").await;
    sqlx::query(
        r#"
        UPDATE clients
        SET is_deleted = 1,
            updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
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
    audit_db(&state.pool, "create_inventory_item", "unknown", "unknown").await;
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
            notes,
            reserved_quantity
        FROM inventory_items
        WHERE is_deleted = 0
        ORDER BY name ASC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    audit_db(&state.pool, "list_inventory_items", "unknown", "unknown").await;
    Ok(rows)
}

#[tauri::command]
async fn update_inventory_item(
    state: State<'_, AppState>,
    input: InventoryUpdateInput,
) -> Result<(), String> {
    audit_db(&state.pool, "update_inventory_item", "unknown", "unknown").await;
    sqlx::query(
        r#"
        UPDATE inventory_items
        SET name = ?,
            category = ?,
            quantity_on_hand = ?,
            unit = ?,
            reorder_threshold = ?,
            reorder_amount = ?,
            notes = ?,
            updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&input.name)
    .bind(&input.category)
    .bind(input.quantity_on_hand)
    .bind(&input.unit)
    .bind(input.reorder_threshold)
    .bind(input.reorder_amount)
    .bind(&input.notes)
    .bind(&input.id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_inventory_item(state: State<'_, AppState>, id: String) -> Result<(), String> {
    audit_db(&state.pool, "delete_inventory_item", "unknown", "unknown").await;
    sqlx::query(
        r#"
        UPDATE inventory_items
        SET is_deleted = 1,
            updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn create_work_order(
    state: State<'_, AppState>,
    input: WorkOrderInput,
    role: Option<String>,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let status = input.status.unwrap_or_else(|| "draft".to_string());
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    if role_val != "admin" && role_val != "staff" {
        return Err("Only staff or admin may create work orders".to_string());
    }
    audit_db(&state.pool, "create_work_order", &role_val, "unknown").await;

    let query = r#"
        INSERT INTO work_orders (
            id, client_id, client_number, client_title, client_name,
            physical_address_line1, physical_address_line2, physical_address_city,
            physical_address_state, physical_address_postal_code,
            mailing_address_line1, mailing_address_line2, mailing_address_city,
            mailing_address_state, mailing_address_postal_code,
            telephone, email, directions, gate_combo, mileage,
            other_heat_source_gas, other_heat_source_electric, other_heat_source_other,
            notes, scheduled_date, status,
            wood_size_label, wood_size_other,
            delivery_size_label, delivery_size_cords,
            assignees_json,
            created_by_user_id, created_by_display
        )
        VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?
        )
    "#;

    let assignees_store = input
        .assignees_json
        .clone()
        .unwrap_or_else(|| "[]".to_string());

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
        .bind(&input.mileage)
        .bind(input.other_heat_source_gas)
        .bind(input.other_heat_source_electric)
        .bind(&input.other_heat_source_other)
        .bind(&input.notes)
        .bind(&input.scheduled_date)
        .bind(&status)
        .bind(&input.wood_size_label)
        .bind(&input.wood_size_other)
        .bind(&input.delivery_size_label)
        .bind(&input.delivery_size_cords)
        .bind(&assignees_store)
        .bind(&input.created_by_user_id)
        .bind(&input.created_by_display)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    adjust_inventory_for_transition_tx(
        &mut tx,
        "draft",
        &status,
        input.delivery_size_cords.unwrap_or(0.0),
    )
    .await
    .map_err(|e| e.to_string())?;

    let assigned_json = assignees_store.clone();

    // Auto-create a delivery event when a work order is scheduled.
    if let Some(start_date) = &input.scheduled_date {
        let delivery_id = Uuid::new_v4().to_string();
        let delivery_query = r#"
            INSERT INTO delivery_events (
                id, title, description, event_type, work_order_id,
                start_date, end_date, color_code, assigned_user_ids_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#;

        sqlx::query(delivery_query)
            .bind(&delivery_id)
            .bind(format!("Delivery for {}", input.client_name))
            .bind::<Option<String>>(None)
            .bind("delivery")
            .bind(&id)
            .bind(start_date)
            .bind::<Option<String>>(None)
            .bind("#e67f1e")
            .bind(&assigned_json)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
async fn list_work_orders(
    state: State<'_, AppState>,
    role: Option<String>,
    username: Option<String>,
    hipaa_certified: Option<bool>,
    is_driver: Option<bool>,
) -> Result<Vec<WorkOrderRow>, String> {
    let mut rows = sqlx::query_as::<_, WorkOrderRow>(
        r#"
        SELECT
            id,
            client_name,
            client_number,
            status,
            scheduled_date,
            gate_combo,
            notes,
            telephone,
            physical_address_line1,
            physical_address_city,
            physical_address_state,
            physical_address_postal_code,
            mileage,
            wood_size_label,
            wood_size_other,
            delivery_size_label,
            delivery_size_cords,
            COALESCE(assignees_json, '[]') as assignees_json,
            created_by_display
        FROM work_orders
        WHERE is_deleted = 0
        ORDER BY (scheduled_date IS NULL), datetime(scheduled_date) DESC, created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    // PII filtering and assignment filtering
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let username_val = username.unwrap_or_default();
    let username_lower = username_val.to_lowercase();
    let is_hipaa = hipaa_certified.unwrap_or(false);
    let driver_capable = is_driver.unwrap_or(false);
    audit_db(&state.pool, "list_work_orders", &role_val, &username_val).await;

    if role_val == "volunteer" || driver_capable {
        rows = rows
            .into_iter()
            .filter(|wo| {
                let assignees: Vec<String> =
                    serde_json::from_str(wo.assignees_json.as_deref().unwrap_or("[]"))
                        .unwrap_or_default();
                assignees
                    .iter()
                    .map(|a| a.to_lowercase())
                    .any(|a| a == username_lower)
            })
            .map(|mut wo| {
                if role_val == "volunteer" {
                    // Strip PII for volunteers
                    wo.telephone = None;
                    wo.gate_combo = None;
                    wo.notes = None;
                    wo.physical_address_line1 = None;
                    wo.physical_address_city = None;
                    wo.physical_address_state = None;
                    wo.physical_address_postal_code = None;
                }
                wo
            })
            .collect();
    } else if role_val == "staff" || role_val == "lead" {
        if role_val == "lead" && is_hipaa {
            // full access
        } else {
            // mask PII for non-HIPAA staff
            rows.iter_mut().for_each(|wo| {
                wo.telephone = None;
                wo.gate_combo = None;
                wo.notes = None;
            });
        }
    }

    Ok(rows)
}

async fn adjust_inventory_for_transition_tx(
    tx: &mut Transaction<'_, Sqlite>,
    previous_status: &str,
    next_status: &str,
    delivery_size_cords: f64,
) -> Result<(), sqlx::Error> {
    if delivery_size_cords <= 0.0 {
        return Ok(());
    }

    let reserve_states = ["scheduled", "in_progress"];
    let prev_status_lower = previous_status.to_lowercase();
    let next_status_lower = next_status.to_lowercase();
    let prev_reserved = reserve_states.contains(&prev_status_lower.as_str());
    let next_reserved = reserve_states.contains(&next_status_lower.as_str());

    #[derive(sqlx::FromRow)]
    struct InventoryRecord {
        id: String,
        quantity_on_hand: f64,
        reserved_quantity: f64,
    }

    let inventory_row = sqlx::query_as::<_, InventoryRecord>(
        r#"
        SELECT id, quantity_on_hand, reserved_quantity
        FROM inventory_items
        WHERE is_deleted = 0
          AND (
            lower(unit) LIKE '%cord%'
            OR lower(name) LIKE '%wood%'
          )
        ORDER BY created_at ASC
        LIMIT 1
        "#
    )
    .fetch_optional(&mut **tx)
    .await?;

    if let Some(record) = inventory_row {
        let mut reserved = record.reserved_quantity;
        let mut on_hand = record.quantity_on_hand;
        if !prev_reserved && next_reserved {
            reserved += delivery_size_cords;
        } else if prev_reserved && !next_reserved {
            reserved -= delivery_size_cords;
        }

        if next_status.eq_ignore_ascii_case("completed") {
            on_hand -= delivery_size_cords;
        }

        if reserved < 0.0 {
            reserved = 0.0;
        }
        if on_hand < 0.0 {
            on_hand = 0.0;
        }

        sqlx::query(
            r#"
            UPDATE inventory_items
            SET reserved_quantity = ?, quantity_on_hand = ?, updated_at = datetime('now')
            WHERE id = ?
            "#
        )
        .bind(reserved)
        .bind(on_hand)
        .bind(&record.id)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

#[tauri::command]
async fn create_delivery_event(
    state: State<'_, AppState>,
    input: DeliveryEventInput,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    audit_db(&state.pool, "create_delivery_event", "unknown", "unknown").await;
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
async fn list_users(state: State<'_, AppState>) -> Result<Vec<UserRow>, String> {
    let rows = sqlx::query_as::<_, UserRow>(
        r#"
        SELECT
            id,
            name,
            email,
            telephone,
            role,
            availability_notes,
            availability_schedule,
            driver_license_status,
            driver_license_number,
            driver_license_expires_on,
            vehicle,
            COALESCE(hipaa_certified, 0) as hipaa_certified,
            COALESCE(is_driver, 0) as is_driver
        FROM users
        WHERE is_deleted = 0
        ORDER BY name ASC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    audit_db(&state.pool, "list_users", "unknown", "unknown").await;
    Ok(rows)
}

#[derive(Debug, Deserialize)]
struct WorkOrderAssignmentInput {
    work_order_id: String,
    assignees_json: Option<String>,
}

#[derive(Debug, Deserialize)]
struct WorkOrderStatusInput {
    work_order_id: String,
    status: Option<String>,
    mileage: Option<f64>,
    is_driver: Option<bool>,
}

#[derive(Debug, Serialize, FromRow)]
struct DriverAvailabilityRow {
    name: String,
    availability_schedule: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UserUpdateInput {
    id: String,
    availability_notes: Option<String>,
    availability_schedule: Option<String>,
    driver_license_status: Option<String>,
    driver_license_number: Option<String>,
    driver_license_expires_on: Option<String>,
    vehicle: Option<String>,
    hipaa_certified: Option<bool>,
    is_driver: Option<bool>,
}

#[tauri::command]
async fn get_available_drivers(
    state: State<'_, AppState>,
    date: String, // ISO date string like "2025-12-30"
) -> Result<Vec<String>, String> {
    use chrono::Datelike;
    
    let rows = sqlx::query_as::<_, DriverAvailabilityRow>(
        r#"
        SELECT name, availability_schedule
        FROM users
        WHERE is_deleted = 0
          AND is_driver = 1
        ORDER BY name ASC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    // Parse the date to get day of week
    let parsed_date = chrono::NaiveDate::parse_from_str(&date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format: {}", e))?;
    
    let weekday = parsed_date.weekday();
    let day_name = weekday.to_string().to_lowercase();

    let mut available = Vec::new();
    for row in rows {
        if let Some(schedule_json) = row.availability_schedule {
            if let Ok(schedule) = serde_json::from_str::<std::collections::HashMap<String, bool>>(&schedule_json) {
                if schedule.get(&day_name).copied().unwrap_or(false) {
                    available.push(row.name);
                }
            } else {
                // No schedule means always available
                available.push(row.name);
            }
        } else {
            // No schedule means always available
            available.push(row.name);
        }
    }

    Ok(available)
}

#[tauri::command]
async fn update_user_flags(
    state: State<'_, AppState>,
    input: UserUpdateInput,
    role: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    if role_val != "admin" && role_val != "lead" {
        return Err("Only admins or leads can update users".to_string());
    }
    audit_db(&state.pool, "update_user_flags", &role_val, "unknown").await;

    let status_clean = input
        .driver_license_status
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let expiry_clean = input
        .driver_license_expires_on
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let wants_driver = input.is_driver.unwrap_or(false);
    let final_is_driver = wants_driver && status_clean.is_some() && expiry_clean.is_some();
    let hipaa = input.hipaa_certified.unwrap_or(false);

    sqlx::query(
        r#"
        UPDATE users
        SET availability_notes = ?,
            availability_schedule = ?,
            driver_license_status = ?,
            driver_license_number = ?,
            driver_license_expires_on = ?,
            vehicle = ?,
            hipaa_certified = ?,
            is_driver = ?,
            updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&input.availability_notes)
    .bind(&input.availability_schedule)
    .bind(&status_clean)
    .bind(&input.driver_license_number)
    .bind(&expiry_clean)
    .bind(&input.vehicle)
    .bind(if hipaa { 1 } else { 0 })
    .bind(if final_is_driver { 1 } else { 0 })
    .bind(&input.id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_work_order_assignees(
    state: State<'_, AppState>,
    input: WorkOrderAssignmentInput,
    role: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    if role_val != "admin" && role_val != "lead" {
        return Err("Only admins or leads can assign drivers/helpers".to_string());
    }
    audit_db(&state.pool, "update_work_order_assignees", &role_val, "unknown").await;

    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE work_orders
        SET assignees_json = ?, updated_at = datetime('now')
        WHERE id = ?
        "#
    )
    .bind(&input.assignees_json)
    .bind(&input.work_order_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE delivery_events
        SET assigned_user_ids_json = COALESCE(?, '[]'), updated_at = datetime('now')
        WHERE work_order_id = ?
        "#
    )
    .bind(&input.assignees_json)
    .bind(&input.work_order_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_work_order_status(
    state: State<'_, AppState>,
    input: WorkOrderStatusInput,
    role: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let driver_capable = input.is_driver.unwrap_or(false);
    audit_db(&state.pool, "update_work_order_status", &role_val, "unknown").await;

    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;

    let existing = sqlx::query!(
        r#"SELECT status, delivery_size_cords FROM work_orders WHERE id = ? AND is_deleted = 0"#,
        input.work_order_id
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let existing = match existing {
        Some(e) => e,
        None => return Err("Work order not found or has been deleted".to_string()),
    };

    let current_status = existing.status;
    let next_status = input.status.clone().unwrap_or_else(|| current_status.clone());
    let delivery_size = existing.delivery_size_cords.unwrap_or(0.0);

    // Simple validation: mileage required if status completed
    if next_status == "completed" && input.mileage.is_none() {
        return Err("Mileage is required to mark completed".to_string());
    }

    // Drivers can only move to in_progress and set mileage; volunteers cannot update; staff/leads/admin can update status.
    if role_val == "volunteer" {
        return Err("Volunteers cannot update status/mileage".to_string());
    }

    if driver_capable && input.status.is_some() && next_status != "in_progress" {
        return Err("Drivers can only mark in_progress with mileage".to_string());
    }

    sqlx::query(
        r#"
        UPDATE work_orders
        SET status = ?,
            mileage = COALESCE(?, mileage),
            updated_at = datetime('now')
        WHERE id = ? AND is_deleted = 0
        "#
    )
    .bind(&next_status)
    .bind(&input.mileage)
    .bind(&input.work_order_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    if current_status != next_status {
        adjust_inventory_for_transition_tx(&mut tx, &current_status, &next_status, delivery_size)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn list_delivery_events(
    state: State<'_, AppState>,
    role: Option<String>,
    username: Option<String>,
    hipaa_certified: Option<bool>,
    is_driver: Option<bool>,
) -> Result<Vec<DeliveryEventRow>, String> {
    let mut rows = sqlx::query_as::<_, DeliveryEventRow>(
        r#"
        SELECT
            id,
            title,
            event_type,
            start_date,
            end_date,
            work_order_id,
            color_code,
            COALESCE(
              assigned_user_ids_json,
              (SELECT assignees_json FROM work_orders WHERE work_orders.id = delivery_events.work_order_id)
            ) AS assigned_user_ids_json
        FROM delivery_events
        WHERE is_deleted = 0
        ORDER BY datetime(start_date) ASC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let username_val = username.unwrap_or_default();
    let is_hipaa = hipaa_certified.unwrap_or(false);
    let driver_capable = is_driver.unwrap_or(false);
    audit_db(&state.pool, "list_delivery_events", &role_val, &username_val).await;

    if driver_capable || role_val == "volunteer" {
        let uname = username_val.to_lowercase();
        rows = rows
            .into_iter()
            .filter(|ev| {
                let assignees: Vec<String> =
                    serde_json::from_str(ev.assigned_user_ids_json.as_deref().unwrap_or("[]"))
                        .unwrap_or_default();
                assignees
                    .iter()
                    .map(|a| a.to_lowercase())
                    .any(|a| a == uname)
            })
            .collect();
    } else if !(role_val == "admin" || (role_val == "lead" && is_hipaa)) {
        rows.iter_mut().for_each(|ev| {
            ev.title = "Hidden".to_string();
        });
    }

    Ok(rows)
}

#[tauri::command]
async fn list_motd(
    state: State<'_, AppState>,
    active_only: Option<bool>,
) -> Result<Vec<MotdRow>, String> {
    let only_active = active_only.unwrap_or(true);
    let mut query = String::from(
        r#"
        SELECT id, message, active_from, active_to, created_at
        FROM motd
        WHERE is_deleted = 0
        "#,
    );
    if only_active {
        query.push_str(
            r#"
              AND (active_from IS NULL OR datetime(active_from) <= datetime('now'))
              AND (active_to IS NULL OR datetime(active_to) >= datetime('now'))
            "#,
        );
    }
    query.push_str(" ORDER BY datetime(created_at) DESC");

    let rows = sqlx::query_as::<_, MotdRow>(&query)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    audit_db(&state.pool, "list_motd", "unknown", "unknown").await;
    Ok(rows)
}

#[tauri::command]
async fn create_motd(
    state: State<'_, AppState>,
    input: MotdInput,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO motd (id, message, active_from, active_to, created_by_user_id)
        VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(&input.message)
    .bind(&input.active_from)
    .bind(&input.active_to)
    .bind(&input.created_by_user_id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    audit_db(&state.pool, "create_motd", "unknown", "unknown").await;
    Ok(id)
}

#[derive(Debug, Serialize, FromRow)]
struct AuditLogRow {
    id: String,
    event: String,
    role: Option<String>,
    actor: Option<String>,
    created_at: String,
}

#[tauri::command]
async fn list_audit_logs(
    state: State<'_, AppState>,
    filter: Option<String>, // "day", "7days", "month", "year", "all"
) -> Result<Vec<AuditLogRow>, String> {
    let filter_val = filter.unwrap_or_else(|| "all".to_string());
    let query = match filter_val.as_str() {
        "day" => {
            r#"
            SELECT id, event, role, actor, created_at
            FROM audit_logs
            WHERE date(created_at) = date('now')
            ORDER BY created_at DESC
            "#
        }
        "7days" => {
            r#"
            SELECT id, event, role, actor, created_at
            FROM audit_logs
            WHERE created_at >= datetime('now', '-7 days')
            ORDER BY created_at DESC
            "#
        }
        "month" => {
            r#"
            SELECT id, event, role, actor, created_at
            FROM audit_logs
            WHERE date(created_at) >= date('now', 'start of month')
            ORDER BY created_at DESC
            "#
        }
        "year" => {
            r#"
            SELECT id, event, role, actor, created_at
            FROM audit_logs
            WHERE date(created_at) >= date('now', 'start of year')
            ORDER BY created_at DESC
            "#
        }
        _ => {
            // "all" or default
            r#"
            SELECT id, event, role, actor, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            "#
        }
    };

    let rows = sqlx::query_as::<_, AuditLogRow>(query)
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
            update_client,
            delete_client,
            create_inventory_item,
            list_inventory_items,
            update_inventory_item,
            delete_inventory_item,
            create_work_order,
            list_work_orders,
            update_work_order_assignees,
            update_work_order_status,
            create_delivery_event,
            list_delivery_events,
            list_users,
            update_user_flags,
            get_available_drivers,
            list_motd,
            create_motd,
            list_audit_logs
        ])
        .run(tauri::generate_context!())?;

    Ok(app)
}

