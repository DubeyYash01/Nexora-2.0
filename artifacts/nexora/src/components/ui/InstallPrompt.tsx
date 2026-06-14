import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1023px)");

  useEffect(() => {
    const dismissed = localStorage.getItem("nexora_install_dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!showPrompt || !installEvent || !isMobile) return null;

  const handleInstall = async () => {
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("nexora_install_dismissed", Date.now().toString());
  };

  return (
    <div
      className="fixed z-[90] left-0 right-0 mx-4"
      style={{
        bottom: "80px",
        background: "#12121A",
        border: "1px solid #6C63FF",
        borderRadius: "16px 16px 0 0",
        padding: "20px 16px",
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/5"
      >
        <X className="w-4 h-4" style={{ color: "#6A6A8A" }} />
      </button>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#6C63FF" }}>
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <div>
          <p className="font-bold text-foreground">Install Nexora</p>
          <p className="text-sm" style={{ color: "#9090B0" }}>Add to your home screen for quick access</p>
        </div>
      </div>
      <button
        onClick={handleInstall}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white mb-2"
        style={{ background: "#6C63FF" }}
      >
        <Download className="w-4 h-4" /> Install App
      </button>
      <button
        onClick={handleDismiss}
        className="w-full text-center text-sm py-1"
        style={{ color: "#5A5A7A" }}
      >
        Not now
      </button>
    </div>
  );
}
