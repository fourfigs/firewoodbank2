#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
    format!(
        "sqlite://{}",
        root_db.canonicalize().unwrap_or(root_db).to_string_lossy()
    )
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
struct ClientInput {
    client_title: Option<String>,
    first_name: Option<String>, // Frontend field
    last_name: Option<String>,  // Frontend field
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
    client_title: Option<String>,
    first_name: Option<String>, // Frontend field
    last_name: Option<String>,  // Frontend field
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
    created_at: String,
}

#[derive(Debug, Serialize, FromRow)]
struct ClientConflictRow {
    id: String,
    name: String,
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
async fn create_client(state: State<'_, AppState>, input: ClientInput) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let approval_status = input
        .approval_status
        .unwrap_or_else(|| "pending".to_string());
    audit_db(&state.pool, "create_client", "unknown", "unknown").await;

    // Extract first_name and last_name from input
    let first_name = input.first_name.as_deref().unwrap_or("").trim().to_string();
    let last_name = input.last_name.as_deref().unwrap_or("").trim().to_string();

    // Compute name from first_name + last_name
    if first_name.is_empty() && last_name.is_empty() {
        return Err("Both 'first_name' and 'last_name' are required.".to_string());
    }

    let name = format!("{} {}", first_name, last_name).trim().to_string();

    // Ensure name is not empty
    if name.is_empty() {
        return Err("Name cannot be empty.".to_string());
    }

    // Enforce: a name can only have one address; check conflicts before insert.
    let conflicts = sqlx::query_as::<_, ClientConflictRow>(
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

    for existing in conflicts {
        let same_address = existing
            .physical_address_line1
            .eq_ignore_ascii_case(&input.physical_address_line1)
            && existing
                .physical_address_city
                .eq_ignore_ascii_case(&input.physical_address_city)
            && existing
                .physical_address_state
                .eq_ignore_ascii_case(&input.physical_address_state);
        if !same_address {
            return Err(format!(
                "Name '{}' already exists at a different address (id {}, {} {})",
                existing.name,
                existing.id,
                existing.physical_address_line1,
                existing.physical_address_city
            ));
        }
    }

    let query = r#"
        INSERT INTO clients (
            id, client_title, name,
            first_name, last_name,
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
            ?, ?,
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
        .bind(&input.client_title)
        .bind(&name)
        .bind(&first_name)
        .bind(&last_name)
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
            directions,
            created_at
        FROM clients
        WHERE is_deleted = 0
        ORDER BY COALESCE(date_of_onboarding, created_at) ASC
        "#,
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
                let assignees: Vec<String> =
                    serde_json::from_str(row.assignees_json.as_deref().unwrap_or("[]"))
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
    let approval_status = input
        .approval_status
        .unwrap_or_else(|| "pending".to_string());
    audit_db(&state.pool, "update_client", "unknown", "unknown").await;

    // Extract first_name and last_name from input
    let first_name = input.first_name.as_deref().unwrap_or("").trim().to_string();
    let last_name = input.last_name.as_deref().unwrap_or("").trim().to_string();

    // Compute name from first_name + last_name
    if first_name.is_empty() && last_name.is_empty() {
        return Err("Both 'first_name' and 'last_name' are required.".to_string());
    }

    let name = format!("{} {}", first_name, last_name).trim().to_string();

    // Ensure name is not empty
    if name.is_empty() {
        return Err("Name cannot be empty.".to_string());
    }

    let query = r#"
        UPDATE clients
        SET client_title = ?,
            name = ?,
            first_name = ?,
            last_name = ?,
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
        .bind(&input.client_title)
        .bind(&name)
        .bind(&first_name)
        .bind(&last_name)
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
            id, client_id, client_title, client_name,
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
        "#,
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
) -> Result<(), String> {
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
        "#,
    )
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

    // If no wood inventory item found, treat as an error to avoid silent no-op transitions
    let record = match inventory_row {
        Some(r) => r,
        None => {
            return Err(
                "No wood inventory item found to adjust (add a wood inventory item).".to_string(),
            )
        }
    };

    let mut reserved = record.reserved_quantity;
    let mut on_hand = record.quantity_on_hand;

    // If moving into a reserved state, ensure availability before reserving
    if !prev_reserved && next_reserved {
        let available = on_hand - reserved;
        if available < delivery_size_cords {
            return Err(format!(
                "Insufficient inventory to reserve {} cords (available: {}).",
                delivery_size_cords, available
            ));
        }
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

    // Ensure reserved never exceeds on-hand after adjustments (concurrency safety)
    if reserved > on_hand {
        reserved = on_hand;
    }

    sqlx::query(
        r#"
        UPDATE inventory_items
        SET reserved_quantity = ?, quantity_on_hand = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(reserved)
    .bind(on_hand)
    .bind(&record.id)
    .execute(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

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
    audit_db(
        &state.pool,
        "update_work_order_assignees",
        &role_val,
        "unknown",
    )
    .await;

    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE work_orders
        SET assignees_json = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
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
        "#,
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
    audit_db(
        &state.pool,
        "update_work_order_status",
        &role_val,
        "unknown",
    )
    .await;

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
    let next_status = input
        .status
        .clone()
        .unwrap_or_else(|| current_status.clone());
    let delivery_size = existing.delivery_size_cords.unwrap_or(0.0);

    // Simple validation: mileage required if status completed
    if next_status == "completed" && input.mileage.is_none() {
        return Err("Mileage is required to mark completed".to_string());
    }

    // Volunteers can only update if they are marked as drivers.
    if role_val == "volunteer" && !driver_capable {
        return Err("Volunteers cannot update status/mileage".to_string());
    }

    if driver_capable && input.status.is_some() {
        let allowed = ["in_progress", "delivered", "issue"];
        if !allowed.contains(&next_status.as_str()) {
            return Err("Drivers can only mark in_progress, delivered, or issue".to_string());
        }
    }

    sqlx::query(
        r#"
        UPDATE work_orders
        SET status = ?,
            mileage = COALESCE(?, mileage),
            updated_at = datetime('now')
        WHERE id = ? AND is_deleted = 0
        "#,
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
            list_invoices,
            create_invoice_from_work_order,
            list_pending_changes,
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
