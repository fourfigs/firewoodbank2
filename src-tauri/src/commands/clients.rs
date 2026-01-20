use crate::{AppState};
use crate::commands::audit::{audit_db, audit_change};
use tauri::State;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashSet;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ClientInput {
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
pub struct ClientUpdateInput {
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
pub struct ClientRow {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub telephone: Option<String>,
    pub approval_status: String,
    pub date_of_onboarding: Option<String>,
    pub how_did_they_hear_about_us: Option<String>,
    pub referring_agency: Option<String>,
    pub denial_reason: Option<String>,
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
    pub gate_combo: Option<String>,
    pub notes: Option<String>,
    pub wood_size_label: Option<String>,
    pub wood_size_other: Option<String>,
    pub directions: Option<String>,
    pub created_at: String,
    pub default_mileage: Option<f64>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ClientConflictRow {
    pub id: String,
    pub name: String,
    pub physical_address_line1: String,
    pub physical_address_city: String,
    pub physical_address_state: String,
}

// Client management commands

#[tauri::command]
pub async fn create_client(state: State<'_, AppState>, input: ClientInput) -> Result<String, String> {
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
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?
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
pub async fn list_clients(
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
            created_at,
            default_mileage
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
pub async fn update_client(
    state: State<'_, AppState>,
    input: ClientUpdateInput,
    role: Option<String>,
    actor: Option<String>,
) -> Result<(), String> {
    let approval_status = input
        .approval_status
        .unwrap_or_else(|| "pending".to_string());
    let role_val = role.unwrap_or_else(|| "unknown".to_string());
    let actor_val = actor.unwrap_or_else(|| "unknown".to_string());
    audit_db(&state.pool, "update_client", &role_val, &actor_val).await;

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

    let existing = sqlx::query!(
        r#"
        SELECT
            client_title, name, first_name, last_name,
            physical_address_line1, physical_address_line2, physical_address_city,
            physical_address_state, physical_address_postal_code,
            mailing_address_line1, mailing_address_line2, mailing_address_city,
            mailing_address_state, mailing_address_postal_code,
            telephone, email, date_of_onboarding,
            how_did_they_hear_about_us, referring_agency,
            approval_status, denial_reason, gate_combo, notes,
            wood_size_label, wood_size_other, directions
        FROM clients
        WHERE id = ? AND is_deleted = 0
        "#,
        input.id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

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
                        "update_client",
                        &role,
                        &actor,
                        "clients",
                        &entity_id,
                        &field,
                        old_val,
                        new_val,
                    )
                    .await;
                });
            }
        };

        log_field("client_title", prev.client_title, input.client_title.clone());
        log_field("name", Some(prev.name), Some(name.clone()));
        log_field("first_name", prev.first_name, input.first_name.clone());
        log_field("last_name", prev.last_name, input.last_name.clone());
        log_field(
            "physical_address_line1",
            Some(prev.physical_address_line1),
            Some(input.physical_address_line1.clone()),
        );
        log_field("physical_address_line2", prev.physical_address_line2, input.physical_address_line2.clone());
        log_field("physical_address_city", Some(prev.physical_address_city), Some(input.physical_address_city.clone()));
        log_field("physical_address_state", Some(prev.physical_address_state), Some(input.physical_address_state.clone()));
        log_field("physical_address_postal_code", Some(prev.physical_address_postal_code), Some(input.physical_address_postal_code.clone()));
        log_field("mailing_address_line1", prev.mailing_address_line1, input.mailing_address_line1.clone());
        log_field("mailing_address_line2", prev.mailing_address_line2, input.mailing_address_line2.clone());
        log_field("mailing_address_city", prev.mailing_address_city, input.mailing_address_city.clone());
        log_field("mailing_address_state", prev.mailing_address_state, input.mailing_address_state.clone());
        log_field("mailing_address_postal_code", prev.mailing_address_postal_code, input.mailing_address_postal_code.clone());
        log_field("telephone", prev.telephone, input.telephone.clone());
        log_field("email", prev.email, input.email.clone());
        log_field("date_of_onboarding", prev.date_of_onboarding, input.date_of_onboarding.clone());
        log_field("how_did_they_hear_about_us", prev.how_did_they_hear_about_us, input.how_did_they_hear_about_us.clone());
        log_field("referring_agency", prev.referring_agency, input.referring_agency.clone());
        log_field("approval_status", Some(prev.approval_status), Some(approval_status.clone()));
        log_field("denial_reason", prev.denial_reason, input.denial_reason.clone());
        log_field("gate_combo", prev.gate_combo, input.gate_combo.clone());
        log_field("notes", prev.notes, input.notes.clone());
        log_field("wood_size_label", prev.wood_size_label, input.wood_size_label.clone());
        log_field("wood_size_other", prev.wood_size_other, input.wood_size_other.clone());
        log_field("directions", prev.directions, input.directions.clone());
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_client(state: State<'_, AppState>, id: String) -> Result<(), String> {
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
pub async fn check_client_conflict(
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