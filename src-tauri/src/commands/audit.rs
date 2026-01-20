use sqlx::SqlitePool;

// Audit logging functions shared across command modules

pub async fn audit_db(pool: &SqlitePool, event: &str, role: &str, actor: &str) {
    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs (
            id, event, role, actor,
            entity, entity_id, field, old_value, new_value,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(event)
    .bind(role)
    .bind(actor)
    .bind::<Option<String>>(None)
    .bind::<Option<String>>(None)
    .bind::<Option<String>>(None)
    .bind::<Option<String>>(None)
    .bind::<Option<String>>(None)
    .execute(pool)
    .await;
}

pub async fn audit_change(
    pool: &SqlitePool,
    event: &str,
    role: &str,
    actor: &str,
    entity: &str,
    entity_id: &str,
    field: &str,
    old_value: Option<String>,
    new_value: Option<String>,
) {
    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs (
            id, event, role, actor,
            entity, entity_id, field, old_value, new_value,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(event)
    .bind(role)
    .bind(actor)
    .bind(entity)
    .bind(entity_id)
    .bind(field)
    .bind(old_value)
    .bind(new_value)
    .execute(pool)
    .await;
}