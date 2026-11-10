import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Wifi, QrCode, Smartphone } from "lucide-react";
import { PairingInfo } from "../types/pairing";

interface WaitingScreenProps {
  pairingInfo: PairingInfo;
}

export function WaitingScreen({ pairingInfo }: WaitingScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pairingInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen px-6 py-8 select-none bg-[#0d0604] text-[#f7ede2]">
      <header className="w-full max-w-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#f77a1b] to-[#981d00] shadow-[0_0_20px_rgba(247,122,27,0.35)]">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#ffb581] to-[#f77a1b] bg-clip-text text-transparent">
              PhoneCam
            </h1>
            <p className="text-xs text-[#ffb581]/70 font-medium">Local Smartphone Webcam</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#180d09] border border-[#c74e00]/40 text-xs text-[#ffb581]">
          <Wifi className="w-3.5 h-3.5 text-[#f77a1b]" />
          <span>{pairingInfo.local_ip}:{pairingInfo.port}</span>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center my-auto w-full max-w-sm">
        <div className="relative p-6 rounded-3xl bg-[#140a07] border border-[#c74e00]/30 shadow-[0_12px_40px_rgba(90,11,0,0.45)] flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-white shadow-inner mb-6">
            <QRCodeSVG
              value={pairingInfo.url}
              size={200}
              level="M"
              fgColor="#0d0604"
              bgColor="#ffffff"
            />
          </div>

          <div className="flex items-center gap-2 mb-2 text-[#ffb581] font-semibold text-sm">
            <QrCode className="w-4 h-4 text-[#f77a1b]" />
            <span>Scan with your phone camera</span>
          </div>

          <p className="text-xs text-center text-[#ffb581]/60 max-w-[260px] leading-relaxed mb-5">
            Open your phone's camera app or browser to connect directly over local Wi-Fi.
          </p>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1d0e09] hover:bg-[#28130c] border border-[#c74e00]/40 transition text-xs font-medium text-[#ffb581]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">URL Copied to clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#f77a1b]" />
                <span className="truncate max-w-[210px]">{pairingInfo.url}</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2.5 mt-6 px-4 py-2 rounded-full bg-[#140a07] border border-[#981d00]/30 text-xs text-[#ffb581]/80">
          <div className="w-2 h-2 rounded-full bg-[#f77a1b] animate-ping" />
          <span>Waiting for phone connection...</span>
        </div>
      </main>

      <footer className="w-full max-w-md text-center text-[11px] text-[#ffb581]/40">
        Private & Local • No Accounts • No External Servers
      </footer>
    </div>
  );
}
