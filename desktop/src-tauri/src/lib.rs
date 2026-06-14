use std::sync::Mutex;

use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct BackendState {
    child: Mutex<Option<CommandChild>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar = app
                .shell()
                .sidecar("ks-unify-backend")
                .expect("failed to create backend sidecar command");

            let (_rx, child) = sidecar
                .spawn()
                .expect("failed to start KS Unify backend sidecar");

            app.manage(BackendState {
                child: Mutex::new(Some(child)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
