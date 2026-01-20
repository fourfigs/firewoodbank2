use crate::{AppState, LoginInput, LoginResponse, ChangePasswordInput, EnsureUserInput, UserRow};
use tauri::State;
use bcrypt::{verify, hash, DEFAULT_COST};
use serde::Deserialize;
use uuid;

// Generate a unique username from first and last name
async fn generate_unique_username(pool: &sqlx::SqlitePool, first_name: &str, last_name: &str) -> Result<String, String> {
    let first_initial = first_name.chars().next().unwrap_or(' ').to_lowercase().to_string();
    let last_name_clean = last_name.to_lowercase().replace(" ", "").replace("-", "");

    let base_username = format!("{}{}", first_initial, last_name_clean);

    // Check if base username exists
    let existing_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM auth_users WHERE username LIKE ? AND is_deleted = 0"
    )
    .bind(format!("{}%", base_username))
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    if existing_count.0 == 0 {
        return Ok(base_username);
    }

    // Find the next available number
    for i in 1..100 {  // Reasonable limit to prevent infinite loops
        let candidate = format!("{}{}", base_username, i);
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM auth_users WHERE username = ? AND is_deleted = 0"
        )
        .bind(&candidate)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

        if count.0 == 0 {
            return Ok(candidate);
        }
    }

    Err("Could not generate unique username".to_string())
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordInput {
    user_id: String,
    new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserInput {
    pub name: String,
    pub email: String,
    pub telephone: String,
    pub username: Option<String>, // Optional - will auto-generate if not provided
    pub password: String,
    pub physical_address_line1: String,
    pub physical_address_line2: String,
    pub physical_address_city: String,
    pub physical_address_state: String,
    pub physical_address_postal_code: String,
    pub mailing_address_line1: String,
    pub mailing_address_line2: String,
    pub mailing_address_city: String,
    pub mailing_address_state: String,
    pub mailing_address_postal_code: String,
    pub role: String,
    pub is_driver: bool,
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
pub async fn create_user(state: State<'_, AppState>, input: CreateUserInput, role: Option<String>) -> Result<String, String> {
    let role_val = role.unwrap_or_else(|| "admin".to_string()).to_lowercase();
    if role_val != "admin" && role_val != "lead" {
        return Err("Only admins or leads can create users".to_string());
    }

    // Parse name to generate username if not provided
    let name_parts: Vec<&str> = input.name.split_whitespace().collect();
    if name_parts.len() < 2 {
        return Err("Full name (first and last) is required".to_string());
    }

    let first_name = name_parts[0];
    let last_name = name_parts[name_parts.len() - 1];

    // Generate unique username
    let username = if let Some(provided_username) = &input.username {
        provided_username.clone()
    } else {
        generate_unique_username(&state.pool, first_name, last_name).await?
    };

    // Validate inputs
    let password = input.password.trim().to_string();
    if password.is_empty() {
        return Err("Password is required".to_string());
    }

    // Check if username already exists
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
        return Err(format!("Username '{}' already exists", username));
    }

    // Hash password
    let hashed_password = hash(&password, DEFAULT_COST).map_err(|e| e.to_string())?;

    // Start transaction
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;

    // Create user record
    let user_id = sqlx::query(
        r#"
        INSERT INTO users (
            id, name, email, telephone,
            physical_address_line1, physical_address_line2, physical_address_city, physical_address_state, physical_address_postal_code,
            mailing_address_line1, mailing_address_line2, mailing_address_city, mailing_address_state, mailing_address_postal_code,
            role, is_driver, hipaa_certified, created_at, updated_at, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'), 0)
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&input.name)
    .bind(input.email.as_str())
    .bind(input.telephone.as_str())
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
    .bind(input.is_driver)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let user_id_str = user_id.last_insert_rowid().to_string();

    // Create auth record
    sqlx::query(
        r#"
        INSERT INTO auth_users (
            id, user_id, username, password, created_at, updated_at, is_deleted
        ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 0)
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&user_id_str)
    .bind(&username)
    .bind(&hashed_password)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Commit transaction
    tx.commit().await.map_err(|e| e.to_string())?;

    // TODO: Add audit logging
    // audit_db(&state.pool, "create_user", &role_val, &input.name).await;

    Ok(user_id_str)
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