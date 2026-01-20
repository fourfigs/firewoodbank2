use crate::{AppState};
use crate::commands::audit::{audit_db, audit_change};
use tauri::State;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Transaction};
use std::collections::HashSet;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct WorkOrderInput {
    pub client_id: String,
    pub client_title: Option<String>,
    pub client_name: String,
    pub physical_address_line1: String,
    pub physical_address_line2: Option<String>,
    pub physical_address_city: String,
    pub physical_address_state: String,
    pub physical_address_postal_code: String,
    pub mailing_address_line1: Option<String>,
    pub mailing_address_line2: Option<String>,
    pub mailing_address_city: Option<String>,
    pub mailing_address_state: Option<String>,
    pub mailing_address_postal_code: Option<String>,
    pub telephone: Option<String>,
    pub email: Option<String>,
    pub directions: Option<String>,
    pub gate_combo: Option<String>,
    pub mileage: Option<f64>,
    pub other_heat_source_gas: bool,
    pub other_heat_source_electric: bool,
    pub other_heat_source_other: Option<String>,
    pub notes: Option<String>,
    pub scheduled_date: Option<String>,
    pub status: Option<String>,
    pub wood_size_label: Option<String>,
    pub wood_size_other: Option<String>,
    pub delivery_size_label: Option<String>,
    pub delivery_size_cords: Option<f64>,
    pub pickup_delivery_type: Option<String>,
    pub pickup_quantity_cords: Option<f64>,
    pub pickup_length: Option<f64>,
    pub pickup_width: Option<f64>,
    pub pickup_height: Option<f64>,
    pub pickup_units: Option<String>,
    pub assignees_json: Option<String>,
    pub created_by_user_id: Option<String>,
    pub created_by_display: Option<String>,
    pub paired_order_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct WorkOrderRow {
    pub id: String,
    pub client_name: String,
    pub status: String,
    pub scheduled_date: Option<String>,
    pub gate_combo: Option<String>,
    pub notes: Option<String>,
    pub telephone: Option<String>,
    pub physical_address_line1: Option<String>,
    pub physical_address_city: Option<String>,
    pub physical_address_state: Option<String>,
    pub physical_address_postal_code: Option<String>,
    pub mileage: Option<f64>,
    pub wood_size_label: Option<String>,
    pub wood_size_other: Option<String>,
    pub delivery_size_label: Option<String>,
    pub delivery_size_cords: Option<f64>,
    pub pickup_delivery_type: Option<String>,
    pub pickup_quantity_cords: Option<f64>,
    pub pickup_length: Option<f64>,
    pub pickup_width: Option<f64>,
    pub pickup_height: Option<f64>,
    pub pickup_units: Option<String>,
    pub assignees_json: Option<String>,
    pub created_by_display: Option<String>,
    pub created_at: Option<String>,
    pub paired_order_id: Option<String>,
    pub client_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct WorkOrderAssignmentInput {
    pub work_order_id: String,
    pub assignees_json: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct WorkOrderStatusInput {
    pub work_order_id: String,
    pub status: Option<String>,
    pub mileage: Option<f64>,
    pub is_driver: Option<bool>,
}

// Helper function for inventory adjustment
async fn adjust_inventory_for_transition_tx(
    tx: &mut Transaction<'_, sqlx::Sqlite>,
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

    // Adjust reserved quantity based on status transition
    if !prev_reserved && next_reserved {
        // Moving into reserved state - increase reserved
        reserved += delivery_size_cords;
        on_hand -= delivery_size_cords;
    } else if prev_reserved && !next_reserved {
        // Moving out of reserved state - decrease reserved
        reserved -= delivery_size_cords;
        on_hand += delivery_size_cords;
    }

    // Ensure we don't go negative
    if on_hand < 0.0 {
        return Err("Insufficient inventory for this work order status change.".to_string());
    }
    if reserved < 0.0 {
        reserved = 0.0;
    }

    sqlx::query(
        r#"
        UPDATE inventory_items
        SET quantity_on_hand = ?, reserved_quantity = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(on_hand)
    .bind(reserved)
    .bind(record.id)
    .execute(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

// Work order management commands

#[tauri::command]
pub async fn create_work_order(
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
            pickup_delivery_type,
            pickup_quantity_cords, pickup_length, pickup_width, pickup_height, pickup_units,
            assignees_json,
            created_by_user_id, created_by_display,
            paired_order_id
        )
        VALUES (
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?, ?, ?,
            ?,
            ?, ?, ?, ?
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
        .bind(&input.pickup_delivery_type)
        .bind(&input.pickup_quantity_cords)
        .bind(&input.pickup_length)
        .bind(&input.pickup_width)
        .bind(&input.pickup_height)
        .bind(&input.pickup_units)
        .bind(&assignees_store)
        .bind(&input.created_by_user_id)
        .bind(&input.created_by_display)
        .bind(&input.paired_order_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // If this order is paired with another, update the other order's paired_order_id to point back
    if let Some(paired_id) = &input.paired_order_id {
        if !paired_id.is_empty() {
            sqlx::query(
                r#"UPDATE work_orders SET paired_order_id = ?, updated_at = datetime('now') WHERE id = ?"#
            )
            .bind(&id)
            .bind(paired_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    let inventory_cords = if status.eq_ignore_ascii_case("picked_up") {
        input.pickup_quantity_cords.unwrap_or(0.0)
    } else {
        input.delivery_size_cords.unwrap_or(0.0)
    };
    adjust_inventory_for_transition_tx(&mut tx, "draft", &status, inventory_cords)
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
            .bind("Work Order Scheduled")
            .bind(&format!("Work order scheduled for {}", start_date))
            .bind("scheduled")
            .bind(&id)
            .bind(start_date)
            .bind(start_date)
            .bind("#3174ad")
            .bind(&assigned_json)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn list_work_orders(
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
            pickup_delivery_type,
            pickup_quantity_cords,
            pickup_length,
            pickup_width,
            pickup_height,
            pickup_units,
            assignees_json,
            created_by_display,
            created_at,
            paired_order_id,
            client_id
        FROM work_orders
        WHERE is_deleted = 0
        ORDER BY COALESCE(scheduled_date, created_at) DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let username_val = username.unwrap_or_default();
    let is_hipaa = hipaa_certified.unwrap_or(false);
    let driver_capable = is_driver.unwrap_or(false);
    audit_db(&state.pool, "list_work_orders", &role_val, &username_val).await;

    // Apply role-based filtering
    if driver_capable {
        // Drivers only see work orders they are assigned to
        rows = rows
            .into_iter()
            .filter(|wo| {
                if let Some(assignees) = &wo.assignees_json {
                    if let Ok(assignees_vec) = serde_json::from_str::<Vec<String>>(assignees) {
                        assignees_vec.iter().any(|a| a.to_lowercase() == username_val.to_lowercase())
                    } else {
                        false
                    }
                } else {
                    false
                }
            })
            .collect();
    } else if !(role_val == "admin" || (role_val == "lead" && is_hipaa)) {
        // Non-HIPAA users get limited data
        rows.iter_mut().for_each(|wo| {
            wo.gate_combo = None;
            wo.notes = None;
            wo.telephone = None;
            wo.physical_address_line1 = Some("Hidden".to_string());
            wo.physical_address_city = Some("Hidden".to_string());
            wo.physical_address_state = Some("Hidden".to_string());
            wo.physical_address_postal_code = Some("Hidden".to_string());
        });
    }

    Ok(rows)
}

#[tauri::command]
pub async fn update_work_order_assignees(
    state: State<'_, AppState>,
    input: WorkOrderAssignmentInput,
    role: Option<String>,
    actor: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let actor_val = actor.unwrap_or_else(|| "unknown".to_string());
    if role_val != "admin" && role_val != "lead" {
        return Err("Only admins or leads can assign drivers/helpers".to_string());
    }

    let existing = sqlx::query!(
        "SELECT assignees_json FROM work_orders WHERE id = ? AND is_deleted = 0",
        input.work_order_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE work_orders
        SET assignees_json = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&input.assignees_json)
    .bind(&input.work_order_id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(prev) = existing {
        audit_change(
            &state.pool,
            "update_work_order_assignees",
            &role_val,
            &actor_val,
            "work_orders",
            &input.work_order_id,
            "assignees_json",
            prev.assignees_json,
            input.assignees_json,
        )
        .await;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_work_order_status(
    state: State<'_, AppState>,
    input: WorkOrderStatusInput,
    role: Option<String>,
    actor: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let actor_val = actor.unwrap_or_else(|| "unknown".to_string());
    let driver_capable = input.is_driver.unwrap_or(false);
    audit_db(
        &state.pool,
        "update_work_order_status",
        &role_val,
        &actor_val,
    )
    .await;

    let existing = sqlx::query!(
        "SELECT status, mileage FROM work_orders WHERE id = ? AND is_deleted = 0",
        input.work_order_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    // Build update query dynamically
    let mut query = "UPDATE work_orders SET updated_at = datetime('now')".to_string();
    let mut binds: Vec<String> = vec![];

    if let Some(status) = &input.status {
        query.push_str(", status = ?");
        binds.push(status.clone());
    }

    if let Some(mileage) = input.mileage {
        if driver_capable {
            query.push_str(", mileage = ?");
            binds.push(mileage.to_string());
        }
    }

    query.push_str(" WHERE id = ?");
    binds.push(input.work_order_id.clone());

    let mut sql_query = sqlx::query(&query);
    for bind in binds {
        sql_query = sql_query.bind(bind);
    }

    sql_query.execute(&state.pool).await.map_err(|e| e.to_string())?;

    // Log changes
    if let Some(prev) = existing {
        if let Some(new_status) = &input.status {
            if prev.status != *new_status {
                audit_change(
                    &state.pool,
                    "update_work_order_status",
                    &role_val,
                    &actor_val,
                    "work_orders",
                    &input.work_order_id,
                    "status",
                    Some(prev.status),
                    Some(new_status.clone()),
                )
                .await;
            }
        }

        if let Some(new_mileage) = input.mileage {
            if driver_capable && prev.mileage != Some(new_mileage) {
                audit_change(
                    &state.pool,
                    "update_work_order_status",
                    &role_val,
                    &actor_val,
                    "work_orders",
                    &input.work_order_id,
                    "mileage",
                    prev.mileage.map(|m| m.to_string()),
                    Some(new_mileage.to_string()),
                )
                .await;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn update_work_order_assignees(
    state: State<'_, AppState>,
    input: WorkOrderAssignmentInput,
    role: Option<String>,
    actor: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let actor_val = actor.unwrap_or_else(|| "unknown".to_string());
    if role_val != "admin" && role_val != "lead" {
        return Err("Only admins or leads can assign drivers/helpers".to_string());
    }

    let existing = sqlx::query!(
        "SELECT assignees_json FROM work_orders WHERE id = ? AND is_deleted = 0",
        input.work_order_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE work_orders
        SET assignees_json = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&input.assignees_json)
    .bind(&input.work_order_id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(prev) = existing {
        audit_change(
            &state.pool,
            "update_work_order_assignees",
            &role_val,
            &actor_val,
            "work_orders",
            &input.work_order_id,
            "assignees_json",
            prev.assignees_json,
            input.assignees_json,
        )
        .await;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_work_order_status(
    state: State<'_, AppState>,
    input: WorkOrderStatusInput,
    role: Option<String>,
    actor: Option<String>,
) -> Result<(), String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    let actor_val = actor.unwrap_or_else(|| "unknown".to_string());
    let driver_capable = input.is_driver.unwrap_or(false);
    audit_db(
        &state.pool,
        "update_work_order_status",
        &role_val,
        &actor_val,
    )
    .await;

    let existing = sqlx::query!(
        "SELECT status, mileage FROM work_orders WHERE id = ? AND is_deleted = 0",
        input.work_order_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    // Build update query dynamically
    let mut query = "UPDATE work_orders SET updated_at = datetime('now')".to_string();
    let mut binds: Vec<String> = vec![];

    if let Some(status) = &input.status {
        query.push_str(", status = ?");
        binds.push(status.clone());
    }

    if let Some(mileage) = input.mileage {
        if driver_capable {
            query.push_str(", mileage = ?");
            binds.push(mileage.to_string());
        }
    }

    query.push_str(" WHERE id = ?");
    binds.push(input.work_order_id.clone());

    let mut sql_query = sqlx::query(&query);
    for bind in binds {
        sql_query = sql_query.bind(bind);
    }

    sql_query.execute(&state.pool).await.map_err(|e| e.to_string())?;

    // Log changes
    if let Some(prev) = existing {
        if let Some(new_status) = &input.status {
            if prev.status != *new_status {
                audit_change(
                    &state.pool,
                    "update_work_order_status",
                    &role_val,
                    &actor_val,
                    "work_orders",
                    &input.work_order_id,
                    "status",
                    Some(prev.status),
                    Some(new_status.clone()),
                )
                .await;
            }
        }

        if let Some(new_mileage) = input.mileage {
            if driver_capable && prev.mileage != Some(new_mileage) {
                audit_change(
                    &state.pool,
                    "update_work_order_status",
                    &role_val,
                    &actor_val,
                    "work_orders",
                    &input.work_order_id,
                    "mileage",
                    prev.mileage.map(|m| m.to_string()),
                    Some(new_mileage.to_string()),
                )
                .await;
            }
        }
    }

    Ok(())
}