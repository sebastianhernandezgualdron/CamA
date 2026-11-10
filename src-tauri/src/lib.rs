mod cert;
mod network;
mod server;
mod vcam;

use server::{start_local_server, PairingInfo};
use std::sync::Mutex;
use tauri::Manager;
use vcam::VirtualCameraManager;

pub struct ServerInfoState(pub Mutex<Option<PairingInfo>>);
pub struct SignalingState(pub Mutex<Option<tokio::sync::broadcast::Sender<String>>>);
pub struct VCamState(pub VirtualCameraManager);

#[tauri::command]
fn get_pairing_info(
    state: tauri::State<ServerInfoState>,
) -> Result<PairingInfo, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.clone().ok_or_else(|| "Server not initialized".to_string())
}

#[tauri::command]
fn send_webrtc_signal(
    signal: String,
    state: tauri::State<SignalingState>,
) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(tx) = guard.as_ref() {
        let _ = tx.send(signal);
        Ok(())
    } else {
        Err("Signaling channel not ready".to_string())
    }
}

#[tauri::command]
fn start_virtual_camera(
    width: u32,
    height: u32,
    state: tauri::State<VCamState>,
) -> Result<(), String> {
    state.0.start(width, height)
}

#[tauri::command]
fn stop_virtual_camera(
    state: tauri::State<VCamState>,
) -> Result<(), String> {
    state.0.stop()
}

#[tauri::command]
fn send_virtual_camera_frame(
    request: tauri::ipc::Request<'_>,
    state: tauri::State<VCamState>,
) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected raw binary body".into());
    };
    state.0.send_frame(bytes)
}

#[tauri::command]
fn is_virtual_camera_active(
    state: tauri::State<VCamState>,
) -> bool {
    state.0.is_active()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ServerInfoState(Mutex::new(None)))
        .manage(SignalingState(Mutex::new(None)))
        .manage(VCamState(VirtualCameraManager::new()))
        .setup(|app| {
            let handle = app.handle().clone();
            match start_local_server(handle) {
                Ok((info, tx)) => {
                    let server_state = app.state::<ServerInfoState>();
                    let mut guard = server_state.0.lock().map_err(|e| e.to_string())?;
                    *guard = Some(info);

                    let sig_state = app.state::<SignalingState>();
                    let mut sig_guard = sig_state.0.lock().map_err(|e| e.to_string())?;
                    *sig_guard = Some(tx);
                }
                Err(err) => {
                    eprintln!("Failed to start local server: {}", err);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_pairing_info,
            send_webrtc_signal,
            start_virtual_camera,
            stop_virtual_camera,
            send_virtual_camera_frame,
            is_virtual_camera_active
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
