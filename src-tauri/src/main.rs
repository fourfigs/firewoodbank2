#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use anyhow::Result;
use db::init_pool;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    pool: SqlitePool,
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

#[derive(Debug, Serialize)]
struct ClientRow {
    id: String,
    name: String,
    client_number: String,
    email: Option<String>,
    telephone: Option<String>,
    approval_status: String,
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

#[derive(Debug, Serialize)]
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

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
async fn create_client(state: State<'_, AppState>, input: ClientInput) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let approval_status = input.approval_status.unwrap_or_else(|| "pending".to_string());
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
    let rows = sqlx::query_as!(
        ClientRow,
        r#"
        SELECT
            id,
            name,
            client_number,
            email,
            telephone,
            approval_status
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
    let rows = sqlx::query_as!(
        InventoryRow,
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

fn main() -> Result<()> {
    let app = tauri::Builder::default()
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                let pool = init_pool("sqlite://firewoodbank.db").await?;
                app.manage(AppState { pool });
                Ok::<(), anyhow::Error>(())
            })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            create_client,
            list_clients,
            create_inventory_item,
            list_inventory_items
        ])
        .run(tauri::generate_context!())?;

    Ok(app)
}

