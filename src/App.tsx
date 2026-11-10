import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WaitingScreen } from "./components/WaitingScreen";
import { ConnectedScreen } from "./components/ConnectedScreen";
import { ConnectionState, PairingInfo } from "./types/pairing";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import "./App.css";

function App() {
  const [pairingInfo, setPairingInfo] = useState<PairingInfo | null>(null);
  const [state, setState] = useState<ConnectionState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  const fetchPairingInfo = async () => {
    try {
      setState("loading");
      setErrorMsg(null);
      const info = await invoke<PairingInfo>("get_pairing_info");
      setPairingInfo(info);
      setState("waiting");
    } catch (err) {
      setErrorMsg(typeof err === "string" ? err : "Failed to connect to local server");
      setState("error");
    }
  };

  const createPeerConnection = () => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        invoke("send_webrtc_signal", {
          signal: JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate
          })
        }).catch(() => {});
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const handleSignal = async (payload: any) => {
    try {
      const msg = typeof payload === "string" ? JSON.parse(payload) : payload;

      if (msg.type === "offer") {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(msg));

        while (candidateQueueRef.current.length > 0) {
          const cand = candidateQueueRef.current.shift();
          if (cand) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await invoke("send_webrtc_signal", {
          signal: JSON.stringify({
            type: "answer",
            sdp: answer.sdp
          })
        });
      } else if (msg.type === "ice-candidate" && msg.candidate) {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
        } else {
          candidateQueueRef.current.push(msg.candidate);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchPairingInfo();

    let unlistenConnected: (() => void) | undefined;
    let unlistenDisconnected: (() => void) | undefined;
    let unlistenSignal: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenConnected = await listen("device-connected", () => {
        setState("connected");
      });

      unlistenDisconnected = await listen("device-disconnected", () => {
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        setRemoteStream(null);
        setState("waiting");
      });

      unlistenSignal = await listen("webrtc-signal", (event) => {
        handleSignal(event.payload);
      });
    };

    setupListeners();

    return () => {
      if (unlistenConnected) unlistenConnected();
      if (unlistenDisconnected) unlistenDisconnected();
      if (unlistenSignal) unlistenSignal();
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, []);

  const handleDisconnect = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    setState("waiting");
  };

  if (state === "loading" || !pairingInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d0604] text-[#ffb581]">
        <Loader2 className="w-10 h-10 animate-spin text-[#f77a1b] mb-4" />
        <p className="text-sm font-medium tracking-wide">Starting PhoneCam local server...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-[#0d0604] text-[#f7ede2]">
        <div className="p-8 rounded-3xl bg-[#140a07] border border-[#981d00]/50 max-w-sm w-full flex flex-col items-center text-center shadow-[0_12px_40px_rgba(90,11,0,0.5)]">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#1d0e09] border border-[#981d00] mb-4">
            <AlertCircle className="w-6 h-6 text-[#f77a1b]" />
          </div>
          <h2 className="text-lg font-bold text-[#ffb581] mb-2">Connection Error</h2>
          <p className="text-xs text-[#ffb581]/70 leading-relaxed mb-6">
            {errorMsg || "Could not initialize local network server."}
          </p>
          <button
            onClick={fetchPairingInfo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f77a1b] to-[#c74e00] hover:from-[#ffb581] hover:to-[#f77a1b] text-[#0d0604] font-semibold text-xs shadow-md transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (state === "connected") {
    return (
      <ConnectedScreen
        pairingInfo={pairingInfo}
        stream={remoteStream}
        onDisconnect={handleDisconnect}
      />
    );
  }

  return <WaitingScreen pairingInfo={pairingInfo} />;
}

export default App;
