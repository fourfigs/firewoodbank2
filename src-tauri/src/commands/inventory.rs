use crate::{AppState, InventoryRow};
use crate::commands::audit::{audit_db, audit_change};
use tauri::State;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct InventoryInput {
    pub name: String,
    pub category: Option<String>,
    pub quantity_on_hand: f64,
    pub unit: String,
    pub reorder_threshold: f64,
    pub reorder_amount: Option<f64>,
    pub notes: Option<String>,
    pub created_by_user_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct InventoryRow {
    pub id: String,
    pub name: String,
    pub category: Option<String>,
    pub quantity_on_hand: f64,
    pub unit: String,
    pub reorder_threshold: f64,
    pub reorder_amount: Option<f64>,
    pub notes: Option<String>,
    pub reserved_quantity: f64,
}

#[derive(Debug, Deserialize)]
pub struct InventoryUpdateInput {
    pub id: String,
    pub name: String,
    pub category: Option<String>,
    pub quantity_on_hand: f64,
    pub unit: String,
    pub reorder_threshold: f64,
    pub reorder_amount: Option<f64>,
    pub notes: Option<String>,
}

// Inventory management commands

#[tauri::command]
pub async fn create_inventory_item(state: State<'_, AppState>, input: InventoryInput) -> Result<String, String> {
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
pub async fn list_inventory_items(state: State<'_, AppState>) -> Result<Vec<InventoryRow>, String> {
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
pub async fn update_inventory_item(
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
pub async fn delete_inventory_item(state: State<'_, AppState>, id: String) -> Result<(), String> {
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