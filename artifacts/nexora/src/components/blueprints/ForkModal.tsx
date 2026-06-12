import { useState } from "react";
import { X, Loader2, GitFork, Cpu, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Blueprint } from "./BlueprintCard";

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function ForkModal({
  blueprint,
  onClose,
}: {
  blueprint: Blueprint;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const firstName = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "My";
  const [projectName, setProjectName] = useState(`${blueprint.title} — ${firstName}'s version`);
  const [adaptToInventory, setAdaptToInventory] = useState(true);
  const [skillLevel, setSkillLevel] = useState(profile?.role === "professional" ? "Advanced" : profile?.role === "maker" ? "Intermediate" : "Beginner");
  const [loading, setLoading] = useState(false);

  const handleFork = async () => {
    if (!user) {
      setLocation(`/signup?blueprint=${blueprint.id}`);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/blueprints/fork", {
        method: "POST",
        body: JSON.stringify({ blueprintId: blueprint.id, projectName, adaptToInventory, skillLevel }),
      });
      const data = await res.json() as { projectId?: string; error?: string };
      if (!data.projectId) throw new Error(data.error ?? "Fork failed");
      toast({ title: "✓ Blueprint forked! Your customized project is ready to build." });
      setLocation(`/workspace/${data.projectId}`);
    } catch (err) {
      toast({ title: "Fork failed. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ background: "#0D0D14", borderColor: "#2A2A3E" }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: "#2A2A3E" }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "#F0F0FF" }}>
              <GitFork className="w-5 h-5" style={{ color: "#6C63FF" }} />
              Fork Blueprint
            </h2>
            <p className="text-sm mt-0.5 font-medium" style={{ color: "#6C63FF" }}>{blueprint.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "#9090B0" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(90,90,122,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-5">
          {/* Project name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#C0C0D0" }}>Project Name</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all"
              style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
              onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
              onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")}
            />
          </div>

          {/* Adapt toggle */}
          <div
            className="p-4 rounded-xl border flex items-start justify-between gap-4 cursor-pointer transition-all"
            style={{ borderColor: adaptToInventory ? "#6C63FF" : "#2A2A3E", background: adaptToInventory ? "rgba(108,99,255,0.06)" : "#0A0A0F" }}
            onClick={() => setAdaptToInventory((v) => !v)}
          >
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: "#F0F0FF" }}>
                <Wand2 className="w-4 h-4" style={{ color: "#6C63FF" }} />
                Customize for my components
              </p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#9090B0" }}>
                Nexora will adapt this blueprint to match your component inventory
              </p>
            </div>
            <div
              className="w-10 h-6 rounded-full flex-shrink-0 transition-all mt-0.5"
              style={{ background: adaptToInventory ? "#6C63FF" : "#2A2A3E", position: "relative" }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full transition-all"
                style={{ background: "#fff", left: adaptToInventory ? "calc(100% - 20px)" : "4px" }}
              />
            </div>
          </div>

          {/* Skill level */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#C0C0D0" }}>
              <Cpu className="w-3.5 h-3.5 inline mr-1.5" style={{ color: "#6C63FF" }} />
              Your Skill Level
            </label>
            <div className="flex gap-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setSkillLevel(level)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium border transition-all"
                  style={{
                    background: skillLevel === level ? "#6C63FF" : "#0A0A0F",
                    borderColor: skillLevel === level ? "#6C63FF" : "#2A2A3E",
                    color: skillLevel === level ? "#fff" : "#9090B0",
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Stats preview */}
          <div className="p-3 rounded-xl flex items-center gap-4 flex-wrap"
            style={{ background: "#0A0A0F", border: "1px solid #2A2A3E" }}>
            <span className="text-[11px]" style={{ color: "#9090B0" }}>
              ⏱ {blueprint.estimated_time}
            </span>
            <span className="text-[11px]" style={{ color: "#9090B0" }}>
              💰 ₹{blueprint.estimated_cost_min}–₹{blueprint.estimated_cost_max}
            </span>
            <span className="text-[11px]" style={{ color: "#9090B0" }}>
              {blueprint.components?.list?.length ?? 0} components
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={handleFork}
            disabled={loading || !projectName}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{ background: "#6C63FF", color: "#fff", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Forking & customizing...</> : <><GitFork className="w-4 h-4" /> Start Building</>}
          </button>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all"
            style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#6C63FF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#9090B0"; }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
