import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Sparkles, Cpu, ChevronDown, ChevronRight,
  Clock, DollarSign, Package, Loader2, AlertCircle,
} from "lucide-react";

interface PublicProject {
  id: string;
  title: string;
  description?: string;
  components?: { list?: Array<{ name: string; type: string; purpose: string; estimatedCost?: number; isEssential?: boolean }> };
  build_plan?: { steps?: Array<{ stepNumber: number; title: string; phase?: string; objective?: string; duration?: string; instructions?: string[] }> };
  ai_analysis?: { difficultyLevel?: string; platform?: string; overview?: string };
  created_at?: string;
  author?: { full_name: string; avatar_url: string | null } | null;
}

export default function PublicProjectPage() {
  const [, params] = useRoute("/p/:shareToken");
  const [, setLocation] = useLocation();
  const shareToken = params?.shareToken ?? "";

  const [project, setProject] = useState<PublicProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    if (!shareToken) return;
    fetch(`/api/projects/public/${shareToken}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data: { project?: PublicProject }) => {
        setProject(data.project ?? null);
        if (!data.project) setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#6C63FF" }} />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "#0A0A0F" }}>
        <AlertCircle className="w-14 h-14" style={{ color: "#FF5A5A", opacity: 0.6 }} />
        <h2 className="text-xl font-bold" style={{ color: "#F0F0FF" }}>Project Not Found</h2>
        <p style={{ color: "#9090B0" }}>This project is private or the link has expired.</p>
        <button
          onClick={() => setLocation("/")}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "#6C63FF", color: "#fff" }}>
          Go to Nexora
        </button>
      </div>
    );
  }

  const compList = project.components?.list ?? [];
  const steps = project.build_plan?.steps ?? [];

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0F", fontFamily: "Inter, sans-serif" }}>
      {/* Top nav */}
      <div className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "#2A2A3E", background: "#12121A" }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: "#6C63FF" }} />
          <span className="text-base font-bold" style={{ color: "#F0F0FF" }}>Nexora</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/login")}
            className="text-sm px-4 py-2 rounded-xl border transition-all"
            style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#6C63FF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#9090B0"; }}>
            Log in
          </button>
          <button onClick={() => setLocation("/signup")}
            className="text-sm px-4 py-2 rounded-xl font-semibold transition-all"
            style={{ background: "#6C63FF", color: "#fff" }}>
            Get Started Free
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-10 pb-32 space-y-8">
        {/* Hero */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {project.ai_analysis?.difficultyLevel && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}>
                {project.ai_analysis.difficultyLevel}
              </span>
            )}
            {project.ai_analysis?.platform && (
              <span className="text-xs px-2.5 py-1 rounded-full border flex items-center gap-1"
                style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>
                <Cpu className="w-3 h-3" /> {project.ai_analysis.platform}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black leading-tight" style={{ color: "#F0F0FF" }}>{project.title}</h1>
          {project.description && (
            <p className="text-base leading-relaxed" style={{ color: "#9090B0" }}>{project.description}</p>
          )}
          {project.author?.full_name && (
            <p className="text-sm" style={{ color: "#5A5A7A" }}>
              Built by <span style={{ color: "#9090B0" }}>{project.author.full_name}</span>
            </p>
          )}
        </div>

        {/* Components */}
        {compList.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "#F0F0FF" }}>
              <Package className="w-4 h-4" style={{ color: "#6C63FF" }} />
              Components ({compList.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {compList.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl border"
                  style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                  <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6C63FF" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "#C0C0D0" }}>{c.name}</p>
                    <p className="text-[10px] truncate" style={{ color: "#5A5A7A" }}>{c.purpose}</p>
                  </div>
                  {c.estimatedCost != null && (
                    <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "#00C896" }}>₹{c.estimatedCost}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Build Plan */}
        {steps.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "#F0F0FF" }}>
              <Clock className="w-4 h-4" style={{ color: "#00D4FF" }} />
              Build Plan ({steps.length} steps)
            </h2>
            {steps.map((step) => {
              const isOpen = expandedSteps.has(step.stepNumber);
              return (
                <div key={step.stepNumber} className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A3E" }}>
                  <button
                    onClick={() => setExpandedSteps((prev) => {
                      const n = new Set(prev);
                      n.has(step.stepNumber) ? n.delete(step.stepNumber) : n.add(step.stepNumber);
                      return n;
                    })}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                    style={{ background: "#12121A" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A2E")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#12121A")}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}>
                      {step.stepNumber}
                    </span>
                    <span className="flex-1 text-sm font-medium text-left" style={{ color: "#F0F0FF" }}>{step.title}</span>
                    {step.duration && <span className="text-[11px] flex-shrink-0" style={{ color: "#5A5A7A" }}>{step.duration}</span>}
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#5A5A7A" }} /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#5A5A7A" }} />}
                  </button>
                  {isOpen && step.objective && (
                    <div className="px-4 pb-3 pt-2 border-t" style={{ borderColor: "#2A2A3E" }}>
                      <p className="text-xs leading-relaxed" style={{ color: "#9090B0" }}>{step.objective}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky CTA bar */}
      <div
        className="fixed bottom-0 inset-x-0 p-4 border-t"
        style={{ background: "rgba(10,10,15,0.96)", borderColor: "#2A2A3E", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>Want to build this?</p>
            <p className="text-xs" style={{ color: "#9090B0" }}>Fork it on Nexora and get AI-guided step-by-step instructions</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setLocation("/signup")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "#6C63FF", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#5854E0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#6C63FF")}
            >
              Get Started Free →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
