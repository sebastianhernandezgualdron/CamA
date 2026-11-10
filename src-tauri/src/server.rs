use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use axum_server::tls_rustls::RustlsConfig;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::net::{SocketAddr, TcpListener};
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};
use tauri::Emitter;

use crate::cert::generate_self_signed_cert;
use crate::network::{detect_all_lan_ips, detect_local_ip};

#[derive(Clone, Serialize, Deserialize)]
pub struct PairingInfo {
    pub local_ip: String,
    pub port: u16,
    pub session_id: String,
    pub url: String,
}

#[derive(Deserialize)]
pub struct WsQuery {
    pub session: Option<String>,
}

#[derive(Clone)]
pub struct ServerState {
    pub session_id: String,
    pub app_handle: tauri::AppHandle,
    pub active_clients: Arc<AtomicUsize>,
    pub broadcast_tx: tokio::sync::broadcast::Sender<String>,
}

async fn index_handler() -> Html<&'static str> {
    Html(include_str!("mobile/index.html"))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    State(state): State<ServerState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state, query.session))
}

async fn handle_socket(socket: WebSocket, state: ServerState, session: Option<String>) {
    if let Some(token) = session {
        if token != state.session_id {
            return;
        }
    }

    let (mut sender, mut receiver) = socket.split();
    let mut broadcast_rx = state.broadcast_tx.subscribe();

    state.active_clients.fetch_add(1, Ordering::SeqCst);
    let _ = state.app_handle.emit("device-connected", serde_json::json!({
        "status": "connected"
    }));

    let mut ping_interval = tokio::time::interval(tokio::time::Duration::from_secs(5));

    loop {
        tokio::select! {
            _ = ping_interval.tick() => {
                if sender.send(Message::Text(r#"{"type":"ping"}"#.into())).await.is_err() {
                    break;
                }
            }
            signal = broadcast_rx.recv() => {
                if let Ok(text) = signal {
                    if sender.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
            }
            msg = receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                            let _ = state.app_handle.emit("webrtc-signal", val);
                        }
                    }
                    Some(Ok(Message::Close(_))) | None | Some(Err(_)) => {
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    let prev = state.active_clients.fetch_sub(1, Ordering::SeqCst);
    if prev <= 1 {
        let _ = state.app_handle.emit("device-disconnected", serde_json::json!({
            "status": "disconnected"
        }));
    }
}

pub fn start_local_server(
    app_handle: tauri::AppHandle,
) -> Result<(PairingInfo, tokio::sync::broadcast::Sender<String>), Box<dyn std::error::Error + Send + Sync>> {
    let local_ip = detect_local_ip();
    let all_lan_ips = detect_all_lan_ips();
    let session_id = uuid::Uuid::new_v4().to_string();

    let listener = match TcpListener::bind("0.0.0.0:8080") {
        Ok(l) => l,
        Err(_) => TcpListener::bind("0.0.0.0:0")?,
    };
    let port = listener.local_addr()?.port();
    drop(listener);

    let (cert_pem, key_pem) = generate_self_signed_cert(local_ip, &all_lan_ips)?;

    let (broadcast_tx, _) = tokio::sync::broadcast::channel::<String>(128);

    let state = ServerState {
        session_id: session_id.clone(),
        app_handle,
        active_clients: Arc::new(AtomicUsize::new(0)),
        broadcast_tx: broadcast_tx.clone(),
    };

    let router = Router::new()
        .route("/", get(index_handler))
        .route("/ws", get(ws_handler))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    let pairing_url = format!("https://{}:{}/?session={}", local_ip, port, session_id);
    let pairing_info = PairingInfo {
        local_ip: local_ip.to_string(),
        port,
        session_id,
        url: pairing_url,
    };

    std::thread::spawn(move || {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => {
                eprintln!("Failed to create tokio runtime: {}", e);
                return;
            }
        };

        rt.block_on(async move {
            let tls_config = match RustlsConfig::from_pem(cert_pem, key_pem).await {
                Ok(cfg) => cfg,
                Err(e) => {
                    eprintln!("Failed to create TLS config: {}", e);
                    return;
                }
            };

            if let Err(e) = axum_server::bind_rustls(addr, tls_config)
                .serve(router.into_make_service())
                .await
            {
                eprintln!("Server error: {}", e);
            }
        });
    });

    Ok((pairing_info, broadcast_tx))
}
