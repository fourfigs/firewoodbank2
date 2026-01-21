use serde::Serialize;
use sqlx::SqlitePool;

#[derive(Debug, Serialize)]
pub struct SyncRecord {
    pub table_name: String,
    pub record_id: String,
    pub updated_at: Option<String>,
    pub last_synced_at: Option<String>,
    pub version: i64,
}

/// Placeholder sync service for future cloud sync implementation.
/// The pool and methods are retained for when sync functionality is added.
#[derive(Clone)]
#[allow(dead_code)]
pub struct SyncService {
    pool: SqlitePool,
}

impl SyncService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    #[allow(dead_code)]
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    // Placeholder for future sync implementation.
    // This is where get_pending_changes / mark_synced will live.
    pub async fn list_pending_changes(&self) -> Result<Vec<SyncRecord>, String> {
        Ok(vec![])
    }
}
