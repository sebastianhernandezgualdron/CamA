export interface PairingInfo {
  local_ip: string;
  port: number;
  session_id: string;
  url: string;
}

export type ConnectionState = "loading" | "waiting" | "connected" | "error";
