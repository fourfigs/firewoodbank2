use crate::{AppState, InvoiceRow};
use tauri::State;

// Invoice management commands

#[tauri::command]
pub async fn list_invoices(state: State<'_, AppState>) -> Result<Vec<InvoiceRow>, String> {
    // TODO: Extract invoice listing logic from main.rs
    Err("Not implemented yet".to_string())
}

#[tauri::command]
pub async fn create_invoice_from_work_order(
    state: State<'_, AppState>,
    work_order_id: String,
) -> Result<String, String> {
    // TODO: Extract invoice creation from work order logic from main.rs
    Err("Not implemented yet".to_string())
}