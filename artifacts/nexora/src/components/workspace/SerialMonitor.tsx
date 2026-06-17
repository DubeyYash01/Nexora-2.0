import { useState, useRef, useCallback, useEffect } from "react";
import { Usb, Trash2, Download, Send, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SerialLine {
  text: string;
  timestamp: string;
  isError: boolean;
}

const BAUD_RATES = [9600, 57600, 115200, 250000];

declare global {
  interface Navigator {
    serial?: {
      requestPort: () => Promise<SerialPortLike>;
    };
  }
}

interface SerialPortLike {
  open: (opts: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

export default function SerialMonitor() {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [lines, setLines] = useState<SerialLine[]>([]);
  const [input, setInput] = useState("");
  const [baudRate, setBaudRate] = useState(115200);
  const [showBaudMenu, setShowBaudMenu] = useState(false);
  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const addLine = useCallback((text: string) => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const isError = /error|exception|fail/i.test(text);
    setLines((prev) => [...prev.slice(-500), { text: text.trimEnd(), timestamp: ts, isError }]);
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const startReading = useCallback(async (port: SerialPortLike) => {
    if (!port.readable) return;
    const reader = port.readable.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    readerRef.current = reader;
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lineBreak = buffer.lastIndexOf("\n");
        if (lineBreak !== -1) {
          const complete = buffer.slice(0, lineBreak);
          buffer = buffer.slice(lineBreak + 1);
          for (const line of complete.split("\n")) {
            if (line.trim()) addLine(line);
          }
        }
      }
    } catch {
      setConnected(false);
    } finally {
      reader.releaseLock();
    }
  }, [addLine]);

  const handleConnect = async () => {
    if (!("serial" in navigator) || !navigator.serial) {
      toast({
        title: "Chrome required",
        description: "Serial Monitor requires Chrome or Edge browser with Web Serial API support.",
        variant: "destructive",
      });
      return;
    }
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate });
      portRef.current = port;
      setConnected(true);
      addLine(`[Connected @ ${baudRate} baud]`);
      startReading(port);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "NotFoundError") {
        toast({ title: "Connection failed", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleDisconnect = async () => {
    try {
      readerRef.current?.cancel();
      await portRef.current?.close();
    } catch { /* ignore */ }
    portRef.current = null;
    readerRef.current = null;
    setConnected(false);
    addLine("[Disconnected]");
  };

  const handleSend = async () => {
    if (!connected || !portRef.current?.writable || !input.trim()) return;
    const writer = portRef.current.writable.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(input + "\n"));
    writer.releaseLock();
    addLine(`> ${input}`);
    setInput("");
  };

  const handleClear = () => setLines([]);

  const handleSaveLog = () => {
    const text = lines.map((l) => `[${l.timestamp}] ${l.text}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `serial-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid #2A2A3E", background: "#0D0D14" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: connected ? "#00C896" : "#3A3A5A" }}
            />
            <span className="text-xs font-medium" style={{ color: connected ? "#00C896" : "#5A5A7A" }}>
              {connected ? "Device connected" : "No device"}
            </span>
          </div>

          {/* Baud rate selector */}
          <div className="relative">
            <button
              onClick={() => setShowBaudMenu((v) => !v)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{ background: "#1A1A2E", color: "#9090B0", border: "1px solid #2A2A3E" }}
            >
              {baudRate}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showBaudMenu && (
              <div
                className="absolute top-full mt-1 left-0 z-50 rounded-lg overflow-hidden shadow-xl"
                style={{ background: "#12121A", border: "1px solid #2A2A3E", minWidth: 90 }}
              >
                {BAUD_RATES.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => { setBaudRate(rate); setShowBaudMenu(false); }}
                    className="w-full text-left text-xs px-3 py-2 transition-colors"
                    style={{
                      color: baudRate === rate ? "#6C63FF" : "#C0C0D0",
                      background: baudRate === rate ? "rgba(108,99,255,0.1)" : "transparent",
                    }}
                  >
                    {rate}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connected ? (
            <button
              onClick={handleDisconnect}
              className="text-xs px-3 py-1 rounded transition-colors"
              style={{ background: "rgba(255,90,90,0.1)", color: "#FF5A5A", border: "1px solid rgba(255,90,90,0.3)" }}
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-1.5 text-xs px-3 py-1 rounded transition-colors"
              style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF", border: "1px solid rgba(108,99,255,0.3)" }}
            >
              <Usb className="w-3 h-3" /> Connect Device
            </button>
          )}
          <button onClick={handleClear} title="Clear" className="p-1.5 rounded transition-colors" style={{ color: "#5A5A7A" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0FF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5A5A7A")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleSaveLog} title="Save log" className="p-1.5 rounded transition-colors" style={{ color: "#5A5A7A" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0FF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5A5A7A")}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs"
        style={{ background: "#0D0D14", minHeight: 0 }}
      >
        {lines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2" style={{ color: "#3A3A5A" }}>
            <Usb className="w-8 h-8 opacity-30" />
            <p className="text-xs">Connect your device to see serial output</p>
            {!("serial" in navigator) && (
              <p className="text-xs mt-1" style={{ color: "#FF5A5A" }}>
                ⚠ Web Serial requires Chrome or Edge browser
              </p>
            )}
          </div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-2 leading-5">
              <span style={{ color: "#3A3A5A", flexShrink: 0 }}>[{line.timestamp}]</span>
              <span style={{ color: line.isError ? "#FF5A5A" : "#00C896", wordBreak: "break-all" }}>
                {line.text}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Send input */}
      <div
        className="flex gap-2 px-3 py-2 flex-shrink-0"
        style={{ borderTop: "1px solid #2A2A3E", background: "#0D0D14" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={connected ? "Send command..." : "Connect device first"}
          disabled={!connected}
          className="flex-1 text-xs px-3 py-1.5 rounded font-mono outline-none"
          style={{
            background: "#12121A",
            color: "#F0F0FF",
            border: "1px solid #2A2A3E",
            opacity: connected ? 1 : 0.5,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!connected || !input.trim()}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors"
          style={{
            background: connected && input.trim() ? "#6C63FF" : "#1A1A2E",
            color: connected && input.trim() ? "#fff" : "#3A3A5A",
          }}
        >
          <Send className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
