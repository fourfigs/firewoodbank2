use crate::{AppState};
use tauri::State;
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Serialize, FromRow)]
pub struct AuditLogRow {
    pub id: String,
    pub event: String,
    pub role: Option<String>,
    pub actor: Option<String>,
    pub entity: Option<String>,
    pub entity_id: Option<String>,
    pub field: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub created_at: String,
}

// Reporting and audit commands

#[tauri::command]
pub async fn list_audit_logs(
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