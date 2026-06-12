import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import {
  Sparkles, ArrowRight, ArrowLeft, Loader2,
  Lightbulb, Cpu, Activity, Zap, Monitor,
  Wifi, Battery, Package, AlertTriangle,
  CheckCircle2, DollarSign, Clock, BarChart3,
  Truck, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "./dashboard";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ──────────────────────────────────────────────── */
interface AiComponent {
  id: string;
  name: string;
  type: string;
  purpose: string;
  estimatedCost: number;
  isEssential: boolean;
  alternatives: string[];
  owned?: boolean;
  fromInventory?: boolean;
}

interface FeasibilityItem {
  status: "good" | "moderate" | "high";
  note: string;
}

interface Analysis {
  projectTitle: string;
  projectSummary: string;
  howItWorks: string;
  estimatedComplexity: "Beginner" | "Intermediate" | "Advanced";
  estimatedCost: { min: number; max: number; currency: string };
  estimatedTime: string;
  components: AiComponent[];
  feasibility: {
    costFeasibility: FeasibilityItem;
    complexityFeasibility: FeasibilityItem;
    availabilityFeasibility: FeasibilityItem;
    timelineFeasibility: FeasibilityItem;
  };
  risks: string[];
  tips: string[];
}

/* ─── Constants ──────────────────────────────────────────── */
const STEPS = [
  { label: "Idea", num: 1 },
  { label: "Analysis", num: 2 },
  { label: "Components", num: 3 },
  { label: "Build Plan", num: 4 },
  { label: "Code & IDE", num: 5 },
  { label: "Deploy", num: 6 },
];

const EXAMPLE_CHIPS = [
  {
    short: "Temperature & humidity monitor with phone alerts",
    full: "I want to build a temperature and humidity monitoring system using ESP32. It should display readings on an OLED screen and send an alert to my phone when temperature exceeds 35°C.",
  },
  {
    short: "Smart parking sensor with LED indicator",
    full: "I want to build a smart parking sensor that detects if a parking spot is occupied using an ultrasonic sensor and shows availability with a green or red LED.",
  },
  {
    short: "Automatic plant watering system",
    full: "I want to build an automatic plant watering system that checks soil moisture every hour and turns on a water pump when the soil is too dry. It should also log the data.",
  },
];

const LOADING_MESSAGES_ANALYZE = [
  "✦ Understanding your idea...",
  "✦ Identifying components...",
  "✦ Checking feasibility...",
  "✦ Calculating costs...",
  "✦ Almost ready...",
];

const LOADING_MESSAGES_PLAN = [
  "✦ Designing your build plan...",
  "✦ Structuring code by steps...",
  "✦ Preparing your IDE...",
  "✦ Almost ready to build...",
];

// default export — updated below, keep one reference
const LOADING_MESSAGES = LOADING_MESSAGES_ANALYZE;

const TYPE_ICONS: Record<string, React.ElementType> = {
  microcontroller: Cpu,
  sensor: Activity,
  actuator: Zap,
  display: Monitor,
  communication: Wifi,
  power: Battery,
  other: Package,
};

const COMPLEXITY_COLORS: Record<string, string> = {
  Beginner: "#00C896",
  Intermediate: "#FFB84D",
  Advanced: "#FF5A5A",
};

const FEASIBILITY_LABELS: Record<string, { icon: string; label: string }> = {
  costFeasibility: { icon: "💰", label: "Cost" },
  complexityFeasibility: { icon: "⚙️", label: "Complexity" },
  availabilityFeasibility: { icon: "📦", label: "Availability" },
  timelineFeasibility: { icon: "📅", label: "Timeline" },
};

/* ─── Sub-components ─────────────────────────────────────── */
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-8">
      {STEPS.map((step, i) => {
        const done = step.num < current;
        const active = step.num === current;
        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: done ? "#00C896" : active ? "#6C63FF" : "#2A2A3E",
                  color: done || active ? "#fff" : "#5A5A7A",
                }}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.num}
              </div>
              <span
                className="text-[10px] font-medium hidden sm:block"
                style={{ color: active ? "#6C63FF" : done ? "#00C896" : "#5A5A7A" }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="h-px w-6 sm:w-10 mx-1 transition-all duration-300"
                style={{ background: done ? "#00C896" : "#2A2A3E" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function LoadingOverlay({
  visible,
  error,
  onRetry,
  messages = LOADING_MESSAGES,
}: {
  visible: boolean;
  error: string | null;
  onRetry: () => void;
  messages?: string[];
}) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!visible || error) return;
    setMsgIdx(0);
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 1500);
    return () => clearInterval(t);
  }, [visible, error, messages]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-400"
      style={{ background: "rgba(10,10,15,0.92)", backdropFilter: "blur(8px)" }}
    >
      <div className="text-center max-w-sm px-6">
        {error ? (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(255,90,90,0.1)" }}>
              <X className="w-8 h-8" style={{ color: "#FF5A5A" }} />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">Analysis failed</p>
            <p className="text-sm text-muted-foreground mb-6">Please check your idea and try again.</p>
            <Button onClick={onRetry}>Try Again</Button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"
              style={{ background: "rgba(108,99,255,0.15)" }}>
              <Sparkles className="w-8 h-8" style={{ color: "#6C63FF" }} />
            </div>
            <p className="text-lg font-semibold text-foreground mb-6 transition-all duration-300">
              {messages[msgIdx]}
            </p>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "#2A2A3E" }}>
              <div
                className="h-full rounded-full animate-[loading_2s_ease-in-out_infinite]"
                style={{ background: "#6C63FF", width: "60%" }}
              />
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

/* ─── Step 1 ─────────────────────────────────────────────── */
function Step1({
  onAnalyze,
  defaultIdea,
}: {
  onAnalyze: (idea: string, skill: string, type: string) => void;
  defaultIdea: string;
}) {
  const [idea, setIdea] = useState(defaultIdea);
  const [skill, setSkill] = useState("Beginner");
  const [projectType, setProjectType] = useState("Solo Project");
  const [teammates, setTeammates] = useState("");

  const MAX = 500;
  const canSubmit = idea.trim().length >= 20;

  const skills = [
    { value: "Beginner", label: "Beginner", sub: "New to IoT" },
    { value: "Intermediate", label: "Intermediate", sub: "Built a few things" },
    { value: "Advanced", label: "Advanced", sub: "I know my way around" },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="text-center mb-8">
        <span className="inline-block text-xs px-3 py-1 rounded-full border mb-4 font-medium"
          style={{ borderColor: "#6C63FF", color: "#6C63FF", background: "rgba(108,99,255,0.08)" }}>
          ✦ AI-Powered Analysis
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          What do you want to build?
        </h2>
        <p className="text-muted-foreground">
          Describe your IoT idea in plain English. The more detail, the better.
        </p>
      </div>

      {/* Textarea */}
      <div className="relative mb-4">
        <textarea
          data-testid="input-idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value.slice(0, MAX))}
          rows={6}
          placeholder="e.g. I want to build a smart plant watering system that monitors soil moisture and automatically waters the plant when it gets dry. It should also send me a notification on my phone."
          className="w-full rounded-xl p-4 text-sm resize-none outline-none transition-all duration-200 border"
          style={{
            background: "#0A0A0F",
            borderColor: idea.length > 0 ? "#6C63FF" : "#2A2A3E",
            color: "#F0F0FF",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
          onBlur={(e) => (e.target.style.borderColor = idea.length > 0 ? "#6C63FF" : "#2A2A3E")}
        />
        <span
          className="absolute bottom-3 right-3 text-xs"
          style={{ color: idea.length > MAX * 0.85 ? "#FFB84D" : "#5A5A7A" }}
        >
          {idea.length} / {MAX}
        </span>
      </div>

      {/* Example chips */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Or try one of these examples:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip.short}
              data-testid={`chip-${chip.short.slice(0, 20).toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setIdea(chip.full)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all duration-200 hover:border-primary/60 text-left"
              style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#9090B0" }}
            >
              {chip.short}
            </button>
          ))}
        </div>
      </div>

      {/* Skill level */}
      <div className="mb-5">
        <p className="text-sm font-medium text-foreground mb-2">Your experience level:</p>
        <div className="flex gap-2 flex-wrap">
          {skills.map((s) => (
            <button
              key={s.value}
              data-testid={`skill-${s.value.toLowerCase()}`}
              onClick={() => setSkill(s.value)}
              className="flex-1 min-w-[100px] py-2.5 px-3 rounded-lg border text-sm transition-all duration-200 text-left"
              style={{
                background: skill === s.value ? "#6C63FF" : "#12121A",
                borderColor: skill === s.value ? "#6C63FF" : "#2A2A3E",
                color: skill === s.value ? "#fff" : "#9090B0",
              }}
            >
              <div className="font-medium">{s.label}</div>
              <div className="text-xs opacity-70">{s.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Project type */}
      <div className="mb-8">
        <p className="text-sm font-medium text-foreground mb-2">Project type:</p>
        <div className="flex gap-2">
          {["Solo Project", "Group Project"].map((t) => (
            <button
              key={t}
              data-testid={`type-${t.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setProjectType(t)}
              className="px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200"
              style={{
                background: projectType === t ? "#6C63FF" : "#12121A",
                borderColor: projectType === t ? "#6C63FF" : "#2A2A3E",
                color: projectType === t ? "#fff" : "#9090B0",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {projectType === "Group Project" && (
          <div className="mt-3 animate-in fade-in duration-200">
            <input
              data-testid="input-teammates"
              value={teammates}
              onChange={(e) => setTeammates(e.target.value)}
              placeholder="Enter teammate emails (comma separated)"
              className="w-full rounded-lg px-3 py-2 text-sm border outline-none transition-all duration-200"
              style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
              onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
              onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")}
            />
          </div>
        )}
      </div>

      <Button
        data-testid="btn-analyze"
        className="w-full py-3 text-base"
        disabled={!canSubmit}
        onClick={() => onAnalyze(idea, skill, projectType)}
      >
        Analyze My Idea <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
      {!canSubmit && (
        <p className="text-center text-xs text-muted-foreground mt-2">
          Please write at least 20 characters to continue
        </p>
      )}
    </div>
  );
}

/* ─── Step 2 ─────────────────────────────────────────────── */
function Step2({
  analysis,
  projectId,
  skillLevel,
  onBack,
  onGeneratePlan,
}: {
  analysis: Analysis;
  projectId: string;
  skillLevel: string;
  onBack: () => void;
  onGeneratePlan: (components: AiComponent[]) => void;
}) {
  const { toast } = useToast();
  const [components, setComponents] = useState<AiComponent[]>(
    (analysis.components ?? []).map((c) => ({ ...c, owned: false }))
  );
  const [saving, setSaving] = useState(false);
  const [expandedAlts, setExpandedAlts] = useState<Set<string>>(new Set());

  // Auto-match inventory
  useEffect(() => {
    authFetch("/api/components/me")
      .then((r) => r.json())
      .then((data: { components?: Array<{ name: string }> }) => {
        if (!data.components?.length) return;
        const inventory = data.components.map((c) => c.name.toLowerCase());
        setComponents((prev) =>
          prev.map((c) => {
            const cLow = c.name.toLowerCase();
            const matched = inventory.some((inv) => inv.includes(cLow) || cLow.includes(inv));
            return matched ? { ...c, owned: true, fromInventory: true } : c;
          })
        );
      })
      .catch(() => {});
  }, []);

  const purchaseTotal = components
    .filter((c) => !c.owned)
    .reduce((sum, c) => sum + (c.estimatedCost ?? 0), 0);
  const fullTotal = components.reduce((sum, c) => sum + (c.estimatedCost ?? 0), 0);

  const toggleOwned = (id: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, owned: !c.owned } : c))
    );
  };

  const toggleAlt = (id: string) => {
    setExpandedAlts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save components first
      const saveRes = await authFetch("/api/projects/save-components", {
        method: "POST",
        body: JSON.stringify({ projectId, components }),
      });
      if (!saveRes.ok) throw new Error("Save failed");
      // Trigger generate-plan in parent
      onGeneratePlan(components);
    } catch {
      toast({ title: "Error saving", description: "Please try again.", variant: "destructive" });
      setSaving(false);
    }
  };

  const complexityColor = COMPLEXITY_COLORS[analysis.estimatedComplexity] ?? "#9090B0";

  const feasibilityEntries = [
    { key: "costFeasibility", data: analysis.feasibility.costFeasibility, icon: DollarSign },
    { key: "complexityFeasibility", data: analysis.feasibility.complexityFeasibility, icon: BarChart3 },
    { key: "availabilityFeasibility", data: analysis.feasibility.availabilityFeasibility, icon: Truck },
    { key: "timelineFeasibility", data: analysis.feasibility.timelineFeasibility, icon: Clock },
  ];

  const statusColor = (s: string) =>
    s === "good" ? "#00C896" : s === "moderate" ? "#FFB84D" : "#FF5A5A";

  return (
    <div className="max-w-3xl mx-auto w-full pb-28 space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#00C896" }}>✦ Analysis Complete</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{analysis.projectTitle}</h2>
          <p className="text-muted-foreground mt-1 max-w-xl">{analysis.projectSummary}</p>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-full border font-medium"
            style={{ color: complexityColor, borderColor: `${complexityColor}30`, background: `${complexityColor}10` }}>
            {analysis.estimatedComplexity}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full border font-medium"
            style={{ color: "#00D4FF", borderColor: "#00D4FF30", background: "#00D4FF10" }}>
            <Clock className="w-3 h-3 inline mr-1" />{analysis.estimatedTime}
          </span>
        </div>
      </div>

      {/* How it works + Cost */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 p-5 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5" style={{ color: "#6C63FF" }} />
            <h3 className="font-semibold text-foreground">How It Works</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.howItWorks}</p>
        </div>
        <div className="p-5 rounded-xl border flex flex-col justify-center"
          style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
          <p className="text-xs text-muted-foreground mb-2">Estimated Cost</p>
          <p className="text-2xl font-bold text-foreground">
            ₹{analysis.estimatedCost.min.toLocaleString("en-IN")}
            <span className="text-muted-foreground font-normal text-base"> – ₹{analysis.estimatedCost.max.toLocaleString("en-IN")}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Estimated component cost</p>
        </div>
      </div>

      {/* Components */}
      <div className="p-5 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-foreground">Required Components</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Toggle the ones you already own</p>

        <div className="space-y-3">
          {components.map((c) => {
            const Icon = TYPE_ICONS[c.type] ?? Package;
            const altOpen = expandedAlts.has(c.id);
            return (
              <div
                key={c.id}
                data-testid={`component-row-${c.id}`}
                className="flex gap-3 p-3 rounded-lg border transition-all duration-200"
                style={{
                  borderColor: c.owned ? "#00C896" : "#2A2A3E",
                  background: c.owned ? "rgba(0,200,150,0.04)" : "#0A0A0F",
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(108,99,255,0.1)" }}>
                  <Icon className="w-4 h-4" style={{ color: "#6C63FF" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{c.name}</span>
                    {c.fromInventory && c.owned && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1"
                        style={{ color: "#00D4FF", borderColor: "rgba(0,212,255,0.3)", background: "rgba(0,212,255,0.08)" }}>
                        ✓ From inventory
                      </span>
                    )}
                    {!c.isEssential && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border"
                        style={{ color: "#9090B0", borderColor: "#2A2A3E", background: "#1A1A2E" }}>
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.purpose}</p>
                  {c.alternatives?.length > 0 && (
                    <button
                      onClick={() => toggleAlt(c.id)}
                      className="text-xs mt-1 transition-colors"
                      style={{ color: altOpen ? "#6C63FF" : "#5A5A7A" }}
                    >
                      {altOpen ? "▾" : "▸"} Alternatives: {c.alternatives.join(", ")}
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-sm font-medium text-foreground">~₹{c.estimatedCost}</span>
                  <button
                    data-testid={`toggle-owned-${c.id}`}
                    onClick={() => toggleOwned(c.id)}
                    className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0"
                    style={{ background: c.owned ? "#6C63FF" : "#2A2A3E" }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                      style={{ transform: c.owned ? "translateX(20px)" : "translateX(0)" }}
                    />
                  </button>
                  {c.owned && (
                    <span className="text-[10px]" style={{ color: "#00C896" }}>I own this ✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cost summary */}
        <div className="mt-4 pt-4 border-t space-y-1" style={{ borderColor: "#2A2A3E" }}>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">You need to purchase:</span>
            <span className="font-semibold text-foreground">₹{purchaseTotal.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total project cost:</span>
            <span className="font-semibold" style={{ color: "#6C63FF" }}>₹{fullTotal.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Feasibility */}
      <div className="p-5 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
        <h3 className="font-semibold text-foreground mb-4">Feasibility Check</h3>
        <div className="grid grid-cols-2 gap-3">
          {feasibilityEntries.map(({ key, data, icon: Icon }) => (
            <div key={key} className="p-3 rounded-lg border" style={{ background: "#0A0A0F", borderColor: "#2A2A3E" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  {FEASIBILITY_LABELS[key]?.label}
                </span>
                <span
                  className="ml-auto w-2 h-2 rounded-full"
                  style={{ background: statusColor(data.status) }}
                />
                <span className="text-xs font-medium capitalize"
                  style={{ color: statusColor(data.status) }}>
                  {data.status === "good" ? "Good" : data.status === "moderate" ? "Moderate" : "High"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{data.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risks & Tips */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: "#FFB84D" }} /> Risks to Watch
          </h3>
          <ul className="space-y-2">
            {(analysis.risks ?? []).map((risk, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#FFB84D" }} />
                {risk}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-5 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" style={{ color: "#00D4FF" }} /> Pro Tips
          </h3>
          <ul className="space-y-2">
            {(analysis.tips ?? []).map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#00D4FF" }} />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 border-t"
        style={{ background: "rgba(10,10,15,0.95)", borderColor: "#2A2A3E", backdropFilter: "blur(12px)" }}
      >
        <Button variant="outline" onClick={onBack} data-testid="btn-back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-xs">
          {analysis.projectTitle}
        </span>
        <Button
          data-testid="btn-generate-build-plan"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Generate Build Plan →
        </Button>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function NewProject() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const blueprintTitle = searchParams.get("blueprint") ?? "";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<"analyze" | "plan">("analyze");
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [skillLevel, setSkillLevel] = useState<string>("Beginner");

  const handleAnalyze = async (idea: string, skill: string, type: string) => {
    setLoading(true);
    setLoadingPhase("analyze");
    setLoadingError(null);
    setSkillLevel(skill);
    try {
      const res = await authFetch("/api/projects/analyze", {
        method: "POST",
        body: JSON.stringify({ idea, skillLevel: skill, projectType: type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Analysis failed");
      }
      const data = await res.json() as { projectId: string; analysis: Analysis };
      setProjectId(data.projectId);
      setAnalysis(data.analysis);
      setStep(2);
    } catch (err) {
      setLoadingError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async (components: AiComponent[]) => {
    if (!analysis) return;
    setLoading(true);
    setLoadingPhase("plan");
    setLoadingError(null);
    try {
      const res = await authFetch("/api/projects/generate-plan", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          projectTitle: analysis.projectTitle,
          projectSummary: analysis.projectSummary,
          components: components.map((c) => c.name),
          skillLevel,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Plan generation failed");
      }
      // Redirect to workspace
      navigate(`/workspace/${projectId}`);
    } catch (err) {
      setLoadingError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoadingError(null);
    setLoading(false);
  };

  const loadingMessages =
    loadingPhase === "plan" ? LOADING_MESSAGES_PLAN : LOADING_MESSAGES_ANALYZE;

  return (
    <DashboardLayout title="New Project">
      <div className="max-w-3xl mx-auto">
        <StepIndicator current={step} />

        {step === 1 && (
          <Step1
            onAnalyze={handleAnalyze}
            defaultIdea={blueprintTitle ? `I want to build a ${blueprintTitle} project.` : ""}
          />
        )}
        {step === 2 && analysis && (
          <Step2
            analysis={analysis}
            projectId={projectId}
            skillLevel={skillLevel}
            onBack={() => setStep(1)}
            onGeneratePlan={handleGeneratePlan}
          />
        )}
      </div>

      <LoadingOverlay
        visible={loading || (!!loadingError)}
        error={loadingError}
        onRetry={handleRetry}
        messages={loadingMessages}
      />
    </DashboardLayout>
  );
}
