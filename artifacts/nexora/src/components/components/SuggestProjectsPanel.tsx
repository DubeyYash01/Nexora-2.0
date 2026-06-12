import { useState, useEffect } from "react";
import { X, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/supabase";
import type { UserComponent } from "@/components/ui/ComponentCard";

interface MissingComponent {
  name: string;
  estimatedCost: number;
  optional: boolean;
  reason: string;
}

interface ProjectSuggestion {
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  matchScore: number;
  matchReason: string;
  requiredComponents: string[];
  missingComponents: MissingComponent[];
  totalExtraCost: number;
  estimatedTime: string;
  learningValue: string;
}

const LOADING_MESSAGES = [
  "✦ Scanning your inventory...",
  "✦ Matching components to projects...",
  "✦ Finding the best matches...",
  "✦ Calculating what you can build...",
];

const DIFFICULTY_COLORS: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: "rgba(0,200,150,0.1)", color: "#00C896" },
  Intermediate: { bg: "rgba(255,184,77,0.1)", color: "#FFB84D" },
  Advanced: { bg: "rgba(255,90,90,0.1)", color: "#FF5A5A" },
};

function MatchBadge({ score }: { score: number }) {
  if (score >= 90) return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: "rgba(0,200,150,0.15)", color: "#00C896" }}>
      Perfect Match ✓
    </span>
  );
  if (score >= 70) return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}>
      {score}% Match
    </span>
  );
  if (score >= 50) return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: "rgba(255,184,77,0.12)", color: "#FFB84D" }}>
      {score}% Match
    </span>
  );
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: "rgba(90,90,122,0.2)", color: "#9090B0" }}>
      {score}% Match
    </span>
  );
}

export default function SuggestProjectsPanel({
  open,
  components,
  skillLevel,
  onClose,
}: {
  open: boolean;
  components: UserComponent[];
  skillLevel?: string;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!open || components.length === 0) return;
    setLoading(true);
    setError(null);
    setSuggestions([]);

    authFetch("/api/components/suggest-projects", {
      method: "POST",
      body: JSON.stringify({
        components: components.map((c) => ({ name: c.name, quantity: c.quantity })),
        skillLevel: skillLevel ?? "Beginner",
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestions) setSuggestions(data.suggestions);
        else setError("No suggestions returned");
      })
      .catch(() => setError("Failed to generate suggestions. Please try again."))
      .finally(() => setLoading(false));
  }, [open, components, skillLevel]);

  useEffect(() => {
    if (!loading) return;
    setMsgIdx(0);
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1600);
    return () => clearInterval(t);
  }, [loading]);

  const handleStartProject = (s: ProjectSuggestion) => {
    const idea = `${s.title}: ${s.description}`;
    setLocation(`/projects/new?idea=${encodeURIComponent(idea)}`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full flex flex-col"
        style={{
          height: "70vh",
          background: "#12121A",
          borderTop: "1px solid #2A2A3E",
          borderRadius: "20px 20px 0 0",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 flex-shrink-0 border-b" style={{ borderColor: "#2A2A3E" }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "#F0F0FF" }}>
              <Sparkles className="w-5 h-5" style={{ color: "#6C63FF" }} />
              Projects You Can Build Today
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "#5A5A7A" }}>
              Based on {components.length} component{components.length !== 1 ? "s" : ""} in your inventory
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "#9090B0" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(90,90,122,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
                style={{ background: "rgba(108,99,255,0.1)" }}>
                <Sparkles className="w-8 h-8" style={{ color: "#6C63FF" }} />
              </div>
              <p className="text-base font-medium transition-all duration-300" style={{ color: "#C0C0D0" }}>
                {LOADING_MESSAGES[msgIdx]}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <AlertCircle className="w-12 h-12" style={{ color: "#FF5A5A" }} />
              <p style={{ color: "#FF9090" }}>{error}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {suggestions.map((s, i) => {
                const diff = DIFFICULTY_COLORS[s.difficulty] ?? DIFFICULTY_COLORS.Beginner;
                return (
                  <div
                    key={i}
                    className="rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200"
                    style={{ background: "#0D0D14", borderColor: "#2A2A3E" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
                  >
                    {/* Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <MatchBadge score={s.matchScore} />
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: diff.bg, color: diff.color }}>
                        {s.difficulty}
                      </span>
                    </div>

                    {/* Title & desc */}
                    <div>
                      <h3 className="font-bold text-sm leading-snug" style={{ color: "#F0F0FF" }}>{s.title}</h3>
                      <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: "#9090B0" }}>
                        {s.description}
                      </p>
                    </div>

                    {/* Have */}
                    {s.requiredComponents.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold mb-1.5" style={{ color: "#5A5A7A" }}>
                          Components you have:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.requiredComponents.slice(0, 4).map((c, j) => (
                            <span key={j} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(0,200,150,0.1)", color: "#00C896" }}>
                              <CheckCircle2 className="w-2.5 h-2.5" /> {c}
                            </span>
                          ))}
                          {s.requiredComponents.length > 4 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(0,200,150,0.08)", color: "#00C896" }}>
                              +{s.requiredComponents.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Missing */}
                    {s.missingComponents.length > 0 ? (
                      <div>
                        <p className="text-[11px] font-semibold mb-1.5" style={{ color: "#5A5A7A" }}>Still need:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.missingComponents.slice(0, 3).map((m, j) => (
                            <span key={j} className="text-[11px] px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(255,90,90,0.08)", color: "#FF9090" }}>
                              {m.name} ~₹{m.estimatedCost}
                            </span>
                          ))}
                        </div>
                        {s.totalExtraCost > 0 ? (
                          <p className="text-[11px] mt-1" style={{ color: "#FFB84D" }}>
                            ~₹{s.totalExtraCost.toLocaleString("en-IN")} more needed
                          </p>
                        ) : (
                          <p className="text-[11px] mt-1 font-bold" style={{ color: "#00C896" }}>
                            Build for free! 🎉
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] font-bold" style={{ color: "#00C896" }}>
                        ✓ Build for free! 🎉
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t" style={{ borderColor: "#2A2A3E" }}>
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "#5A5A7A" }}>
                        <Clock className="w-3 h-3" /> {s.estimatedTime}
                      </span>
                      <button
                        onClick={() => handleStartProject(s)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: "#6C63FF", color: "#fff" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#5854E0")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#6C63FF")}
                      >
                        Start This Project <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
