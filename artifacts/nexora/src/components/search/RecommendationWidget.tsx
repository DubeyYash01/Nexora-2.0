import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sparkles, RefreshCw, Loader2, GitFork, DollarSign, HelpCircle } from "lucide-react";
import { authFetch } from "@/lib/supabase";

interface Blueprint {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  platform: string;
  fork_count: number;
  like_count: number;
  estimated_cost_min: number;
  estimated_cost_max: number;
  estimated_time: string;
  tags: string[];
  components: { list?: { name: string }[] };
  reason?: string;
}

const DIFF_COLORS: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: "rgba(0,200,150,0.1)", color: "#00C896" },
  Intermediate: { bg: "rgba(255,184,77,0.1)", color: "#FFB84D" },
  Advanced: { bg: "rgba(255,90,90,0.1)", color: "#FF5A5A" },
};

function WhyPopover({ reason, onClose }: { reason: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="p-4 rounded-xl max-w-xs text-center" style={{ background: "#1A1A2E", border: "1px solid #2A2A3E" }} onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold mb-1" style={{ color: "#6C63FF" }}>Why this recommendation?</p>
        <p className="text-sm" style={{ color: "#C0C0D0" }}>{reason}</p>
        <button onClick={onClose} className="mt-3 text-xs px-3 py-1.5 rounded-lg" style={{ background: "#2A2A3E", color: "#9090B0" }}>Close</button>
      </div>
    </div>
  );
}

export default function RecommendationWidget() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [whyBp, setWhyBp] = useState<Blueprint | null>(null);
  const [, setLocation] = useLocation();

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/blueprints/recommended");
      const data = await res.json() as { blueprints: Blueprint[] };
      setBlueprints((data.blueprints ?? []).slice(0, 3));
    } catch {
      setBlueprints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base lg:text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "#FFB84D" }} />
            ✦ Recommended for You
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Based on your projects and components</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: "#5A5A7A" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0FF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5A5A7A")}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => setLocation("/blueprints")} className="text-sm transition-colors" style={{ color: "#6C63FF" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#5854E0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6C63FF")}>
            View all →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#6C63FF" }} />
        </div>
      ) : blueprints.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No recommendations yet — start a project to personalize your feed!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blueprints.map((bp) => {
            const d = DIFF_COLORS[bp.difficulty] ?? DIFF_COLORS.Beginner;
            const compList = bp.components?.list ?? [];
            return (
              <div
                key={bp.id}
                className="p-4 lg:p-5 rounded-xl border flex flex-col gap-3 transition-all duration-200 cursor-pointer"
                style={{ background: "#12121A", borderColor: "#2A2A3E" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; }}
                onClick={() => setLocation(`/blueprints/${bp.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-foreground text-sm leading-snug">{bp.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: d.bg, color: d.color }}>
                    {bp.difficulty}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{bp.description}</p>
                <div className="flex flex-wrap gap-1">
                  {compList.slice(0, 3).map((c) => (
                    <span key={c.name} className="text-[10px] px-1.5 py-0.5 rounded border"
                      style={{ background: "#1A1A2E", color: "#9090B0", borderColor: "#2A2A3E" }}>
                      {c.name}
                    </span>
                  ))}
                </div>
                {bp.reason && (
                  <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg" style={{ background: "rgba(255,184,77,0.08)", color: "#FFB84D" }}>
                    <span className="truncate">{bp.reason}</span>
                    <button onClick={(e) => { e.stopPropagation(); setWhyBp(bp); }} className="flex-shrink-0 ml-auto">
                      <HelpCircle className="w-3 h-3" style={{ color: "#FFB84D", opacity: 0.7 }} />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: "#2A2A3E" }}>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "#5A5A7A" }}>
                    <GitFork className="w-3 h-3" /> {bp.fork_count ?? 0}
                    <DollarSign className="w-3 h-3 ml-1" />
                    <span style={{ color: "#00C896" }}>₹{bp.estimated_cost_min}–{bp.estimated_cost_max}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLocation(`/blueprints/${bp.id}`); }}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                    style={{ background: "transparent", borderColor: "#2A2A3E", color: "#9090B0" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#6C63FF"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#9090B0"; }}
                  >
                    Use Blueprint
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {whyBp && <WhyPopover reason={whyBp.reason ?? "Recommended for you"} onClose={() => setWhyBp(null)} />}
    </div>
  );
}
