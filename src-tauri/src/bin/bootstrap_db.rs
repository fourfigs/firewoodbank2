use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Determine database URL. We want it in the project root, which is one level up from src-tauri.
    // When running with `cargo run`, CWD is src-tauri.
    // Determine database URL. We want it in the project root, which is one level up from src-tauri.
    // When running with `cargo run`, CWD is src-tauri.
    let url = "sqlite://../firewoodbank.db";

    println!("Bootstrapping database at: {}", url);

    // Create connection options with create_if_missing
    let opts = SqliteConnectOptions::from_str(&url)?
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(opts)
        .await?;

    println!("Connected. Running migrations...");

    // sqlx::migrate! defaults to "migrations" relative to CARGO_MANIFEST_DIR (src-tauri).
    sqlx::migrate!().run(&pool).await?;

    println!("Migrations applied successfully!");
    Ok(())
}
