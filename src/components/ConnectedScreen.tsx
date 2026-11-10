import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Disc, Power, Sparkles, Smartphone, Loader2, Video, CheckCircle2 } from "lucide-react";
import { PairingInfo } from "../types/pairing";

interface ConnectedScreenProps {
  pairingInfo: PairingInfo;
  stream: MediaStream | null;
  onDisconnect?: () => void;
}

export function ConnectedScreen({ pairingInfo, stream, onDisconnect }: ConnectedScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolution, setResolution] = useState("1080p");
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isVirtualCamActive, setIsVirtualCamActive] = useState(false);
  const [isStartingCam, setIsStartingCam] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      if (width && height) {
        setResolution(`${width}x${height}`);
        setIsVideoActive(true);
      }
    }
  };

  const toggleVirtualCamera = async () => {
    if (isVirtualCamActive) {
      try {
        await invoke("stop_virtual_camera");
      } catch (_) {}
      setIsVirtualCamActive(false);
    } else {
      setIsStartingCam(true);
      try {
        const video = videoRef.current;
        const w = ((video?.videoWidth || 1280) & ~1) || 1280;
        const h = ((video?.videoHeight || 720) & ~1) || 720;
        await invoke("start_virtual_camera", { width: w, height: h });
        setIsVirtualCamActive(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsStartingCam(false);
      }
    }
  };

  useEffect(() => {
    if (!isVirtualCamActive) return;

    let isCancelled = false;
    let isSending = false;
    let animId = 0;
    let rvfcId = 0;
    let reusableBuffer: Uint8Array | null = null;

    const track = stream?.getVideoTracks()[0];
    const video = videoRef.current;
    const targetWidth = ((video?.videoWidth || 1280) & ~1) || 1280;
    const targetHeight = ((video?.videoHeight || 720) & ~1) || 720;
    const expectedNv12Size = (targetWidth * targetHeight * 3) / 2;

    if (track && "MediaStreamTrackProcessor" in window) {
      try {
        const processor = new (window as any).MediaStreamTrackProcessor({ track });
        const reader = processor.readable.getReader();

        const processTrackFrames = async () => {
          while (!isCancelled) {
            let res;
            try {
              res = await reader.read();
            } catch (_) {
              break;
            }
            const { value: frame, done } = res;
            if (done || !frame) break;

            if (isSending) {
              frame.close();
              continue;
            }

            try {
              if (!reusableBuffer || reusableBuffer.byteLength !== expectedNv12Size) {
                reusableBuffer = new Uint8Array(expectedNv12Size);
              }

              const rect = {
                x: 0,
                y: 0,
                width: targetWidth,
                height: targetHeight,
              };

              await frame.copyTo(reusableBuffer, { format: "NV12", rect });
              frame.close();

              isSending = true;
              invoke("send_virtual_camera_frame", reusableBuffer)
                .catch(() => {})
                .finally(() => {
                  isSending = false;
                });
            } catch (_) {
              isSending = false;
              frame.close();
            }
          }
        };

        processTrackFrames();

        return () => {
          isCancelled = true;
          reader.cancel().catch(() => {});
        };
      } catch (_) {}
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const pumpCanvas = () => {
      if (isCancelled) return;

      const v = videoRef.current;
      if (v && v.readyState >= 2 && !isSending) {
        isSending = true;
        try {
          ctx.drawImage(v, 0, 0, targetWidth, targetHeight);
          const img = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const rawBytes = new Uint8Array(img.data.buffer);
          invoke("send_virtual_camera_frame", rawBytes)
            .catch(() => {})
            .finally(() => {
              isSending = false;
            });
        } catch (_) {
          isSending = false;
        }
      }

      if (!isCancelled && v) {
        if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
          rvfcId = (v as any).requestVideoFrameCallback(pumpCanvas);
        } else {
          animId = requestAnimationFrame(pumpCanvas);
        }
      }
    };

    if (video) {
      if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
        rvfcId = (video as any).requestVideoFrameCallback(pumpCanvas);
      } else {
        animId = requestAnimationFrame(pumpCanvas);
      }
    }

    return () => {
      isCancelled = true;
      if (video && rvfcId && "cancelVideoFrameCallback" in HTMLVideoElement.prototype) {
        (video as any).cancelVideoFrameCallback(rvfcId);
      }
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [isVirtualCamActive, stream]);

  const handleDisconnectClick = () => {
    if (isVirtualCamActive) {
      invoke("stop_virtual_camera").catch(() => {});
      setIsVirtualCamActive(false);
    }
    if (onDisconnect) {
      onDisconnect();
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen px-6 py-6 select-none bg-[#0d0604] text-[#f7ede2]">
      <header className="w-full max-w-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#f77a1b] to-[#981d00] shadow-[0_0_15px_rgba(247,122,27,0.3)]">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-[#ffb581] to-[#f77a1b] bg-clip-text text-transparent">
              PhoneCam
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#180d09] border border-emerald-500/40 text-xs text-emerald-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="font-semibold">Connected</span>
        </div>
      </header>

      <main className="w-full max-w-xl flex flex-col items-center my-auto">
        <div className="relative w-full aspect-video rounded-3xl bg-[#140a07] border border-[#c74e00]/40 overflow-hidden shadow-[0_16px_50px_rgba(90,11,0,0.5)] flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={handleLoadedMetadata}
            onPlaying={() => setIsVideoActive(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoActive ? "opacity-100" : "opacity-0"}`}
          />

          {!isVideoActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#140a07]">
              <Loader2 className="w-8 h-8 animate-spin text-[#f77a1b]" />
              <p className="text-sm font-medium text-[#ffb581]">Negotiating video stream...</p>
              <span className="text-xs text-[#ffb581]/50">{pairingInfo.local_ip}</span>
            </div>
          )}

          <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0d0604]/80 backdrop-blur-md border border-[#c74e00]/30 text-[11px] text-[#ffb581]">
            <Disc className="w-3 h-3 text-[#f77a1b] animate-spin" />
            <span>LIVE</span>
          </div>

          {isVirtualCamActive && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-md bg-[#0d0604]/85 backdrop-blur-md border border-emerald-500/40 text-[11px] text-emerald-400 shadow-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>OBS / Discord Virtual Cam Active</span>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-[#ffb581]/80 px-3 py-2 rounded-xl bg-[#0d0604]/85 backdrop-blur-md border border-[#c74e00]/30">
            <div className="flex items-center gap-4">
              <span>Resolution: <strong className="text-white">{resolution}</strong></span>
              <span>FPS: <strong className="text-white">30</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[#ffb581]/70">
              <Sparkles className="w-3.5 h-3.5 text-[#f77a1b]" />
              <span>Direct LAN Stream</span>
            </div>
          </div>
        </div>

        <div className="w-full flex items-center justify-center gap-3 mt-6">
          <button
            onClick={toggleVirtualCamera}
            disabled={isStartingCam}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition cursor-pointer border ${
              isVirtualCamActive
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900"
                : "bg-gradient-to-r from-[#f77a1b] to-[#c74e00] hover:from-[#ffb581] hover:to-[#f77a1b] text-[#0d0604] border-[#f77a1b]/40"
            }`}
          >
            {isStartingCam ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Video className="w-3.5 h-3.5" />
            )}
            <span>
              {isVirtualCamActive
                ? "Stop Virtual Camera"
                : "Start Virtual Camera (OBS / Zoom)"}
            </span>
          </button>

          <button
            onClick={handleDisconnectClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#981d00] to-[#5a0b00] hover:from-[#c74e00] hover:to-[#981d00] border border-[#c74e00]/40 text-white font-medium text-xs shadow-[0_4px_16px_rgba(152,29,0,0.4)] transition cursor-pointer"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </main>

      <footer className="w-full max-w-xl text-center text-[11px] text-[#ffb581]/40">
        DirectShow & Media Foundation Virtual Camera • No Cloud Servers
      </footer>
    </div>
  );
}
