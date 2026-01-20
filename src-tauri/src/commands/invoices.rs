use crate::{AppState};
use crate::commands::audit::audit_db;
use tauri::State;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct InvoiceRow {
    pub id: String,
    pub work_order_id: Option<String>,
    pub invoice_number: String,
    pub invoice_date: String,
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
    pub client_snapshot_json: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceInput {
    pub work_order_id: String,
}

// Invoice management commands

#[tauri::command]
pub async fn list_invoices(state: State<'_, AppState>) -> Result<Vec<InvoiceRow>, String> {
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
pub async fn create_invoice_from_work_order(
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