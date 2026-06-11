import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, X, ChevronDown } from "lucide-react";
import { authFetch } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const GENERAL_SYSTEM = `You are Nexora AI — a friendly IoT engineering assistant. You help makers, students, and engineers with general IoT questions, ESP32, Arduino, sensors, and project ideas. Be encouraging, concise, and helpful. Use markdown in responses. If someone seems to be working on a project already, suggest they open it in the Nexora workspace for full context-aware help.`;

export default function FloatingAI() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Welcome message on first open
  useEffect(() => {
    if (open && !welcomed) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `Hi! I'm Nexora AI. \n\nI can answer general IoT questions or help you plan your next project. Open a project for full context-aware help.`,
      }]);
      setWelcomed(true);
    }
  }, [open, welcomed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await authFetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          projectId: null,
          message: text,
          conversationHistory: history,
          projectContext: GENERAL_SYSTEM,
          messageType: "general",
        }),
      });
      const data = await res.json() as { response?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { id: `a_${Date.now()}`, role: "assistant", content: data.response ?? data.error ?? "Sorry, something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-50 flex items-center justify-center rounded-full group"
          style={{
            bottom: 24, right: 24,
            width: 56, height: 56,
            background: "#6C63FF",
            boxShadow: "0 4px 24px rgba(108,99,255,0.4)",
          }}
          title="Ask Nexora AI"
        >
          {/* Pulse ring */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: "rgba(108,99,255,0.3)",
              animation: "float-ai-pulse 3s ease-out infinite",
            }}
          />
          <Sparkles className="w-6 h-6 text-white relative z-10 transition-transform group-hover:scale-110" />
          <style>{`@keyframes float-ai-pulse{0%{transform:scale(1);opacity:0.6}70%{transform:scale(1.5);opacity:0}100%{transform:scale(1.5);opacity:0}}`}</style>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            bottom: 24, right: 24,
            width: 380, height: 520,
            background: "#0D0D14",
            border: "1px solid #2A2A3E",
            animation: "slide-up 0.2s ease-out",
          }}
        >
          <style>{`@keyframes slide-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 flex-shrink-0"
            style={{ height: 52, borderBottom: "1px solid #2A2A3E" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "#6C63FF" }} />
              <span className="text-sm font-bold" style={{ color: "#F0F0FF" }}>Nexora AI</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,212,255,0.1)", color: "#00D4FF" }}>
                General Mode
              </span>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: "#5A5A7A" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div
                    className="text-sm px-3 py-2 max-w-[80%]"
                    style={{ background: "#6C63FF", color: "#fff", borderRadius: "12px 12px 2px 12px" }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="text-sm px-3 py-2.5 max-w-[85%] leading-relaxed"
                    style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", borderRadius: "12px 12px 12px 2px", color: "#F0F0FF" }}
                  >
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-xl" style={{ background: "#1A1A2E", border: "1px solid #2A2A3E" }}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-2 h-2 rounded-full" style={{ background: "#6C63FF", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
          </div>

          {/* Quick chips */}
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
            {["What is ESP32?", "Best beginner IoT project?", "How does MQTT work?"].map((c) => (
              <button
                key={c}
                onClick={() => { setInput(c); }}
                className="text-xs px-3 py-1.5 rounded-full border whitespace-nowrap flex-shrink-0"
                style={{ borderColor: "#2A2A3E", color: "#7070A0" }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 px-3 pb-3 flex-shrink-0" style={{ borderTop: "1px solid #2A2A3E", paddingTop: 10 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask an IoT question..."
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg flex-shrink-0"
              style={{
                background: input.trim() && !loading ? "#6C63FF" : "#1A1A2E",
                color: input.trim() && !loading ? "#fff" : "#3A3A5A",
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
