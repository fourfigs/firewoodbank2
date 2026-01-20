use crate::{AppState, LoginInput, LoginResponse, ChangePasswordInput, EnsureUserInput, UserRow};
use tauri::State;
use bcrypt::{verify, hash, DEFAULT_COST};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ResetPasswordInput {
    user_id: String,
    new_password: String,
}

// User authentication and management commands

#[tauri::command]
pub async fn login_user(state: State<'_, AppState>, input: LoginInput) -> Result<LoginResponse, String> {
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
        "#,
        username
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let row = row.ok_or_else(|| "Invalid username or password".to_string())?;
    if !verify(&password, &row.password).map_err(|e| e.to_string())? {
        return Err("Invalid username or password".to_string());
    }

    // TODO: Extract audit_db function call
    // audit_db(&state.pool, "login_user", &row.role, &row.username).await;
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
pub async fn change_password(state: State<'_, AppState>, input: ChangePasswordInput) -> Result<(), String> {
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
    .fetch_optional(&state.pool)
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
          AND is_deleted = 0
        "#,
    )
    .bind(&hashed)
    .bind(&row.id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn reset_password(state: State<'_, AppState>, input: ResetPasswordInput, role: Option<String>) -> Result<(), String> {
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
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_user(state: State<'_, AppState>, input: serde_json::Value, role: Option<String>) -> Result<String, String> {
    // TODO: Implement full user creation logic
    // For now, return not implemented
    Err("User creation not yet implemented".to_string())
}

#[tauri::command]
pub async fn list_users(state: State<'_, AppState>) -> Result<Vec<UserRow>, String> {
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

    Ok(rows)
}

#[tauri::command]
pub async fn ensure_user_exists(state: State<'_, AppState>, input: EnsureUserInput) -> Result<String, String> {
    // TODO: Implement user existence check logic
    Err("User existence check not yet implemented".to_string())
}

#[tauri::command]
pub async fn update_user_flags(state: State<'_, AppState>, input: serde_json::Value) -> Result<(), String> {
    // TODO: Implement user flags update logic
    Err("User flags update not yet implemented".to_string())
}

#[tauri::command]
pub async fn get_available_drivers(state: State<'_, AppState>, date: String) -> Result<Vec<UserRow>, String> {
    // TODO: Implement available drivers logic
    Err("Available drivers not yet implemented".to_string())
}