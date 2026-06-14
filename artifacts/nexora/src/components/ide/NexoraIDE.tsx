import { useRef, useEffect, useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { Copy, Download, Package, Info, Check, Sparkles, FileCode } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import UpgradeModal from "@/components/billing/UpgradeModal";

const WELCOME_CODE = `// ╔══════════════════════════════════════╗
// ║         Welcome to Nexora IDE        ║
// ║                                      ║
// ║  Complete Step 1 in the build plan   ║
// ║  and your first code will appear     ║
// ║  here automatically.                 ║
// ║                                      ║
// ║  Each step adds new code on top      ║
// ║  of the previous — building your     ║
// ║  complete project step by step.      ║
// ╚══════════════════════════════════════╝`;

export interface Library {
  name: string;
  installName: string;
  purpose: string;
  isNew: boolean;
}

interface NexoraIDEProps {
  code: string;
  filename?: string;
  platform?: string;
  highlightLines: number[];
  libraries: Library[];
  onCodeChange: (code: string) => void;
  onExplainCode?: (selected: string) => void;
  readOnly?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EditorInstance = any;

export default function NexoraIDE({
  code,
  filename = "main.ino",
  platform = "ESP32 · C++ Arduino",
  highlightLines,
  libraries,
  onCodeChange,
  onExplainCode,
  readOnly = false,
}: NexoraIDEProps) {
  const monaco = useMonaco();
  const editorRef = useRef<EditorInstance>(null);
  const decorationsRef = useRef<string[]>([]);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<"editor" | "libraries">("editor");
  const [copied, setCopied] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { isPro } = usePlan();

  const displayCode = code || WELCOME_CODE;
  const lineCount = displayCode.split("\n").length;
  const [explainTooltip, setExplainTooltip] = useState<{ top: number; left: number; text: string } | null>(null);

  // Define theme
  useEffect(() => {
    if (!monaco) return;
    monaco.editor.defineTheme("nexora-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "546E7A", fontStyle: "italic" },
        { token: "keyword", foreground: "C792EA" },
        { token: "string", foreground: "C3E88D" },
        { token: "number", foreground: "F78C6C" },
        { token: "type", foreground: "82AAFF" },
        { token: "identifier", foreground: "EEFFFF" },
        { token: "delimiter", foreground: "89DDFF" },
      ],
      colors: {
        "editor.background": "#0D0D14",
        "editor.foreground": "#E0E0FF",
        "editorLineNumber.foreground": "#3A3A5A",
        "editor.lineHighlightBackground": "rgba(108,99,255,0.06)",
        "editor.selectionBackground": "rgba(108,99,255,0.25)",
        "editorCursor.foreground": "#6C63FF",
        "editor.inactiveSelectionBackground": "#6C63FF20",
        "scrollbar.shadow": "#00000040",
        "editorGutter.background": "#0D0D14",
      },
    });
    monaco.editor.setTheme("nexora-dark");
  }, [monaco]);

  // Apply highlight decorations
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !monaco || !highlightLines.length) return;

    const newDecorations = highlightLines.map((line: number) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: { isWholeLine: true, className: "new-code-line" },
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    if (highlightLines.length > 0) {
      editor.revealLineInCenter(highlightLines[0]);
    }

    const timer = setTimeout(() => {
      if (editorRef.current) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [highlightLines, monaco]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!isPro) { setShowUpgrade(true); return; }
    const blob = new Blob([displayCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyInstallName = async (name: string) => {
    await navigator.clipboard.writeText(name);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#0A0A0F" }}>
      {/* ─── IDE Top Bar ─────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: 44, background: "#0D0D14", borderBottom: "1px solid #2A2A3E" }}
      >
        <div className="flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6C63FF" }} />
          <span className="text-xs font-mono font-medium" style={{ color: "#9090B0" }}>
            {filename}
          </span>
        </div>

        <span
          className="text-[11px] px-2 py-0.5 rounded"
          style={{ background: "#1A1A2E", color: "#9090B0", border: "1px solid #2A2A3E" }}
        >
          {platform}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "#3A3A5A" }}>{lineCount} lines</span>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
            style={{ background: "#1A1A2E", color: copied ? "#00C896" : "#9090B0", border: "1px solid #2A2A3E" }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
            style={{ background: "#1A1A2E", color: isPro ? "#9090B0" : "#5A5A7A", border: "1px solid #2A2A3E" }}
            title={isPro ? "Download code" : "Upgrade to Pro to download"}
          >
            <Download className="w-3 h-3" />
            {!isPro && <span className="text-[10px]" style={{ color: "#6C63FF" }}>Pro</span>}
          </button>
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────── */}
      <div className="flex flex-shrink-0 border-b" style={{ borderColor: "#2A2A3E" }}>
        {(["editor", "libraries"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab ? "#F0F0FF" : "#5A5A7A",
              borderBottom: activeTab === tab ? "2px solid #6C63FF" : "2px solid transparent",
              background: "transparent",
            }}
            onMouseEnter={(e) => { if (activeTab !== tab) e.currentTarget.style.color = "#9090B0"; }}
            onMouseLeave={(e) => { if (activeTab !== tab) e.currentTarget.style.color = "#5A5A7A"; }}
          >
            {tab === "editor" ? "Code Editor" : "Library Reference"}
            {tab === "libraries" && libraries.length > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "#6C63FF20", color: "#6C63FF" }}>
                {libraries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Content ──────────────────────────────── */}
      {activeTab === "editor" ? (
        <div className="flex-1 overflow-hidden relative" ref={editorContainerRef}>
          {explainTooltip && onExplainCode && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                const text = explainTooltip.text;
                setExplainTooltip(null);
                onExplainCode(`Explain this code to me in simple terms:\n\`\`\`cpp\n${text}\n\`\`\``);
              }}
              className="absolute z-50 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold shadow-lg transition-all"
              style={{
                top: explainTooltip.top,
                left: explainTooltip.left,
                background: "#6C63FF",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(108,99,255,0.4)",
                whiteSpace: "nowrap",
              }}
            >
              <Sparkles className="w-3 h-3" />
              Explain this
            </button>
          )}
          <Editor
            height="100%"
            language="cpp"
            theme="nexora-dark"
            value={displayCode}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.onDidChangeCursorSelection((e: { selection: { isEmpty(): boolean; startLineNumber: number } }) => {
                const selection = editor.getSelection();
                if (!selection || selection.isEmpty()) { setExplainTooltip(null); return; }
                const selectedText = editor.getModel()?.getValueInRange(selection) ?? "";
                if (!selectedText.trim() || selectedText.length < 5) { setExplainTooltip(null); return; }
                const scrolledVisiblePosition = editor.getScrolledVisiblePosition({ lineNumber: e.selection.startLineNumber, column: 1 });
                const container = editorContainerRef.current;
                if (scrolledVisiblePosition && container) {
                  setExplainTooltip({ top: Math.max(0, scrolledVisiblePosition.top - 36), left: 16, text: selectedText });
                }
              });
            }}
            onChange={(val) => {
              if (val !== undefined && val !== WELCOME_CODE) onCodeChange(val);
            }}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              lineNumbers: "on",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
              readOnly,
              padding: { top: 16, bottom: 16 },
              smoothScrolling: true,
              cursorBlinking: "smooth",
              renderLineHighlight: "all",
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="mb-2">
            <h3 className="font-semibold text-foreground">Libraries & Packages</h3>
            <p className="text-xs mt-0.5" style={{ color: "#5A5A7A" }}>Auto-managed for your project</p>
          </div>

          {libraries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: "#3A3A5A" }}>
              <Package className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Libraries will appear here as you complete build steps</p>
            </div>
          ) : (
            libraries.map((lib, i) => (
              <LibraryCard key={i} lib={lib} onCopy={copyInstallName} />
            ))
          )}

          <div className="rounded-xl p-4 flex gap-3 mt-4"
            style={{ background: "rgba(0,212,255,0.06)", border: "1px solid #00D4FF30" }}>
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00D4FF" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#9090B0" }}>
              Install in Arduino IDE via{" "}
              <strong style={{ color: "#F0F0FF" }}>Tools → Manage Libraries</strong>.
            </p>
          </div>
        </div>
      )}

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          featureName="Download Code"
          reason="Upgrade to Pro to download your project code"
        />
      )}
    </div>
  );
}

function LibraryCard({ lib, onCopy }: { lib: Library; onCopy: (name: string) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl p-4 border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
      <div className="flex items-start justify-between mb-1.5">
        <span className="font-semibold text-sm text-foreground">{lib.name}</span>
        {lib.isNew && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: "#6C63FF", color: "#fff" }}>
            NEW
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className="text-xs" style={{ color: "#5A5A7A" }}>Library Manager:</span>
        <code className="text-xs px-1.5 py-0.5 rounded font-mono"
          style={{ background: "#0A0A0F", color: "#00D4FF", border: "1px solid #2A2A3E" }}>
          {lib.installName}
        </code>
        <button
          onClick={() => { onCopy(lib.installName); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="text-xs transition-colors"
          style={{ color: copied ? "#00C896" : "#5A5A7A" }}
        >
          {copied ? "✓" : "Copy"}
        </button>
      </div>
      <p className="text-xs mt-1.5" style={{ color: "#7070A0" }}>{lib.purpose}</p>
    </div>
  );
}
