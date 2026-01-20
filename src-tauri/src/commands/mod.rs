// Command modules for organizing Tauri command handlers
pub mod users;
pub mod clients;
pub mod inventory;
pub mod work_orders;
pub mod invoices;
pub mod reports;

// Re-export command functions for use in main.rs
pub use users::*;
pub use clients::*;
pub use inventory::*;
pub use work_orders::*;
pub use invoices::*;
pub use reports::*;