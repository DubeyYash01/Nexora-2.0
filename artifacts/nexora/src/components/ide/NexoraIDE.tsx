import { useRef, useEffect, useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { Copy, Download, Package, Info, Check } from "lucide-react";

const WELCOME_CODE = `// ╔══════════════════════════════════╗
// ║     Welcome to Nexora IDE        ║
// ║                                  ║
// ║  Complete Step 1 to see your     ║
// ║  first code appear here          ║
// ║  automatically.                  ║
// ║                                  ║
// ║  Your code builds step by step.  ║
// ╚══════════════════════════════════╝`;

export interface Library {
  name: string;
  installName: string;
  purpose: string;
  isNew: boolean;
}

interface NexoraIDEProps {
  code: string;
  filename: string;
  platform: string;
  highlightLines: number[];
  libraries: Library[];
  onCodeChange: (code: string) => void;
}

// Use any for editor ref since monaco-editor types are only available at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EditorInstance = any;

export default function NexoraIDE({
  code,
  filename,
  platform,
  highlightLines,
  libraries,
  onCodeChange,
}: NexoraIDEProps) {
  const monaco = useMonaco();
  const editorRef = useRef<EditorInstance>(null);
  const decorationsRef = useRef<string[]>([]);
  const [activeTab, setActiveTab] = useState<"editor" | "libraries">("editor");
  const [copied, setCopied] = useState(false);
  const lineCount = code ? code.split("\n").length : WELCOME_CODE.split("\n").length;

  useEffect(() => {
    if (!monaco) return;
    monaco.editor.defineTheme("nexora-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "C792EA", fontStyle: "bold" },
        { token: "string", foreground: "C3E88D" },
        { token: "number", foreground: "F78C6C" },
        { token: "comment", foreground: "546E7A", fontStyle: "italic" },
        { token: "identifier", foreground: "EEFFFF" },
        { token: "type", foreground: "82AAFF" },
        { token: "delimiter", foreground: "89DDFF" },
      ],
      colors: {
        "editor.background": "#0D0D14",
        "editor.foreground": "#E0E0FF",
        "editorLineNumber.foreground": "#3A3A5A",
        "editor.lineHighlightBackground": "#1A1A2E",
        "editor.selectionBackground": "#6C63FF40",
        "editorCursor.foreground": "#6C63FF",
        "editor.inactiveSelectionBackground": "#6C63FF20",
        "scrollbar.shadow": "#00000040",
        "editorGutter.background": "#0D0D14",
      },
    });
    monaco.editor.setTheme("nexora-dark");
  }, [monaco]);

  // Apply highlight decorations when highlightLines changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !monaco || !highlightLines.length) return;

    const newDecorations = highlightLines.map((line: number) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "new-code-highlight",
      },
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    // Scroll to first new line
    if (highlightLines.length > 0) {
      editor.revealLineInCenter(highlightLines[0]);
    }

    // Fade to subtle highlight after 1.8s
    const timer = setTimeout(() => {
      if (!editorRef.current) return;
      const fadingDecorations = highlightLines.map((line: number) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "new-code-highlight-fading",
        },
      }));
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, fadingDecorations);

      const clearTimer = setTimeout(() => {
        if (editorRef.current) {
          decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        }
      }, 1800);
      return () => clearTimeout(clearTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, [highlightLines, monaco]);

  const handleCopy = async () => {
    const content = code || WELCOME_CODE;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const content = code || WELCOME_CODE;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "main.ino";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyInstallName = async (name: string) => {
    await navigator.clipboard.writeText(name);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#0A0A0F" }}>
      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "#2A2A3E" }}>
        {(["editor", "libraries"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-3 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab ? "#F0F0FF" : "#5A5A7A",
              borderBottom: activeTab === tab ? "2px solid #6C63FF" : "2px solid transparent",
              background: "transparent",
            }}
          >
            {tab === "editor" ? "Code Editor" : "Library Reference"}
            {tab === "libraries" && libraries.length > 0 && (
              <span
                className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "#6C63FF20", color: "#6C63FF" }}
              >
                {libraries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "editor" ? (
        <>
          {/* IDE top bar */}
          <div
            className="flex items-center justify-between px-4"
            style={{ height: 40, background: "#0D0D14", borderBottom: "1px solid #2A2A3E", flexShrink: 0 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "#5A5A7A" }}>📄</span>
              <span className="text-sm font-mono font-medium" style={{ color: "#F0F0FF" }}>
                {filename || "main.ino"}
              </span>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: "#1A1A2E", color: "#00D4FF", border: "1px solid #00D4FF20" }}
            >
              {platform || "ESP32 · C++ Arduino"}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors"
                style={{
                  background: "#1A1A2E",
                  color: copied ? "#00C896" : "#9090B0",
                  border: "1px solid #2A2A3E",
                }}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors"
                style={{ background: "#1A1A2E", color: "#9090B0", border: "1px solid #2A2A3E" }}
              >
                <Download className="w-3 h-3" />
                Download .ino
              </button>
              <span className="text-xs" style={{ color: "#3A3A5A" }}>
                {lineCount} lines
              </span>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="cpp"
              theme="nexora-dark"
              value={code || WELCOME_CODE}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              onChange={(val) => {
                if (val !== undefined && val !== WELCOME_CODE) onCodeChange(val);
              }}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: "on",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                readOnly: false,
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
              }}
            />
          </div>
        </>
      ) : (
        /* Library Reference Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Libraries & Packages</h3>
            <p className="text-xs mt-0.5" style={{ color: "#5A5A7A" }}>
              Auto-managed for your project
            </p>
          </div>

          {libraries.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ color: "#3A3A5A" }}
            >
              <Package className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Libraries will appear here as you complete steps</p>
            </div>
          ) : (
            libraries.map((lib, i) => (
              <LibraryCard key={i} lib={lib} onCopy={copyInstallName} />
            ))
          )}

          <div
            className="rounded-xl p-4 flex gap-3 mt-4"
            style={{
              background: "rgba(0,212,255,0.06)",
              border: "1px solid #00D4FF30",
            }}
          >
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00D4FF" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#9090B0" }}>
              These libraries are automatically tracked as you complete each step. Install them in Arduino
              IDE via <strong style={{ color: "#F0F0FF" }}>Tools → Manage Libraries</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function LibraryCard({
  lib,
  onCopy,
}: {
  lib: Library;
  onCopy: (name: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: "#12121A", borderColor: "#2A2A3E" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: lib.isNew ? "rgba(108,99,255,0.15)" : "rgba(90,90,122,0.15)" }}
        >
          <Package className="w-4 h-4" style={{ color: lib.isNew ? "#6C63FF" : "#5A5A7A" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{lib.name}</span>
            {lib.isNew && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                style={{ background: "#6C63FF", color: "#fff" }}
              >
                NEW
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs" style={{ color: "#5A5A7A" }}>
              Arduino Library Manager:
            </span>
            <code
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: "#0A0A0F", color: "#00D4FF", border: "1px solid #2A2A3E" }}
            >
              {lib.installName}
            </code>
            <button
              onClick={() => {
                onCopy(lib.installName);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="text-xs transition-colors"
              style={{ color: copied ? "#00C896" : "#5A5A7A" }}
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
          <p className="text-xs mt-1.5" style={{ color: "#7070A0" }}>
            {lib.purpose}
          </p>
        </div>
      </div>
    </div>
  );
}
