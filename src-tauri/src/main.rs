#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod sync;

use anyhow::Result;
use db::init_pool;
use sync::{SyncRecord, SyncService};
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Sqlite, SqlitePool, Transaction};
use std::collections::HashSet;
use std::path::PathBuf;
use tauri::{Manager, State};
use uuid::Uuid;


#[derive(Clone)]
struct AppState {
    pool: SqlitePool,
}

fn role_rank(role: &str) -> i32 {
    match role {
        "admin" => 3,
        "lead" => 2,
        "staff" => 1,
        _ => 0,
    }
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
    let canonical = root_db.canonicalize().unwrap_or(root_db);
    // Convert Windows backslashes to forward slashes and URL-encode spaces for SQLite URL
    let path_str = canonical.to_string_lossy().replace('\\', "/");
    // Remove Windows extended path prefix if present (\\?\)
    let path_str = path_str.strip_prefix("//?/").unwrap_or(&path_str);
    // URL-encode spaces
    let path_str = path_str.replace(' ', "%20");
    format!("sqlite://{}", path_str)
}

async fn migrate_auth_passwords(pool: &SqlitePool) -> Result<(), String> {
    let rows = sqlx::query!(
        r#"
        SELECT id, password
        FROM auth_users
        WHERE is_deleted = 0
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    for row in rows {
        if !row.password.starts_with("$2") {
            let hashed = hash(row.password, DEFAULT_COST).map_err(|e| e.to_string())?;
            sqlx::query(
                r#"
                UPDATE auth_users
                SET password = ?, updated_at = datetime('now')
                WHERE id = ?
                "#,
            )
            .bind(&hashed)
            .bind(&row.id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

async fn ensure_seed_login(
    pool: &SqlitePool,
    username: &str,
    password: &str,
    name: &str,
    role: &str,
    hipaa: bool,
) -> Result<(), String> {
    let user = sqlx::query!(
        r#"
        SELECT id
        FROM users
        WHERE lower(name) = lower(?)
          AND is_deleted = 0
        LIMIT 1
        "#,
        name
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let user_id = if let Some(row) = user {
        row.id
    } else {
        let id = Uuid::new_v4().to_string();
        sqlx::query(
            r#"
            INSERT INTO users (
                id, name, email, telephone,
                role, hipaa_certified, is_driver,
                created_at, updated_at, is_deleted
            )
            VALUES (?, ?, NULL, NULL, ?, ?, 0, datetime('now'), datetime('now'), 0)
            "#,
        )
        .bind(&id)
        .bind(name)
        .bind(role)
        .bind(if hipaa { 1 } else { 0 })
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        id
    };

    let existing = sqlx::query!(
        r#"
        SELECT id, user_id, password
        FROM auth_users
        WHERE lower(username) = lower(?)
          AND is_deleted = 0
        LIMIT 1
        "#,
        username
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let hashed = hash(password, DEFAULT_COST).map_err(|e| e.to_string())?;

    if let Some(row) = existing {
        if row.user_id != user_id {
            return Err(format!("Username {} already assigned to another user", username));
        }
        if !row.password.starts_with("$2") || !verify(password, &row.password).map_err(|e| e.to_string())? {
            sqlx::query(
                r#"
                UPDATE auth_users
                SET password = ?, updated_at = datetime('now')
                WHERE id = ?
                "#,
            )
            .bind(&hashed)
            .bind(&row.id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    let login_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO auth_users (id, user_id, username, password, created_at, updated_at, is_deleted)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 0)
        "#,
    )
    .bind(&login_id)
    .bind(&user_id)
    .bind(username)
    .bind(&hashed)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

async fn seed_default_logins(pool: &SqlitePool) -> anyhow::Result<()> {
    migrate_auth_passwords(pool).await.map_err(|e| anyhow::anyhow!(e))?;
    ensure_seed_login(pool, "admin", "admin", "Admin", "admin", true)
        .await
        .map_err(|e| anyhow::anyhow!(e))?;
    ensure_seed_login(pool, "lead", "lead", "Lead", "lead", true)
        .await
        .map_err(|e| anyhow::anyhow!(e))?;
    ensure_seed_login(pool, "staff", "staff", "Staff", "staff", false)
        .await
        .map_err(|e| anyhow::anyhow!(e))?;
    ensure_seed_login(pool, "volunteer", "volunteer", "Volunteer", "volunteer", false)
        .await
        .map_err(|e| anyhow::anyhow!(e))?;
    ensure_seed_login(pool, "sketch", "Sketching2!", "Sketch", "admin", true)
        .await
        .map_err(|e| anyhow::anyhow!(e))?;
    Ok(())
}

#[derive(Debug, Deserialize)]

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
    pickup_delivery_type: Option<String>,
    pickup_quantity_cords: Option<f64>,
    pickup_length: Option<f64>,
    pickup_width: Option<f64>,
    pickup_height: Option<f64>,
    pickup_units: Option<String>,
    assignees_json: Option<String>,
    created_by_user_id: Option<String>,
    created_by_display: Option<String>,
    paired_order_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct WorkOrderRow {
    id: String,
    client_name: String,
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
    pickup_delivery_type: Option<String>,
    pickup_quantity_cords: Option<f64>,
    pickup_length: Option<f64>,
    pickup_width: Option<f64>,
    pickup_height: Option<f64>,
    pickup_units: Option<String>,
    assignees_json: Option<String>,
    created_by_display: Option<String>,
    created_at: Option<String>,
    paired_order_id: Option<String>,
    client_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct InvoiceRow {
    id: String,
    work_order_id: Option<String>,
    invoice_number: String,
    invoice_date: String,
    subtotal: f64,
    tax: f64,
    total: f64,
    client_snapshot_json: Option<String>,
    notes: Option<String>,
    status: String,
    created_at: String,
}

#[derive(Debug, Serialize, FromRow)]
struct UserRow {
    id: String,
    name: String,
    email: Option<String>,
    telephone: Option<String>,
    physical_address_line1: Option<String>,
    physical_address_line2: Option<String>,
    physical_address_city: Option<String>,
    physical_address_state: Option<String>,
    physical_address_postal_code: Option<String>,
    mailing_address_line1: Option<String>,
    mailing_address_line2: Option<String>,
    mailing_address_city: Option<String>,
    mailing_address_state: Option<String>,
    mailing_address_postal_code: Option<String>,
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

#[derive(Debug, Deserialize)]
struct ChangeRequestInput {
    title: String,
    description: String,
    requested_by_user_id: String,
}

#[derive(Debug, Serialize, FromRow)]
struct ChangeRequestRow {
    id: String,
    title: String,
    description: String,
    requested_by_user_id: String,
    status: String,
    resolution_notes: Option<String>,
    resolved_by_user_id: Option<String>,
    created_at: String,
}

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

// `get_next_client_number` removed: client numbers are no longer used.
// Generation and storage of client numbers has been removed per project decision.

#[tauri::command]




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
        "#,
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
        "#,
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
    role: Option<String>,
    actor: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "unknown".to_string());
    let actor_val = actor.unwrap_or_else(|| "unknown".to_string());
    audit_db(&state.pool, "update_inventory_item", &role_val, &actor_val).await;

    let existing = sqlx::query!(
        r#"
        SELECT name, category, quantity_on_hand, unit, reorder_threshold, reorder_amount, notes
        FROM inventory_items
        WHERE id = ? AND is_deleted = 0
        "#,
        input.id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
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
    if let Some(prev) = existing {
        let log_field = |field: &str, old_val: Option<String>, new_val: Option<String>| {
            if old_val != new_val {
                let pool = state.pool.clone();
                let role = role_val.clone();
                let actor = actor_val.clone();
                let entity_id = input.id.clone();
                let field = field.to_string();
                tauri::async_runtime::spawn(async move {
                    audit_change(
                        &pool,
                        "update_inventory_item",
                        &role,
                        &actor,
                        "inventory_items",
                        &entity_id,
                        &field,
                        old_val,
                        new_val,
                    )
                    .await;
                });
            }
        };
        log_field("name", Some(prev.name), Some(input.name.clone()));
        log_field("category", prev.category, input.category.clone());
        log_field(
            "quantity_on_hand",
            Some(prev.quantity_on_hand.to_string()),
            Some(input.quantity_on_hand.to_string()),
        );
        log_field("unit", Some(prev.unit), Some(input.unit.clone()));
        log_field(
            "reorder_threshold",
            Some(prev.reorder_threshold.to_string()),
            Some(input.reorder_threshold.to_string()),
        );
        log_field(
            "reorder_amount",
            prev.reorder_amount.map(|v| v.to_string()),
            input.reorder_amount.map(|v| v.to_string()),
        );
        log_field("notes", prev.notes, input.notes.clone());
    }
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
#[tauri::command]
async fn adjust_inventory_for_transition_tx(
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
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    audit_db(&state.pool, "list_users", "unknown", "unknown").await;
    Ok(rows)
}

#[derive(Debug, Deserialize)]
struct EnsureUserInput {
    name: String,
    email: Option<String>,
    telephone: Option<String>,
    physical_address_line1: Option<String>,
    physical_address_line2: Option<String>,
    physical_address_city: Option<String>,
    physical_address_state: Option<String>,
    physical_address_postal_code: Option<String>,
    mailing_address_line1: Option<String>,
    mailing_address_line2: Option<String>,
    mailing_address_city: Option<String>,
    mailing_address_state: Option<String>,
    mailing_address_postal_code: Option<String>,
    role: String,
    is_driver: Option<bool>,
    hipaa_certified: Option<bool>,
}

#[tauri::command]
async fn ensure_user_exists(state: State<'_, AppState>, input: EnsureUserInput) -> Result<String, String> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let role = input.role.trim().to_lowercase();
    let existing = sqlx::query!(
        r#"
        SELECT
            id,
            role,
            email,
            telephone,
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
            COALESCE(is_driver, 0) as "is_driver!: i64",
            COALESCE(hipaa_certified, 0) as "hipaa_certified!: i64"
        FROM users
        WHERE lower(name) = lower(?)
          AND is_deleted = 0
        LIMIT 1
        "#,
        name
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let wants_driver = input.is_driver.unwrap_or(false);
    let wants_hipaa = input.hipaa_certified.unwrap_or(false);

    if let Some(row) = existing {
        let mut updated = false;
        let update_role = if role_rank(&role) > role_rank(&row.role) {
            updated = true;
            role.clone()
        } else {
            row.role.clone()
        };
        let update_email = if row.email.is_none() && input.email.is_some() {
            updated = true;
            input.email.clone()
        } else {
            row.email.clone()
        };
        let update_phone = if row.telephone.is_none() && input.telephone.is_some() {
            updated = true;
            input.telephone.clone()
        } else {
            row.telephone.clone()
        };
        let update_phys_line1 = if row.physical_address_line1.is_none() && input.physical_address_line1.is_some() {
            updated = true;
            input.physical_address_line1.clone()
        } else {
            row.physical_address_line1.clone()
        };
        let update_phys_line2 = if row.physical_address_line2.is_none() && input.physical_address_line2.is_some() {
            updated = true;
            input.physical_address_line2.clone()
        } else {
            row.physical_address_line2.clone()
        };
        let update_phys_city = if row.physical_address_city.is_none() && input.physical_address_city.is_some() {
            updated = true;
            input.physical_address_city.clone()
        } else {
            row.physical_address_city.clone()
        };
        let update_phys_state = if row.physical_address_state.is_none() && input.physical_address_state.is_some() {
            updated = true;
            input.physical_address_state.clone()
        } else {
            row.physical_address_state.clone()
        };
        let update_phys_postal = if row.physical_address_postal_code.is_none() && input.physical_address_postal_code.is_some() {
            updated = true;
            input.physical_address_postal_code.clone()
        } else {
            row.physical_address_postal_code.clone()
        };
        let update_mail_line1 = if row.mailing_address_line1.is_none() && input.mailing_address_line1.is_some() {
            updated = true;
            input.mailing_address_line1.clone()
        } else {
            row.mailing_address_line1.clone()
        };
        let update_mail_line2 = if row.mailing_address_line2.is_none() && input.mailing_address_line2.is_some() {
            updated = true;
            input.mailing_address_line2.clone()
        } else {
            row.mailing_address_line2.clone()
        };
        let update_mail_city = if row.mailing_address_city.is_none() && input.mailing_address_city.is_some() {
            updated = true;
            input.mailing_address_city.clone()
        } else {
            row.mailing_address_city.clone()
        };
        let update_mail_state = if row.mailing_address_state.is_none() && input.mailing_address_state.is_some() {
            updated = true;
            input.mailing_address_state.clone()
        } else {
            row.mailing_address_state.clone()
        };
        let update_mail_postal = if row.mailing_address_postal_code.is_none() && input.mailing_address_postal_code.is_some() {
            updated = true;
            input.mailing_address_postal_code.clone()
        } else {
            row.mailing_address_postal_code.clone()
        };
        let update_driver = if wants_driver && row.is_driver == 0 {
            updated = true;
            1
        } else {
            row.is_driver
        };
        let update_hipaa = if wants_hipaa && row.hipaa_certified == 0 {
            updated = true;
            1
        } else {
            row.hipaa_certified
        };
        if updated {
            sqlx::query(
                r#"
                UPDATE users
                SET role = ?,
                    email = ?,
                    telephone = ?,
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
                    is_driver = ?,
                    hipaa_certified = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                "#,
            )
            .bind(&update_role)
            .bind(&update_email)
            .bind(&update_phone)
            .bind(&update_phys_line1)
            .bind(&update_phys_line2)
            .bind(&update_phys_city)
            .bind(&update_phys_state)
            .bind(&update_phys_postal)
            .bind(&update_mail_line1)
            .bind(&update_mail_line2)
            .bind(&update_mail_city)
            .bind(&update_mail_state)
            .bind(&update_mail_postal)
            .bind(update_driver)
            .bind(update_hipaa)
            .bind(&row.id)
            .execute(&state.pool)
            .await
            .map_err(|e| e.to_string())?;
        }
        audit_db(&state.pool, "ensure_user_exists", "system", &name).await;
        return Ok(row.id);
    }

    let id = Uuid::new_v4().to_string();
    let is_driver = if wants_driver { 1 } else { 0 };
    let hipaa = if wants_hipaa { 1 } else { 0 };
    sqlx::query(
        r#"
        INSERT INTO users (
            id, name, email, telephone,
            physical_address_line1, physical_address_line2, physical_address_city, physical_address_state, physical_address_postal_code,
            mailing_address_line1, mailing_address_line2, mailing_address_city, mailing_address_state, mailing_address_postal_code,
            role, is_driver, hipaa_certified, created_at, updated_at, is_deleted
        )
        VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, datetime('now'), datetime('now'), 0
        )
        "#,
    )
    .bind(&id)
    .bind(&name)
    .bind(&input.email)
    .bind(&input.telephone)
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
    .bind(&role)
    .bind(is_driver)
    .bind(hipaa)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    audit_db(&state.pool, "ensure_user_exists", "system", &name).await;
    Ok(id)
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
    email: Option<String>,
    telephone: Option<String>,
    physical_address_line1: Option<String>,
    physical_address_line2: Option<String>,
    physical_address_city: Option<String>,
    physical_address_state: Option<String>,
    physical_address_postal_code: Option<String>,
    mailing_address_line1: Option<String>,
    mailing_address_line2: Option<String>,
    mailing_address_city: Option<String>,
    mailing_address_state: Option<String>,
    mailing_address_postal_code: Option<String>,
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
        "#,
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
            if let Ok(schedule) =
                serde_json::from_str::<std::collections::HashMap<String, bool>>(&schedule_json)
            {
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
    actor: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let actor_val = actor.unwrap_or_else(|| "unknown".to_string());
    if role_val != "admin" && role_val != "lead" {
        return Err("Only admins or leads can update users".to_string());
    }
    audit_db(&state.pool, "update_user_flags", &role_val, &actor_val).await;

    let existing = sqlx::query!(
        r#"
        SELECT email, telephone,
               physical_address_line1, physical_address_line2, physical_address_city,
               physical_address_state, physical_address_postal_code,
               mailing_address_line1, mailing_address_line2, mailing_address_city,
               mailing_address_state, mailing_address_postal_code,
               availability_notes, availability_schedule,
               driver_license_status, driver_license_number, driver_license_expires_on,
               vehicle, hipaa_certified, is_driver
        FROM users
        WHERE id = ? AND is_deleted = 0
        "#,
        input.id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

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
        SET email = ?,
            telephone = ?,
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
            availability_notes = ?,
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
    .bind(&input.email)
    .bind(&input.telephone)
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

    if let Some(prev) = existing {
        let log_field = |field: &str, old_val: Option<String>, new_val: Option<String>| {
            if old_val != new_val {
                let pool = state.pool.clone();
                let role = role_val.clone();
                let actor = actor_val.clone();
                let entity_id = input.id.clone();
                let field = field.to_string();
                tauri::async_runtime::spawn(async move {
                    audit_change(
                        &pool,
                        "update_user_flags",
                        &role,
                        &actor,
                        "users",
                        &entity_id,
                        &field,
                        old_val,
                        new_val,
                    )
                    .await;
                });
            }
        };
        log_field("email", prev.email, input.email.clone());
        log_field("telephone", prev.telephone, input.telephone.clone());
        log_field("physical_address_line1", prev.physical_address_line1, input.physical_address_line1.clone());
        log_field("physical_address_line2", prev.physical_address_line2, input.physical_address_line2.clone());
        log_field("physical_address_city", prev.physical_address_city, input.physical_address_city.clone());
        log_field("physical_address_state", prev.physical_address_state, input.physical_address_state.clone());
        log_field("physical_address_postal_code", prev.physical_address_postal_code, input.physical_address_postal_code.clone());
        log_field("mailing_address_line1", prev.mailing_address_line1, input.mailing_address_line1.clone());
        log_field("mailing_address_line2", prev.mailing_address_line2, input.mailing_address_line2.clone());
        log_field("mailing_address_city", prev.mailing_address_city, input.mailing_address_city.clone());
        log_field("mailing_address_state", prev.mailing_address_state, input.mailing_address_state.clone());
        log_field("mailing_address_postal_code", prev.mailing_address_postal_code, input.mailing_address_postal_code.clone());
        log_field("availability_notes", prev.availability_notes, input.availability_notes.clone());
        log_field("availability_schedule", prev.availability_schedule, input.availability_schedule.clone());
        log_field("driver_license_status", prev.driver_license_status, status_clean.clone());
        log_field("driver_license_number", prev.driver_license_number, input.driver_license_number.clone());
        log_field("driver_license_expires_on", prev.driver_license_expires_on, expiry_clean.clone());
        log_field("vehicle", prev.vehicle, input.vehicle.clone());
        log_field("hipaa_certified", Some(prev.hipaa_certified.to_string()), Some(hipaa.to_string()));
        log_field("is_driver", Some(prev.is_driver.to_string()), Some(final_is_driver.to_string()));
    }

    Ok(())
}

#[derive(Debug, Deserialize)]
struct CreateUserInput {
    name: String,
    email: Option<String>,
    telephone: Option<String>,
    physical_address_line1: Option<String>,
    physical_address_line2: Option<String>,
    physical_address_city: Option<String>,
    physical_address_state: Option<String>,
    physical_address_postal_code: Option<String>,
    mailing_address_line1: Option<String>,
    mailing_address_line2: Option<String>,
    mailing_address_city: Option<String>,
    mailing_address_state: Option<String>,
    mailing_address_postal_code: Option<String>,
    role: String,
    is_driver: Option<bool>,
    username: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct CreateInvoiceInput {
    work_order_id: String,
}

#[tauri::command]
async fn create_user(
    state: State<'_, AppState>,
    input: CreateUserInput,
    role: Option<String>,
) -> Result<String, String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    if role_val != "admin" && role_val != "lead" {
        return Err("Only admins or leads can create users".to_string());
    }
    audit_db(&state.pool, "create_user", &role_val, &input.name).await;

    let username = input.username.trim().to_lowercase();
    if username.is_empty() {
        return Err("Username is required".to_string());
    }
    let password = input.password.trim().to_string();
    if password.is_empty() {
        return Err("Password is required".to_string());
    }
    let existing_login = sqlx::query!(
        r#"
        SELECT id FROM auth_users
        WHERE lower(username) = lower(?)
          AND is_deleted = 0
        LIMIT 1
        "#,
        username
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    if existing_login.is_some() {
        return Err("Username already exists".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let is_driver = if input.is_driver.unwrap_or(false) {
        1
    } else {
        0
    };

    sqlx::query(
        r#"
        INSERT INTO users (
            id, name, email, telephone,
            physical_address_line1, physical_address_line2, physical_address_city, physical_address_state, physical_address_postal_code,
            mailing_address_line1, mailing_address_line2, mailing_address_city, mailing_address_state, mailing_address_postal_code,
            role, is_driver, created_at, updated_at, is_deleted
        )
        VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, datetime('now'), datetime('now'), 0
        )
        "#
    )
    .bind(&id)
    .bind(&input.name)
    .bind(&input.email)
    .bind(&input.telephone)
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
    .bind(&input.role)
    .bind(is_driver)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let login_id = Uuid::new_v4().to_string();
    let hashed = hash(&password, DEFAULT_COST).map_err(|e| e.to_string())?;
    sqlx::query(
        r#"
        INSERT INTO auth_users (id, user_id, username, password, created_at, updated_at, is_deleted)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 0)
        "#,
    )
    .bind(&login_id)
    .bind(&id)
    .bind(&username)
    .bind(&hashed)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
async fn list_invoices(state: State<'_, AppState>) -> Result<Vec<InvoiceRow>, String> {
    let rows = sqlx::query_as::<_, InvoiceRow>(
        r#"
        SELECT
            id,
            work_order_id,
            invoice_number,
            invoice_date,
            subtotal,
            tax,
            total,
            client_snapshot_json,
            notes,
            status,
            created_at
        FROM invoices
        WHERE is_deleted = 0
        ORDER BY invoice_date DESC, created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    audit_db(&state.pool, "list_invoices", "unknown", "unknown").await;
    Ok(rows)
}

#[tauri::command]
async fn list_pending_changes(state: State<'_, AppState>) -> Result<Vec<SyncRecord>, String> {
    let service = SyncService::new(state.pool.clone());
    service.list_pending_changes().await
}

#[tauri::command]
fn print_invoice(window: tauri::WebviewWindow) -> Result<(), String> {
    window.eval("window.print()").map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_invoice_from_work_order(
    state: State<'_, AppState>,
    input: CreateInvoiceInput,
) -> Result<String, String> {
    let work_order = sqlx::query!(
        r#"
        SELECT
            id,
            client_id,
            client_name,
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
            telephone,
            email,
            scheduled_date,
            delivery_size_label,
            delivery_size_cords,
            notes
        FROM work_orders
        WHERE id = ?
          AND is_deleted = 0
        LIMIT 1
        "#,
        input.work_order_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Work order not found".to_string())?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let invoice_count = sqlx::query!(
        r#"
        SELECT COUNT(*) as "count!: i64"
        FROM invoices
        WHERE invoice_date = ?
          AND is_deleted = 0
        "#,
        today
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    let seq = invoice_count.count + 1;
    let invoice_number = format!("INV-{}-{:03}", today.replace("-", ""), seq);

    let snapshot = serde_json::json!({
        "client_id": work_order.client_id,
        "client_name": work_order.client_name,
        "physical_address_line1": work_order.physical_address_line1,
        "physical_address_line2": work_order.physical_address_line2,
        "physical_address_city": work_order.physical_address_city,
        "physical_address_state": work_order.physical_address_state,
        "physical_address_postal_code": work_order.physical_address_postal_code,
        "mailing_address_line1": work_order.mailing_address_line1,
        "mailing_address_line2": work_order.mailing_address_line2,
        "mailing_address_city": work_order.mailing_address_city,
        "mailing_address_state": work_order.mailing_address_state,
        "mailing_address_postal_code": work_order.mailing_address_postal_code,
        "telephone": work_order.telephone,
        "email": work_order.email,
        "scheduled_date": work_order.scheduled_date,
        "delivery_size_label": work_order.delivery_size_label,
        "delivery_size_cords": work_order.delivery_size_cords,
        "notes": work_order.notes
    });

    let id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO invoices (
            id, work_order_id, invoice_number, invoice_date,
            subtotal, tax, total, client_snapshot_json, notes, status,
            created_at, updated_at, is_deleted
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'), datetime('now'), 0)
        "#,
    )
    .bind(&id)
    .bind(&work_order.id)
    .bind(&invoice_number)
    .bind(&today)
    .bind(0.0)
    .bind(0.0)
    .bind(0.0)
    .bind(snapshot.to_string())
    .bind(work_order.notes)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let item_id = Uuid::new_v4().to_string();
    let description = match work_order.delivery_size_label.as_deref() {
        Some(label) if !label.is_empty() => format!("Firewood delivery ({})", label),
        _ => "Firewood delivery".to_string(),
    };
    let quantity = work_order.delivery_size_cords.unwrap_or(1.0);
    sqlx::query(
        r#"
        INSERT INTO invoice_line_items (
            id, invoice_id, description, quantity, unit_price, total,
            created_at, updated_at, is_deleted
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)
        "#,
    )
    .bind(&item_id)
    .bind(&id)
    .bind(&description)
    .bind(quantity)
    .bind(0.0)
    .bind(0.0)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    audit_db(&state.pool, "create_invoice_from_work_order", "unknown", "unknown").await;
    Ok(id)
}

#[derive(Debug, Deserialize)]
struct LoginInput {
    username: String,
    password: String,
}

#[derive(Debug, Serialize, FromRow)]
struct LoginResponse {
    user_id: String,
    name: String,
    username: String,
    role: String,
    email: Option<String>,
    telephone: Option<String>,
    hipaa_certified: i64,
    is_driver: i64,
}

#[derive(Debug, Deserialize)]
struct ChangePasswordInput {
    username: String,
    current_password: String,
    new_password: String,
}

#[derive(Debug, Deserialize)]
struct ResetPasswordInput {
    user_id: String,
    new_password: String,
}

#[tauri::command]
async fn login_user(state: State<'_, AppState>, input: LoginInput) -> Result<LoginResponse, String> {
    let username = input.username.trim().to_lowercase();
    let password = input.password.trim().to_string();
    if username.is_empty() || password.is_empty() {
        return Err("Username and password are required".to_string());
    }

    let row = sqlx::query!(
        r#"
        SELECT
            au.user_id as user_id,
            u.name as name,
            au.username as username,
            u.role as role,
            u.email as email,
            u.telephone as telephone,
            COALESCE(u.hipaa_certified, 0) as hipaa_certified,
            COALESCE(u.is_driver, 0) as is_driver,
            au.password as password
        FROM auth_users au
        JOIN users u ON u.id = au.user_id
        WHERE lower(au.username) = lower(?)
          AND au.is_deleted = 0
          AND u.is_deleted = 0
        LIMIT 1
        "#
    , username
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let row = row.ok_or_else(|| "Invalid username or password".to_string())?;
    if !verify(&password, &row.password).map_err(|e| e.to_string())? {
        return Err("Invalid username or password".to_string());
    }

    audit_db(&state.pool, "login_user", &row.role, &row.username).await;
    Ok(LoginResponse {
        user_id: row.user_id,
        name: row.name,
        username: row.username,
        role: row.role,
        email: row.email,
        telephone: row.telephone,
        hipaa_certified: row.hipaa_certified,
        is_driver: row.is_driver,
    })
}

async fn change_password_with_pool(
    pool: &SqlitePool,
    input: ChangePasswordInput,
) -> Result<(), String> {
    let username = input.username.trim().to_lowercase();
    let current_password = input.current_password.trim();
    let new_password = input.new_password.trim();
    if username.is_empty() || current_password.is_empty() || new_password.is_empty() {
        return Err("Username, current password, and new password are required".to_string());
    }

    let row = sqlx::query!(
        r#"
        SELECT id, password
        FROM auth_users
        WHERE lower(username) = lower(?)
          AND is_deleted = 0
        LIMIT 1
        "#,
        username
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "User not found".to_string())?;

    if !verify(current_password, &row.password).map_err(|e| e.to_string())? {
        return Err("Current password is incorrect".to_string());
    }

    let hashed = hash(new_password, DEFAULT_COST).map_err(|e| e.to_string())?;
    sqlx::query(
        r#"
        UPDATE auth_users
        SET password = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&hashed)
    .bind(&row.id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    audit_db(pool, "change_password", "unknown", &username).await;
    Ok(())
}

#[tauri::command]
async fn change_password(state: State<'_, AppState>, input: ChangePasswordInput) -> Result<(), String> {
    change_password_with_pool(&state.pool, input).await
}

async fn reset_password_with_pool(
    pool: &SqlitePool,
    input: ResetPasswordInput,
    role: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    if role_val != "admin" && role_val != "lead" {
        return Err("Only admins or leads can reset passwords".to_string());
    }
    let new_password = input.new_password.trim();
    if new_password.is_empty() {
        return Err("New password is required".to_string());
    }
    let hashed = hash(new_password, DEFAULT_COST).map_err(|e| e.to_string())?;
    sqlx::query(
        r#"
        UPDATE auth_users
        SET password = ?, updated_at = datetime('now')
        WHERE user_id = ?
          AND is_deleted = 0
        "#,
    )
    .bind(&hashed)
    .bind(&input.user_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    audit_db(pool, "reset_password", &role_val, &input.user_id).await;
    Ok(())
}

#[tauri::command]
async fn reset_password(
    state: State<'_, AppState>,
    input: ResetPasswordInput,
    role: Option<String>,
) -> Result<(), String> {
    reset_password_with_pool(&state.pool, input, role).await
}

#[tauri::command]
async fn update_work_order_assignees(
#[tauri::command]
async fn update_work_order_status(
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
    audit_db(
        &state.pool,
        "list_delivery_events",
        &role_val,
        &username_val,
    )
    .await;

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
async fn create_motd(state: State<'_, AppState>, input: MotdInput) -> Result<String, String> {
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

#[tauri::command]
async fn delete_motd(state: State<'_, AppState>, id: String) -> Result<(), String> {
    audit_db(&state.pool, "delete_motd", "unknown", "unknown").await;
    sqlx::query(
        r#"
        UPDATE motd
        SET is_deleted = 1, updated_at = datetime('now')
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
async fn create_change_request(
    state: State<'_, AppState>,
    input: ChangeRequestInput,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    audit_db(&state.pool, "create_change_request", "unknown", "unknown").await;
    sqlx::query(
        r#"
        INSERT INTO change_requests (id, title, description, requested_by_user_id, status)
        VALUES (?, ?, ?, ?, 'open')
        "#,
    )
    .bind(&id)
    .bind(&input.title)
    .bind(&input.description)
    .bind(&input.requested_by_user_id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
async fn list_change_requests(
    state: State<'_, AppState>,
    status: Option<String>,
) -> Result<Vec<ChangeRequestRow>, String> {
    let status_filter = status.unwrap_or_else(|| "open".to_string());
    // If "all", fetch all, else filter
    let query_str = if status_filter == "all" {
        r#"
        SELECT id, title, description, requested_by_user_id, status, resolution_notes, resolved_by_user_id, created_at
        FROM change_requests
        WHERE is_deleted = 0
        ORDER BY created_at DESC
        "#
    } else {
        r#"
        SELECT id, title, description, requested_by_user_id, status, resolution_notes, resolved_by_user_id, created_at
        FROM change_requests
        WHERE is_deleted = 0 AND status = ?
        ORDER BY created_at DESC
        "#
    };

    let rows = if status_filter == "all" {
        sqlx::query_as::<_, ChangeRequestRow>(query_str)
            .fetch_all(&state.pool)
            .await
            .map_err(|e| e.to_string())?
    } else {
        sqlx::query_as::<_, ChangeRequestRow>(query_str)
            .bind(status_filter)
            .fetch_all(&state.pool)
            .await
            .map_err(|e| e.to_string())?
    };

    audit_db(&state.pool, "list_change_requests", "unknown", "unknown").await;
    Ok(rows)
}

#[tauri::command]
async fn resolve_change_request(
    state: State<'_, AppState>,
    id: String,
    status: String,
    resolution_notes: Option<String>,
    resolved_by_user_id: String,
) -> Result<(), String> {
    audit_db(&state.pool, "resolve_change_request", "unknown", "unknown").await;
    sqlx::query(
        r#"
        UPDATE change_requests
        SET status = ?, resolution_notes = ?, resolved_by_user_id = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&status)
    .bind(&resolution_notes)
    .bind(&resolved_by_user_id)
    .bind(&id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, FromRow)]
struct AuditLogRow {
    id: String,
    event: String,
    role: Option<String>,
    actor: Option<String>,
    entity: Option<String>,
    entity_id: Option<String>,
    field: Option<String>,
    old_value: Option<String>,
    new_value: Option<String>,
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
            SELECT id, event, role, actor, entity, entity_id, field, old_value, new_value, created_at
            FROM audit_logs
            WHERE date(created_at) = date('now')
            ORDER BY created_at DESC
            "#
        }
        "7days" => {
            r#"
            SELECT id, event, role, actor, entity, entity_id, field, old_value, new_value, created_at
            FROM audit_logs
            WHERE created_at >= datetime('now', '-7 days')
            ORDER BY created_at DESC
            "#
        }
        "month" => {
            r#"
            SELECT id, event, role, actor, entity, entity_id, field, old_value, new_value, created_at
            FROM audit_logs
            WHERE date(created_at) >= date('now', 'start of month')
            ORDER BY created_at DESC
            "#
        }
        "year" => {
            r#"
            SELECT id, event, role, actor, entity, entity_id, field, old_value, new_value, created_at
            FROM audit_logs
            WHERE date(created_at) >= date('now', 'start of year')
            ORDER BY created_at DESC
            "#
        }
        _ => {
            // "all" or default
            r#"
            SELECT id, event, role, actor, entity, entity_id, field, old_value, new_value, created_at
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

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_auth_tables(pool: &SqlitePool) {
        sqlx::query(
            r#"
            CREATE TABLE auth_users (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                created_at TEXT,
                updated_at TEXT,
                is_deleted INTEGER NOT NULL DEFAULT 0
            )
            "#,
        )
        .execute(pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE audit_logs (
                id TEXT PRIMARY KEY NOT NULL,
                event TEXT NOT NULL,
                role TEXT,
                actor TEXT,
                entity TEXT,
                entity_id TEXT,
                field TEXT,
                old_value TEXT,
                new_value TEXT,
                created_at TEXT NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await
        .unwrap();
    }

    async fn setup_inventory_table(pool: &SqlitePool) {
        sqlx::query(
            r#"
            CREATE TABLE inventory_items (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                unit TEXT NOT NULL,
                quantity_on_hand REAL NOT NULL,
                reserved_quantity REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT,
                is_deleted INTEGER NOT NULL DEFAULT 0
            )
            "#,
        )
        .execute(pool)
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn change_password_updates_hash() {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        setup_auth_tables(&pool).await;

        let hashed = hash("oldpass", DEFAULT_COST).unwrap();
        sqlx::query(
            r#"
            INSERT INTO auth_users (id, user_id, username, password, created_at, updated_at, is_deleted)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 0)
            "#,
        )
        .bind("auth-id")
        .bind("user-id")
        .bind("tester")
        .bind(&hashed)
        .execute(&pool)
        .await
        .unwrap();

        let input = ChangePasswordInput {
            username: "tester".to_string(),
            current_password: "oldpass".to_string(),
            new_password: "newpass".to_string(),
        };
        change_password_with_pool(&pool, input).await.unwrap();

        let row = sqlx::query!("SELECT password FROM auth_users WHERE username = ?", "tester")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(verify("newpass", &row.password).unwrap());
    }

    #[tokio::test]
    async fn adjust_inventory_reserves_on_schedule() {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        setup_inventory_table(&pool).await;

        sqlx::query(
            r#"
            INSERT INTO inventory_items (id, name, unit, quantity_on_hand, reserved_quantity, created_at, is_deleted)
            VALUES (?, ?, ?, ?, ?, datetime('now'), 0)
            "#,
        )
        .bind("inv-1")
        .bind("Firewood")
        .bind("cords")
        .bind(10.0)
        .bind(0.0)
        .execute(&pool)
        .await
        .unwrap();

        let mut tx = pool.begin().await.unwrap();
        adjust_inventory_for_transition_tx(&mut tx, "received", "scheduled", 2.0)
            .await
            .unwrap();
        tx.commit().await.unwrap();

        let row = sqlx::query!(
            "SELECT reserved_quantity FROM inventory_items WHERE id = ?",
            "inv-1"
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(row.reserved_quantity, 2.0);
    }
}

fn main() -> Result<()> {
    let app = tauri::Builder::default()
        .setup(|app| {
            let database_url = resolve_database_url();
            tauri::async_runtime::block_on(async {
                let pool = init_pool(&database_url).await?;
                seed_default_logins(&pool).await?;
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
            ensure_user_exists,
            update_user_flags,
            get_available_drivers,
            login_user,
            change_password,
            reset_password,
            list_invoices,
            create_invoice_from_work_order,
            list_pending_changes,
            print_invoice,
            list_motd,
            create_motd,
            delete_motd,
            create_change_request,
            list_change_requests,
            resolve_change_request,
            list_audit_logs,
            create_user
        ])
        .run(tauri::generate_context!())?;

    Ok(app)
}
