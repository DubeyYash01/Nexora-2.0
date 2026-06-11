import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft, CheckCircle, Lock, Clock,
  AlertTriangle, Zap, ChevronDown, ChevronRight,
  Loader2, Cpu, Timer, Library, BookOpen,
  CheckSquare, Square, Edit2, Save
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import NexoraIDE from "@/components/ide/NexoraIDE";
import type { Library as LibraryType } from "@/components/ide/NexoraIDE";
import AIAssistant from "@/components/ai/AIAssistant";

/* ── Types ───────────────────────────────────────────── */

interface CodeBlock {
  filename: string;
  language: string;
  content: string;
  newLinesAdded: string;
  highlightLines: number[];
}

interface StepLibrary {
  name: string;
  installName: string;
  purpose: string;
  isNew: boolean;
}

interface BuildStep {
  stepNumber: number;
  title: string;
  objective: string;
  description: string;
  duration: string;
  phase: string;
  whatYouLearn: string;
  instructions: string[];
  wiringNotes: string | null;
  safetyWarnings: string[];
  code: CodeBlock;
  libraries: StepLibrary[];
  verificationCheck: string;
}

interface BuildPlan {
  totalSteps: number;
  estimatedTotalTime: string;
  platform: string;
  programmingLanguage: string;
  steps: BuildStep[];
}

interface Project {
  id: string;
  title: string;
  build_plan: { buildPlan: BuildPlan } | null;
  ai_analysis: {
    skillLevel?: string;
    projectSummary?: string;
    components?: Array<{ name: string; purpose: string }>;
  } | null;
  current_step: number;
  completed_steps: number[] | null;
  ide_code: string | null;
  instruction_checks: Record<string, boolean[]> | null;
  components: { list?: Array<{ name: string; purpose: string }> } | null;
}

/* ── Helpers ─────────────────────────────────────────── */

const PHASE_COLORS: Record<string, string> = {
  Setup: "phase-setup",
  Wiring: "phase-wiring",
  Coding: "phase-coding",
  Testing: "phase-testing",
  Integration: "phase-integration",
  Deployment: "phase-deployment",
};

/* ── Step Card ───────────────────────────────────────── */

function StepCard({
  step,
  state,
  checks,
  onToggleCheck,
  onComplete,
  completing,
}: {
  step: BuildStep;
  state: "locked" | "active" | "completed";
  checks: boolean[];
  onToggleCheck: (i: number) => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const allChecked = checks.every(Boolean);

  if (state === "locked") {
    return (
      <div
        className="p-4 border-b"
        style={{ borderColor: "#2A2A3E", opacity: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "#5A5A7A" }} />
          <div>
            <p className="text-sm font-medium text-foreground">
              Step {step.stepNumber}: {step.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#5A5A7A" }}>
              Complete previous step to unlock
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "completed") {
    return (
      <div
        className="border-b cursor-pointer"
        style={{ borderColor: "#2A2A3E", borderLeft: "3px solid #00C896", opacity: 0.85 }}
        onClick={() => setReviewOpen((v) => !v)}
      >
        <div className="p-4 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#00C896" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{step.title}</p>
            <p className="text-xs" style={{ color: "#5A5A7A" }}>
              <Clock className="w-3 h-3 inline mr-1" />{step.duration}
            </p>
          </div>
          {reviewOpen ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#5A5A7A" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#5A5A7A" }} />
          )}
        </div>
        {reviewOpen && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs text-muted-foreground">{step.objective}</p>
            <p className="text-xs" style={{ color: "#5A5A7A" }}>
              <CheckCircle className="w-3 h-3 inline mr-1" style={{ color: "#00C896" }} />
              Verify: {step.verificationCheck}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Active
  return (
    <div
      className="border-b"
      style={{
        borderColor: "#2A2A3E",
        borderLeft: "3px solid #6C63FF",
        background: "rgba(108,99,255,0.06)",
      }}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}
            >
              Step {step.stepNumber}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${PHASE_COLORS[step.phase] ?? "phase-coding"}`}
            >
              {step.phase}
            </span>
          </div>
          <h3 className="font-bold text-foreground leading-tight">{step.title}</h3>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "#9090B0" }}>
            {step.objective}
          </p>
          <p className="text-xs mt-1" style={{ color: "#5A5A7A" }}>
            <Clock className="w-3 h-3 inline mr-1" />{step.duration}
          </p>
        </div>

        {/* Instructions */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Instructions</p>
          <ol className="space-y-2">
            {step.instructions.map((instr, i) => (
              <li
                key={i}
                className="flex gap-2.5 cursor-pointer"
                onClick={() => onToggleCheck(i)}
              >
                {checks[i] ? (
                  <CheckSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#6C63FF" }} />
                ) : (
                  <Square className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#3A3A5A" }} />
                )}
                <span
                  className="text-xs leading-relaxed"
                  style={{
                    color: checks[i] ? "#9090B0" : "#C0C0D0",
                    textDecoration: checks[i] ? "line-through" : "none",
                  }}
                >
                  {instr}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Wiring note */}
        {step.wiringNotes && (
          <div
            className="rounded-lg p-3 flex gap-2"
            style={{
              background: "rgba(255,184,77,0.08)",
              border: "1px solid rgba(255,184,77,0.3)",
            }}
          >
            <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FFB84D" }} />
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#FFB84D" }}>
                Wiring Note
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#C0A060" }}>
                {step.wiringNotes}
              </p>
            </div>
          </div>
        )}

        {/* Safety warnings */}
        {step.safetyWarnings?.length > 0 && (
          <div
            className="rounded-lg p-3"
            style={{
              background: "rgba(255,90,90,0.08)",
              border: "1px solid rgba(255,90,90,0.3)",
            }}
          >
            {step.safetyWarnings.map((w, i) => (
              <div key={i} className="flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#FF5A5A" }} />
                <p className="text-xs" style={{ color: "#FF9090" }}>{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* What you learn */}
        <div className="flex gap-2">
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#00D4FF" }} />
          <p className="text-xs" style={{ color: "#7090B0" }}>
            <span style={{ color: "#00D4FF" }}>You'll learn:</span> {step.whatYouLearn}
          </p>
        </div>

        {/* Verify */}
        <div className="flex gap-2">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#00C896" }} />
          <p className="text-xs" style={{ color: "#7090B0" }}>
            <span style={{ color: "#00C896" }}>How to verify:</span> {step.verificationCheck}
          </p>
        </div>

        {/* Complete button */}
        <button
          onClick={onComplete}
          disabled={!allChecked || completing}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
          style={{
            background: allChecked ? "#6C63FF" : "#1A1A2E",
            color: allChecked ? "#fff" : "#3A3A5A",
            cursor: allChecked ? "pointer" : "not-allowed",
          }}
        >
          {completing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          Complete Step →
        </button>
        {!allChecked && (
          <p className="text-xs text-center" style={{ color: "#3A3A5A" }}>
            Check all instructions to continue
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Main Workspace ──────────────────────────────────── */

export default function Workspace() {
  const [, params] = useRoute("/workspace/:projectId");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const projectId = params?.projectId ?? "";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Workspace state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [ideCode, setIdeCode] = useState("");
  const [highlightLines, setHighlightLines] = useState<number[]>([]);
  const [accumulatedLibraries, setAccumulatedLibraries] = useState<LibraryType[]>([]);
  const [instructionChecks, setInstructionChecks] = useState<Record<string, boolean[]>>({});
  const [completingStep, setCompletingStep] = useState(false);

  // AI explain-this bridge
  const [explainMessage, setExplainMessage] = useState<string | undefined>(undefined);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  // Panel widths (left panel only — AI manages its own height)
  const [leftWidth, setLeftWidth] = useState(320);
  const draggingV = useRef(false);

  // Save status
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step panel scroll ref
  const stepsEndRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  /* ── Load project ─────────────────────────── */

  useEffect(() => {
    if (!projectId || !user) return;
    const load = async () => {
      try {
        const res = await authFetch(`/api/projects/workspace/${projectId}`);
        if (!res.ok) { navigate("/projects"); return; }
        const { project: p } = await res.json() as { project: Project };
        setProject(p);
        setTitleValue(p.title);

        // Restore state
        const done = new Set<number>(p.completed_steps ?? []);
        setCompletedSteps(done);
        setCurrentStep(p.current_step ?? 1);
        setIdeCode(p.ide_code ?? "");
        setInstructionChecks(p.instruction_checks ?? {});

        // Restore accumulated libraries
        if (p.build_plan?.buildPlan?.steps) {
          const libs: LibraryType[] = [];
          for (const step of p.build_plan.buildPlan.steps) {
            if (done.has(step.stepNumber)) {
              for (const lib of step.libraries ?? []) {
                if (!libs.find((l) => l.name === lib.name)) {
                  libs.push({ ...lib, isNew: false });
                }
              }
            }
          }
          setAccumulatedLibraries(libs);
        }
      } catch {
        navigate("/projects");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, user, navigate]);

  /* ── Auto-save IDE code ───────────────────── */

  const saveCode = useCallback(async (code: string) => {
    setSaveStatus("saving");
    try {
      await authFetch("/api/projects/save-ide-code", {
        method: "POST",
        body: JSON.stringify({ projectId, code }),
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }, [projectId]);

  const handleCodeChange = useCallback((code: string) => {
    setIdeCode(code);
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveCode(code), 30000);
  }, [saveCode]);

  /* ── Instruction checks ───────────────────── */

  const handleToggleCheck = (stepNumber: number, i: number) => {
    setInstructionChecks((prev) => {
      const key = String(stepNumber);
      const arr = [...(prev[key] ?? [])];
      arr[i] = !arr[i];
      return { ...prev, [key]: arr };
    });
  };

  /* ── Complete step ────────────────────────── */

  const handleCompleteStep = async (step: BuildStep) => {
    setCompletingStep(true);
    try {
      // Push code to IDE
      const newCode = step.code.content;
      setIdeCode(newCode);
      setHighlightLines(step.code.highlightLines ?? []);
      setTimeout(() => setHighlightLines([]), 3600);

      // Update libraries
      const newLibs = step.libraries?.filter((l) => l.isNew) ?? [];
      setAccumulatedLibraries((prev) => {
        const merged = [...prev];
        for (const lib of newLibs) {
          if (!merged.find((l) => l.name === lib.name)) {
            merged.push({ ...lib, isNew: true });
          }
        }
        // reset isNew for old ones
        return merged.map((l) =>
          newLibs.find((n) => n.name === l.name) ? { ...l, isNew: true } : { ...l, isNew: false }
        );
      });

      // Save code immediately
      await saveCode(newCode);

      // Update Supabase
      const checks = instructionChecks;
      const res = await authFetch("/api/projects/complete-step", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          stepNumber: step.stepNumber,
          instructionChecks: checks,
        }),
      });
      const data = await res.json() as { success: boolean; nextStep: number | null };

      // Update local state
      setCompletedSteps((prev) => new Set([...prev, step.stepNumber]));
      if (data.nextStep) {
        setCurrentStep(data.nextStep);
        // Scroll to next step
        setTimeout(() => {
          stepRefs.current[data.nextStep!]?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }

      toast({
        title: `✓ Step ${step.stepNumber} complete — code updated in IDE`,
        description: newLibs.length > 0 ? `${newLibs.length} new librar${newLibs.length === 1 ? "y" : "ies"} added` : undefined,
      });
    } catch {
      toast({ title: "Failed to complete step", variant: "destructive" });
    } finally {
      setCompletingStep(false);
    }
  };

  /* ── Resize handles ───────────────────────── */

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingV.current) {
        const newW = Math.max(240, Math.min(500, e.clientX));
        setLeftWidth(newW);
      }
    };
    const onMouseUp = () => {
      draggingV.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  /* ── Loading / not found ──────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#6C63FF" }} />
      </div>
    );
  }

  if (!project) return null;

  const buildPlan = project.build_plan?.buildPlan;
  const steps = buildPlan?.steps ?? [];
  const totalSteps = buildPlan?.totalSteps ?? steps.length;
  const completedCount = completedSteps.size;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const activeStep = steps.find((s) => s.stepNumber === currentStep);
  const platform = buildPlan?.platform ?? "ESP32";
  const filename = activeStep?.code?.filename ?? "main.ino";

  const getStepChecks = (stepNumber: number, instructionCount: number): boolean[] => {
    const key = String(stepNumber);
    const saved = instructionChecks[key];
    if (saved && saved.length === instructionCount) return saved;
    return new Array(instructionCount).fill(false);
  };

  return (
    <div className="flex flex-col" style={{ height: "100vh", background: "#0A0A0F", overflow: "hidden" }}>
      {/* ── Top Bar ── */}
      <div
        className="flex items-center px-4 gap-4 flex-shrink-0"
        style={{ height: 52, background: "#0D0D14", borderBottom: "1px solid #2A2A3E", zIndex: 10 }}
      >
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-1.5 text-sm transition-colors flex-shrink-0"
          style={{ color: "#5A5A7A" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0FF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#5A5A7A")}
        >
          <ArrowLeft className="w-4 h-4" /> Projects
        </button>

        <div className="flex-1 flex items-center justify-center">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                className="bg-transparent text-center text-sm font-semibold outline-none border-b"
                style={{ color: "#F0F0FF", borderColor: "#6C63FF", minWidth: 200 }}
              />
              <Save className="w-3.5 h-3.5" style={{ color: "#6C63FF" }} />
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-1.5 group"
            >
              <span className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>
                {titleValue}
              </span>
              <Edit2
                className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "#5A5A7A" }}
              />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {saveStatus === "saving" ? (
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#9090B0" }} />
            ) : (
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: saveStatus === "saved" ? "#00C896" : "#FFB84D" }}
              />
            )}
            <span className="text-xs" style={{ color: "#5A5A7A" }}>
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Unsaved"}
            </span>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([ideCode], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${titleValue.replace(/\s+/g, "_")}.zip`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ color: "#9090B0", borderColor: "#2A2A3E", background: "transparent" }}
          >
            Export Project
          </button>
        </div>
      </div>

      {/* ── Main panels ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Steps panel ── */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: leftWidth, borderRight: "1px solid #2A2A3E" }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid #2A2A3E" }}>
            <h2 className="font-bold text-sm text-foreground mb-2">Build Plan</h2>
            <div className="w-full rounded-full overflow-hidden" style={{ background: "#1A1A2E", height: 4 }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: "#6C63FF" }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "#5A5A7A" }}>
              {completedCount} of {totalSteps} steps complete
            </p>
          </div>

          {/* Steps */}
          <div className="flex-1 overflow-y-auto">
            {steps.map((step) => {
              const state =
                completedSteps.has(step.stepNumber)
                  ? "completed"
                  : step.stepNumber === currentStep
                  ? "active"
                  : "locked";
              const checks = getStepChecks(step.stepNumber, step.instructions.length);
              return (
                <div
                  key={step.stepNumber}
                  ref={(el) => { stepRefs.current[step.stepNumber] = el; }}
                >
                  <StepCard
                    step={step}
                    state={state}
                    checks={checks}
                    onToggleCheck={(i) => handleToggleCheck(step.stepNumber, i)}
                    onComplete={() => handleCompleteStep(step)}
                    completing={completingStep}
                  />
                </div>
              );
            })}
            <div ref={stepsEndRef} />
          </div>

          {/* Summary footer */}
          <div
            className="p-3 flex-shrink-0 space-y-1"
            style={{ borderTop: "1px solid #2A2A3E", background: "#0D0D14" }}
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6C63FF" }} />
              <span className="text-xs" style={{ color: "#7070A0" }}>
                Platform: <span style={{ color: "#F0F0FF" }}>{platform}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Library className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00D4FF" }} />
              <span className="text-xs" style={{ color: "#7070A0" }}>
                Libraries: <span style={{ color: "#F0F0FF" }}>{accumulatedLibraries.length}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00C896" }} />
              <span className="text-xs" style={{ color: "#7070A0" }}>
                Est. time:{" "}
                <span style={{ color: "#F0F0FF" }}>{buildPlan?.estimatedTotalTime ?? "—"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Vertical resize handle ── */}
        <div
          className="panel-resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            draggingV.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        />

        {/* ── RIGHT: IDE + AI ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* IDE panel */}
          <div className="flex-1 overflow-hidden">
            <NexoraIDE
              code={ideCode}
              filename={filename}
              platform={`${platform} · ${buildPlan?.programmingLanguage ?? "C++ Arduino"}`}
              highlightLines={highlightLines}
              libraries={accumulatedLibraries}
              onCodeChange={handleCodeChange}
              onExplainCode={(selected) => {
                setExplainMessage(selected);
              }}
            />
          </div>

          {/* AI Assistant panel */}
          {project && (
            <AIAssistant
              project={project}
              currentStep={currentStep}
              ideCode={ideCode}
              libraryNames={accumulatedLibraries.map((l) => l.name)}
              completedSteps={Array.from(completedSteps)}
              userName={user?.user_metadata?.full_name ?? user?.email ?? ""}
              onPushCode={(code, mode) => {
                if (mode === "replace") {
                  setIdeCode(code);
                  setHighlightLines(
                    code.split("\n").map((_, i) => i + 1)
                  );
                  setTimeout(() => setHighlightLines([]), 3600);
                } else {
                  // Insert at end for "insert at cursor" (Monaco cursor not accessible here)
                  setIdeCode((prev) => prev + "\n" + code);
                }
                setSaveStatus("unsaved");
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                saveTimerRef.current = setTimeout(() => saveCode(ideCode + "\n" + code), 30000);
                toast({ title: "Code pushed to IDE" });
              }}
              externalMessage={explainMessage}
              onExternalMessageHandled={() => setExplainMessage(undefined)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
