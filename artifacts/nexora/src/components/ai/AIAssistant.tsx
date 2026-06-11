import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Sparkles, ChevronDown, ChevronUp, Trash2, Send, Copy,
  Paperclip, AlertTriangle, X, ThumbsUp, ThumbsDown, Mic,
  Check, Loader2
} from "lucide-react";
import { authFetch } from "@/lib/supabase";
import { buildProjectContext, PHASE_CHIPS, DEFAULT_CHIPS } from "@/lib/aiContext";

/* ── Types ─────────────────────────────────────────────── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  context?: { messageType?: string; stepNumber?: number; phase?: string };
}

interface Project {
  id: string;
  title: string;
  ai_analysis: {
    projectSummary?: string;
    skillLevel?: string;
    components?: Array<{ name: string; purpose: string }>;
  } | null;
  build_plan: {
    buildPlan: {
      platform: string;
      programmingLanguage: string;
      totalSteps: number;
      steps: Array<{
        stepNumber: number;
        title: string;
        phase: string;
        objective: string;
        instructions: string[];
      }>;
    };
  } | null;
  components: { list?: Array<{ name: string; purpose: string }> } | null;
}

interface AIAssistantProps {
  project: Project;
  currentStep: number;
  ideCode: string;
  libraryNames: string[];
  completedSteps: number[];
  userName?: string;
  onPushCode: (code: string, mode: "replace" | "insert") => void;
  externalMessage?: string;
  onExternalMessageHandled: () => void;
}

/* ── Heights ─────────────────────────────────────────── */
const HEIGHTS = { collapsed: 48, normal: 260, expanded: 480 };
type PanelSize = "collapsed" | "normal" | "expanded";

/* ── Phase input placeholder ─────────────────────────── */
const PHASE_PLACEHOLDER: Record<string, string> = {
  Setup: "Ask about setup or preparation...",
  Wiring: "Describe your wiring question...",
  Coding: "Ask about the code or logic...",
  Testing: "Describe what's not working...",
};

/* ── Typing indicator ────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: "#6C63FF",
            animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

/* ── Code block inside assistant message ──────────────── */
function CodeBlock({
  code,
  language,
  onPush,
}: {
  code: string;
  language: string;
  onPush: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isArduino = language === "cpp" || language === "arduino" || language === "c";

  return (
    <div className="relative mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid #2A2A3E" }}>
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ background: "#0D0D14", borderBottom: "1px solid #2A2A3E" }}
      >
        <span className="text-xs font-mono" style={{ color: "#5A5A7A" }}>
          {language || "code"}
        </span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: copied ? "#00C896" : "#5A5A7A" }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "cpp"}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          background: "#0D0D14",
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          padding: "12px 16px",
        }}
      >
        {code}
      </SyntaxHighlighter>
      {isArduino && (
        <button
          onClick={() => onPush(code)}
          className="w-full text-xs py-2 font-medium transition-colors"
          style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF", borderTop: "1px solid #2A2A3E" }}
        >
          ⬆ Push to IDE
        </button>
      )}
    </div>
  );
}

/* ── Message bubble ──────────────────────────────────── */
function MessageBubble({
  msg,
  onFeedback,
  onPushCode,
}: {
  msg: Message;
  onFeedback: (msgId: string, feedback: "helpful" | "not_helpful") => void;
  onPushCode: (code: string) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const [copied, setCopied] = useState(false);

  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="text-sm px-3 py-2.5 max-w-[80%]"
          style={{
            background: "#6C63FF",
            color: "#fff",
            borderRadius: "12px 12px 2px 12px",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-3"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="text-sm px-4 py-3 max-w-[85%] leading-relaxed"
        style={{
          background: "#1A1A2E",
          border: "1px solid #2A2A3E",
          borderRadius: "12px 12px 12px 2px",
        }}
      >
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className ?? "");
              const inline = !match;
              if (inline) {
                return (
                  <code
                    style={{
                      background: "#1A1A2E",
                      color: "#00D4FF",
                      borderRadius: 4,
                      padding: "2px 6px",
                      fontSize: "0.85em",
                      fontFamily: "'JetBrains Mono', monospace",
                      border: "1px solid #2A2A3E",
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <CodeBlock
                  code={String(children).replace(/\n$/, "")}
                  language={match[1]}
                  onPush={onPushCode}
                />
              );
            },
            p({ children }) {
              return <p style={{ marginBottom: "0.5em", color: "#F0F0FF" }}>{children}</p>;
            },
            strong({ children }) {
              return <strong style={{ color: "#F0F0FF", fontWeight: 700 }}>{children}</strong>;
            },
            em({ children }) {
              return <em style={{ color: "#C0C0D8" }}>{children}</em>;
            },
            ul({ children }) {
              return <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.5em", color: "#D0D0E8" }}>{children}</ul>;
            },
            ol({ children }) {
              return <ol style={{ paddingLeft: "1.25rem", marginBottom: "0.5em", color: "#D0D0E8" }}>{children}</ol>;
            },
            li({ children }) {
              return <li style={{ marginBottom: "0.2em" }}>{children}</li>;
            },
            h1({ children }) {
              return <h1 style={{ fontSize: "1.1em", fontWeight: 700, color: "#F0F0FF", marginBottom: "0.4em" }}>{children}</h1>;
            },
            h2({ children }) {
              return <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#F0F0FF", marginBottom: "0.4em" }}>{children}</h2>;
            },
            h3({ children }) {
              return <h3 style={{ fontSize: "1em", fontWeight: 600, color: "#F0F0FF", marginBottom: "0.3em" }}>{children}</h3>;
            },
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>

      {/* Actions row */}
      <div
        className="flex items-center gap-3 mt-1 ml-1 transition-opacity duration-150"
        style={{ opacity: hovering ? 1 : 0 }}
      >
        <button
          onClick={() => { setFeedback("helpful"); onFeedback(msg.id, "helpful"); }}
          className="text-xs transition-colors"
          style={{ color: feedback === "helpful" ? "#00C896" : "#5A5A7A" }}
        >
          <ThumbsUp className="w-3 h-3 inline mr-0.5" /> helpful
        </button>
        <button
          onClick={() => { setFeedback("not_helpful"); onFeedback(msg.id, "not_helpful"); }}
          className="text-xs transition-colors"
          style={{ color: feedback === "not_helpful" ? "#FF5A5A" : "#5A5A7A" }}
        >
          <ThumbsDown className="w-3 h-3 inline mr-0.5" /> not helpful
        </button>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(msg.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="text-xs transition-colors"
          style={{ color: copied ? "#00C896" : "#5A5A7A" }}
        >
          <Copy className="w-3 h-3 inline mr-0.5" /> {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
  );
}

/* ── Error Debugger Modal ────────────────────────────── */
function ErrorDebuggerModal({
  onClose,
  onSubmit,
  stepTitle,
  platform,
}: {
  onClose: () => void;
  onSubmit: (error: string, includeCode: boolean) => void;
  stepTitle: string;
  platform: string;
}) {
  const [errorText, setErrorText] = useState("");
  const [includeCode, setIncludeCode] = useState(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-xl"
        style={{ background: "#12121A", border: "1px solid #2A2A3E" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: "#FFB84D" }} />
            <h3 className="font-bold text-foreground">Debug an Error</h3>
          </div>
          <button onClick={onClose} style={{ color: "#5A5A7A" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block text-xs font-semibold mb-2" style={{ color: "#9090B0" }}>
          Paste your error message:
        </label>
        <textarea
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
          rows={5}
          placeholder="Paste the error from Arduino IDE Serial Monitor here..."
          className="w-full rounded-lg p-3 text-sm font-mono outline-none resize-none mb-4"
          style={{
            background: "#0D0D14",
            border: "1px solid #2A2A3E",
            color: "#F0F0FF",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />

        <div className="mb-4 p-3 rounded-lg" style={{ background: "#0A0A0F", border: "1px solid #2A2A3E" }}>
          <p className="text-xs mb-2" style={{ color: "#5A5A7A" }}>Context (auto-filled):</p>
          <p className="text-xs mb-1" style={{ color: "#9090B0" }}>Current step: <span style={{ color: "#F0F0FF" }}>{stepTitle}</span></p>
          <p className="text-xs mb-2" style={{ color: "#9090B0" }}>Platform: <span style={{ color: "#F0F0FF" }}>{platform}</span></p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCode}
              onChange={(e) => setIncludeCode(e.target.checked)}
              className="rounded"
              style={{ accentColor: "#6C63FF" }}
            />
            <span className="text-xs" style={{ color: "#9090B0" }}>Include my current code</span>
          </label>
        </div>

        <button
          onClick={() => { if (errorText.trim()) { onSubmit(errorText.trim(), includeCode); onClose(); } }}
          disabled={!errorText.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: errorText.trim() ? "#6C63FF" : "#1A1A2E",
            color: errorText.trim() ? "#fff" : "#3A3A5A",
            cursor: errorText.trim() ? "pointer" : "not-allowed",
          }}
        >
          Diagnose Error
        </button>
      </div>
    </div>
  );
}

/* ── Push to IDE Modal ──────────────────────────────── */
function PushModeModal({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (mode: "replace" | "insert") => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(10,10,15,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-5 shadow-xl max-w-xs w-full"
        style={{ background: "#12121A", border: "1px solid #2A2A3E" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-sm mb-4 text-foreground">Push code to IDE</h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onChoose("replace")}
            className="py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: "#6C63FF", color: "#fff" }}
          >
            Replace all code
          </button>
          <button
            onClick={() => onChoose("insert")}
            className="py-2.5 rounded-lg text-sm font-medium border"
            style={{ color: "#F0F0FF", borderColor: "#2A2A3E", background: "#0A0A0F" }}
          >
            Insert at cursor
          </button>
          <button onClick={onClose} className="text-xs mt-1" style={{ color: "#5A5A7A" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main AIAssistant ────────────────────────────────── */
export default function AIAssistant({
  project,
  currentStep,
  ideCode,
  libraryNames,
  completedSteps,
  userName,
  onPushCode,
  externalMessage,
  onExternalMessageHandled,
}: AIAssistantProps) {
  const [panelSize, setPanelSize] = useState<PanelSize>("normal");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "responding">("idle");
  const [showErrorDebugger, setShowErrorDebugger] = useState(false);
  const [pendingPushCode, setPendingPushCode] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const bp = project.build_plan?.buildPlan;
  const allSteps = bp?.steps ?? [];
  const activeStep = allSteps.find((s) => s.stepNumber === currentStep);
  const currentPhase = activeStep?.phase ?? "";
  const chips = PHASE_CHIPS[currentPhase] ?? DEFAULT_CHIPS;

  const firstNameDisplay = userName?.split(" ")[0] ?? "there";

  /* ── Load conversation on mount ─────────── */
  useEffect(() => {
    if (conversationLoaded || !project.id) return;
    const load = async () => {
      try {
        const res = await authFetch(`/api/ai/conversation/${project.id}`);
        if (res.ok) {
          const data = await res.json() as { messages: Message[] };
          if (data.messages?.length > 0) {
            setMessages(data.messages);
          } else {
            // Show welcome message
            setMessages([{
              id: "welcome",
              role: "assistant",
              content: `Hi ${firstNameDisplay} 👋 I'm your Nexora AI assistant for this project.\n\nI already know everything about your **${project.title}** — your components, your current step, and your code.\n\nAsk me anything. I'm here to help you build, debug, and understand every part of your project.`,
              timestamp: new Date().toISOString(),
            }]);
          }
        }
      } catch {
        // Show welcome anyway
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: `Hi ${firstNameDisplay} 👋 I'm your Nexora AI assistant for this project.\n\nI already know everything about your **${project.title}** — your components, your current step, and your code.\n\nAsk me anything!`,
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setConversationLoaded(true);
      }
    };
    load();
  }, [project.id, conversationLoaded, firstNameDisplay, project.title]);

  /* ── Auto-scroll ────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiStatus]);

  /* ── Handle external messages (explain this) ── */
  useEffect(() => {
    if (externalMessage && conversationLoaded) {
      if (panelSize === "collapsed") setPanelSize("normal");
      setInput(externalMessage);
      onExternalMessageHandled();
      // Auto-send
      setTimeout(() => sendMessage(externalMessage), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessage, conversationLoaded]);

  /* ── Send message ───────────────────────── */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || aiStatus !== "idle") return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
      context: { stepNumber: currentStep, phase: currentPhase },
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAiStatus("thinking");
    if (panelSize === "collapsed") setPanelSize("normal");

    // Build context
    const context = buildProjectContext(
      project,
      currentStep,
      ideCode,
      libraryNames,
      completedSteps
    );

    // Last 10 messages for history
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await authFetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          message: text.trim(),
          conversationHistory: history,
          projectContext: context,
          messageType: "general",
        }),
      });

      setAiStatus("responding");

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string; rateLimited?: boolean };
        const errMsg: Message = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: err.error ?? "Sorry, I couldn't respond. Please try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } else {
        const data = await res.json() as { response: string };
        const asstMsg: Message = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
          context: { stepNumber: currentStep, phase: currentPhase },
        };
        setMessages((prev) => [...prev, asstMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, role: "assistant", content: "Network error. Please check your connection.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setAiStatus("idle");
    }
  }, [aiStatus, currentPhase, currentStep, ideCode, libraryNames, completedSteps, messages, panelSize, project]);

  /* ── Feedback ───────────────────────────── */
  const handleFeedback = async (msgId: string, feedback: "helpful" | "not_helpful") => {
    await authFetch("/api/ai/feedback", {
      method: "POST",
      body: JSON.stringify({ messageId: msgId, projectId: project.id, feedback }),
    }).catch(() => {});
  };

  /* ── Error debugger submit ──────────────── */
  const handleErrorSubmit = (errorText: string, includeCode: boolean) => {
    const msg = `ERROR DIAGNOSIS REQUEST:\nError message: ${errorText}${includeCode ? `\n\nCurrent code included in context.` : ""}\n\nPlease:\n1. Identify what caused this error\n2. Explain it simply for my skill level\n3. Give exact steps to fix it\n4. Show corrected code if applicable`;
    sendMessage(msg);
  };

  /* ── Push code ──────────────────────────── */
  const handlePushCode = (code: string) => {
    if (!ideCode) {
      onPushCode(code, "replace");
    } else {
      setPendingPushCode(code);
    }
  };

  /* ── Clear conversation ─────────────────── */
  const handleClear = async () => {
    await authFetch(`/api/ai/conversation/${project.id}`, { method: "DELETE" }).catch(() => {});
    setMessages([{
      id: `welcome_${Date.now()}`,
      role: "assistant",
      content: `Conversation cleared! Ready to help with **${project.title}**. What would you like to know?`,
      timestamp: new Date().toISOString(),
    }]);
  };

  /* ── Voice input ────────────────────────── */
  const toggleVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  /* ── Height ─────────────────────────────── */
  const height = HEIGHTS[panelSize];
  const cycleSize = () => {
    setPanelSize((s) => s === "collapsed" ? "normal" : s === "normal" ? "expanded" : "collapsed");
  };

  /* ── Character count ────────────────────── */
  const charCount = input.length;

  return (
    <>
      {showErrorDebugger && (
        <ErrorDebuggerModal
          onClose={() => setShowErrorDebugger(false)}
          onSubmit={handleErrorSubmit}
          stepTitle={activeStep?.title ?? "Current Step"}
          platform={bp?.platform ?? "ESP32"}
        />
      )}

      {pendingPushCode && (
        <PushModeModal
          onClose={() => setPendingPushCode(null)}
          onChoose={(mode) => {
            onPushCode(pendingPushCode, mode);
            setPendingPushCode(null);
          }}
        />
      )}

      <div
        className="flex flex-col flex-shrink-0"
        style={{
          height,
          borderTop: "1px solid #2A2A3E",
          background: "#0D0D14",
          transition: "height 0.25s ease",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0 group"
          style={{ height: 48, borderBottom: panelSize !== "collapsed" ? "1px solid #2A2A3E" : "none" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Sparkles
                className="w-4 h-4"
                style={{
                  color: "#6C63FF",
                  filter: aiStatus !== "idle" ? "drop-shadow(0 0 6px rgba(108,99,255,0.8))" : undefined,
                }}
              />
              {aiStatus !== "idle" && (
                <span
                  className="absolute -inset-1 rounded-full animate-ping"
                  style={{ background: "rgba(108,99,255,0.2)" }}
                />
              )}
            </div>
            <span className="text-sm font-bold" style={{ color: "#F0F0FF" }}>
              Nexora AI
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: aiStatus === "idle" ? "#5A5A7A" : aiStatus === "thinking" ? "#6C63FF" : "#00D4FF",
                  animation: aiStatus !== "idle" ? "ping 1s infinite" : "none",
                }}
              />
              <span className="text-xs" style={{ color: "#5A5A7A" }}>
                {aiStatus === "idle" ? "Ready" : aiStatus === "thinking" ? "Thinking..." : "Responding..."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentPhase && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}
              >
                Step {currentStep} · {currentPhase}
              </span>
            )}
            <button
              onClick={handleClear}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
              style={{ color: "#5A5A7A" }}
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={cycleSize} className="p-1 rounded transition-colors" style={{ color: "#5A5A7A" }}>
              {panelSize === "collapsed" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {panelSize !== "collapsed" && (
          <>
            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onFeedback={handleFeedback}
                  onPushCode={handlePushCode}
                />
              ))}

              {/* Welcome quick chips (only if first message is welcome) */}
              {messages.length === 1 && messages[0].id.startsWith("welcome") && (
                <div className="flex gap-2 flex-wrap mt-1 mb-3">
                  {["What should I do in Step 1?", "Explain my components", "What could go wrong?"].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                      style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#6C63FF"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#9090B0"; }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {aiStatus !== "idle" && (
                <div
                  className="max-w-[85%] rounded-xl"
                  style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", borderRadius: "12px 12px 12px 2px" }}
                >
                  <TypingDots />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Suggestion chips ── */}
            <div
              className="flex gap-2 px-4 pb-2 overflow-x-auto flex-shrink-0"
              style={{ scrollbarWidth: "none" }}
            >
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  disabled={aiStatus !== "idle"}
                  className="text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors flex-shrink-0"
                  style={{
                    borderColor: "#2A2A3E",
                    color: aiStatus !== "idle" ? "#3A3A5A" : "#9090B0",
                    background: "#0A0A0F",
                    cursor: aiStatus !== "idle" ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (aiStatus === "idle") {
                      e.currentTarget.style.borderColor = "#6C63FF";
                      e.currentTarget.style.color = "#6C63FF";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#2A2A3E";
                    e.currentTarget.style.color = aiStatus !== "idle" ? "#3A3A5A" : "#9090B0";
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* ── Input bar ── */}
            <div
              className="flex gap-2 px-3 pb-3 flex-shrink-0"
              style={{ borderTop: "1px solid #2A2A3E", paddingTop: 10 }}
            >
              {/* Attach menu */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu((v) => !v)}
                  className="p-2 rounded-lg transition-colors flex-shrink-0"
                  style={{ background: "#1A1A2E", color: "#5A5A7A", border: "1px solid #2A2A3E" }}
                  title="Attach context"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                {showAttachMenu && (
                  <div
                    className="absolute bottom-full left-0 mb-2 rounded-lg overflow-hidden shadow-xl z-10"
                    style={{ background: "#12121A", border: "1px solid #2A2A3E", minWidth: 190 }}
                  >
                    {[
                      { label: "Share current code", action: () => { setInput((v) => v + `\n\nHere is my current code:\n\`\`\`cpp\n${ideCode}\n\`\`\``); setShowAttachMenu(false); } },
                      { label: "Share error message", action: () => { setShowErrorDebugger(true); setShowAttachMenu(false); } },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="block w-full text-left text-xs px-4 py-2.5 transition-colors"
                        style={{ color: "#D0D0E0" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A2E")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Text input */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 1000))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder={PHASE_PLACEHOLDER[currentPhase] ?? "Ask anything about your project..."}
                  rows={1}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={{
                    background: "#1A1A2E",
                    border: "1px solid #2A2A3E",
                    color: "#F0F0FF",
                    fontFamily: "inherit",
                    maxHeight: 80,
                    overflowY: "auto",
                  }}
                />
                {charCount >= 800 && (
                  <span
                    className="absolute bottom-1 right-2 text-[10px]"
                    style={{ color: charCount >= 990 ? "#FF5A5A" : "#5A5A7A" }}
                  >
                    {charCount}/1000
                  </span>
                )}
              </div>

              {/* Voice button */}
              <button
                onClick={toggleVoice}
                className="p-2 rounded-lg flex-shrink-0 transition-colors"
                style={{
                  background: isRecording ? "rgba(255,90,90,0.15)" : "#1A1A2E",
                  color: isRecording ? "#FF5A5A" : "#5A5A7A",
                  border: "1px solid #2A2A3E",
                }}
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
                {isRecording && (
                  <span
                    className="absolute w-2 h-2 rounded-full bg-red-500 -top-0.5 -right-0.5 animate-ping"
                  />
                )}
              </button>

              {/* Send button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || aiStatus !== "idle"}
                className="p-2 rounded-lg flex-shrink-0 transition-all"
                style={{
                  background: input.trim() && aiStatus === "idle" ? "#6C63FF" : "#1A1A2E",
                  color: input.trim() && aiStatus === "idle" ? "#fff" : "#3A3A5A",
                  cursor: input.trim() && aiStatus === "idle" ? "pointer" : "not-allowed",
                }}
              >
                {aiStatus !== "idle" ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#6C63FF" }} />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

