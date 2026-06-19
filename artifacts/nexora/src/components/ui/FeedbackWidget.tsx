import { useState } from "react";
import { MessageSquare, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";

const MOODS = [
  { emoji: "😞", value: 1 },
  { emoji: "😐", value: 2 },
  { emoji: "🙂", value: 3 },
  { emoji: "😊", value: 4 },
  { emoji: "🤩", value: 5 },
];

const FEATURES = [
  "General Experience",
  "Project Creation",
  "AI Assistant",
  "Nexora IDE",
  "Blueprint Library",
  "Components",
  "Pricing",
  "Bug Report",
  "Other",
];

export default function FeedbackWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [feature, setFeature] = useState("General Experience");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!mood && !message.trim()) return;
    setSubmitting(true);
    try {
      await authFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          userId: user?.id,
          mood,
          message: message.trim(),
          feature,
          pageUrl: window.location.pathname,
        }),
      });
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setMood(null);
        setMessage("");
        setFeature("General Experience");
      }, 3000);
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 flex items-center gap-2 rounded-full border transition-all"
        style={{
          bottom: 84,
          right: 24,
          background: "#12121A",
          borderColor: "#2A2A3E",
          padding: "8px 16px",
          color: "#9090B0",
          fontSize: 13,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#6C63FF";
          e.currentTarget.style.color = "#F0F0FF";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#2A2A3E";
          e.currentTarget.style.color = "#9090B0";
        }}
        aria-label="Send feedback"
      >
        <MessageSquare style={{ width: 14, height: 14 }} />
        Feedback
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed z-50 rounded-2xl border shadow-2xl"
          style={{
            bottom: 140,
            right: 24,
            width: 380,
            background: "#12121A",
            borderColor: "#2A2A3E",
            padding: 24,
            maxWidth: "calc(100vw - 48px)",
          }}
        >
          {success ? (
            <div className="py-6 text-center">
              <div className="text-4xl mb-3">🙏</div>
              <p className="font-semibold mb-1" style={{ color: "#F0F0FF" }}>
                Thanks for your feedback!
              </p>
              <p className="text-sm" style={{ color: "#9090B0" }}>
                We read every response and use it to improve Nexora.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold" style={{ color: "#F0F0FF" }}>Share your feedback</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6A6A8A" }}>Help us make Nexora better</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: "#6A6A8A" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6A6A8A")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mood selector */}
              <div className="flex justify-between mb-4 gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className="flex-1 py-2 rounded-xl border text-xl transition-all"
                    style={{
                      borderColor: mood === m.value ? "#6C63FF" : "#2A2A3E",
                      background: mood === m.value ? "rgba(108,99,255,0.15)" : "transparent",
                      transform: mood === m.value ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>

              {/* Message */}
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#9090B0" }}>
                  What's on your mind?
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you love, what's broken, or what you'd like to see next..."
                  className="w-full rounded-lg border p-3 text-sm resize-none focus:outline-none transition-colors"
                  style={{
                    background: "#0A0A0F",
                    borderColor: "#2A2A3E",
                    color: "#F0F0FF",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
                  onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")}
                />
              </div>

              {/* Feature dropdown */}
              <div className="mb-5">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#9090B0" }}>
                  Which feature is this about?
                </label>
                <select
                  value={feature}
                  onChange={(e) => setFeature(e.target.value)}
                  className="w-full rounded-lg border p-2.5 text-sm focus:outline-none"
                  style={{
                    background: "#0A0A0F",
                    borderColor: "#2A2A3E",
                    color: "#F0F0FF",
                  }}
                >
                  {FEATURES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                  style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || (!mood && !message.trim())}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                  style={{ background: "#6C63FF", color: "#fff" }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Feedback"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
