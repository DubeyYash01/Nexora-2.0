import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Code2, Plus, ArrowRight, UploadCloud, X, Loader2,
  Clock, CheckCircle2, Circle, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import { DashboardLayout } from "@/pages/dashboard";

interface Project {
  id: string;
  title: string;
  status: string;
  current_step: number;
  updated_at: string;
  build_plan: { buildPlan?: { totalSteps: number; platform?: string } } | null;
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "in_progress") {
    return (
      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
        style={{ background: "rgba(0,212,255,0.1)", color: "#00D4FF" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
        In Progress
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
        style={{ background: "rgba(0,200,150,0.1)", color: "#00C896" }}>
        <CheckCircle2 className="w-3 h-3" />Completed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: "#1A1A2E", color: "#9090B0" }}>
      <Circle className="w-3 h-3" />Draft
    </span>
  );
}

function ImportModal({
  projects,
  onClose,
}: {
  projects: Project[];
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [lang, setLang] = useState<"C++ Arduino" | "MicroPython" | "C">("C++ Arduino");
  const [linkedProject, setLinkedProject] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCode(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  const handleOpen = async () => {
    if (!code.trim()) return;
    setSaving(true);
    try {
      if (linkedProject) {
        await authFetch("/api/projects/save-ide-code", {
          method: "POST",
          body: JSON.stringify({ projectId: linkedProject, code }),
        });
        setLocation(`/workspace/${linkedProject}?panel=ide`);
      } else {
        sessionStorage.setItem("importedCode", code);
        sessionStorage.setItem("importedLang", lang);
        setLocation("/ide");
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedProjectName = projects.find((p) => p.id === linkedProject)?.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border overflow-hidden"
        style={{ background: "#0D0D14", borderColor: "#2A2A3E" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#2A2A3E" }}>
          <h2 className="font-bold text-foreground">Import Code</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "#9090B0" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Paste your code:</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={10}
              className="w-full rounded-lg p-4 text-sm resize-vertical outline-none transition-colors"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                background: "#0A0A0F",
                border: `1px solid ${code ? "#6C63FF" : "#2A2A3E"}`,
                color: "#E0E0FF",
                minHeight: 280,
              }}
              placeholder={`// Paste your Arduino or ESP32 code here...\n\n#include <Arduino.h>\n\nvoid setup() {\n  // Your setup code\n}\n\nvoid loop() {\n  // Your loop code\n}`}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs mt-1.5 transition-colors"
              style={{ color: "#5A5A7A" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#9090B0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#5A5A7A")}
            >
              Or upload a file (.ino, .cpp, .py)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ino,.cpp,.c,.py"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Language:</label>
            <div className="flex gap-2">
              {(["C++ Arduino", "MicroPython", "C"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: lang === l ? "#6C63FF" : "#1A1A2E",
                    color: lang === l ? "#fff" : "#9090B0",
                    border: `1px solid ${lang === l ? "#6C63FF" : "#2A2A3E"}`,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Link to project <span style={{ color: "#5A5A7A" }}>(optional)</span>:
            </label>
            <select
              value={linkedProject}
              onChange={(e) => setLinkedProject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "#0A0A0F", border: "1px solid #2A2A3E", color: "#F0F0FF" }}
            >
              <option value="">— Open without linking —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            {selectedProjectName && (
              <p className="text-xs mt-1.5" style={{ color: "#9090B0" }}>
                Code will be loaded into <strong style={{ color: "#F0F0FF" }}>{selectedProjectName}</strong>'s IDE
              </p>
            )}
          </div>

          <button
            onClick={handleOpen}
            disabled={!code.trim() || saving}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#6C63FF", color: "#fff" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Code2 className="w-4 h-4" />Open in IDE</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IDEPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch("/api/projects")
      .then((r) => r.json())
      .then((data: { projects?: Project[] }) => {
        const sorted = (data.projects ?? []).sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setProjects(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <DashboardLayout title="IDE">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">IDE</h2>
            <p className="text-muted-foreground mt-1">Open a project to continue building</p>
          </div>
          <button
            onClick={() => setLocation("/projects/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{ background: "#6C63FF", color: "#fff" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#5A52E0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#6C63FF")}
          >
            <Plus className="w-4 h-4" />New Project
          </button>
        </div>

        {/* Project list or empty state */}
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Your Projects</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Pick up where you left off</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#6C63FF" }} />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Code2 className="w-16 h-16 mb-4" style={{ color: "#6C63FF", opacity: 0.4 }} />
              <h4 className="text-lg font-semibold text-foreground mt-4">No projects yet</h4>
              <p className="mt-2 max-w-xs" style={{ color: "#9090B0" }}>
                Create your first IoT project and the IDE will be ready for you here.
              </p>
              <button
                onClick={() => setLocation("/projects/new")}
                className="mt-6 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: "#6C63FF", color: "#fff" }}
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const totalSteps = project.build_plan?.buildPlan?.totalSteps ?? 6;
                const progress = Math.min((project.current_step / totalSteps) * 100, 100);
                const platform = project.build_plan?.buildPlan?.platform;

                return (
                  <div
                    key={project.id}
                    className="flex items-center gap-4 p-5 rounded-xl border transition-all duration-200"
                    style={{ background: "#12121A", borderColor: "#2A2A3E" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
                  >
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate" style={{ color: "#F0F0FF", fontSize: 16 }}>
                        {project.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <StatusBadge status={project.status} />
                        <span className="text-xs flex items-center gap-1" style={{ color: "#5A5A7A" }}>
                          <Clock className="w-3 h-3" />Last updated {relativeTime(project.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Middle */}
                    <div className="w-40 flex-shrink-0 hidden sm:block">
                      {project.build_plan && (
                        <div className="mb-1.5">
                          <span className="text-xs" style={{ color: "#9090B0" }}>
                            Step {project.current_step} of {totalSteps}
                          </span>
                          <div className="w-full rounded-full mt-1" style={{ background: "#2A2A3E", height: 3 }}>
                            <div className="rounded-full h-[3px] transition-all"
                              style={{ width: `${progress}%`, background: "#6C63FF" }} />
                          </div>
                        </div>
                      )}
                      {platform && (
                        <span className="text-[10px] px-2 py-0.5 rounded"
                          style={{ background: "#1A1A2E", color: "#9090B0", border: "1px solid #2A2A3E" }}>
                          {platform}
                        </span>
                      )}
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setLocation(`/workspace/${project.id}?panel=ide`)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{ background: "#6C63FF", color: "#fff" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#5A52E0")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#6C63FF")}
                      >
                        <Code2 className="w-3.5 h-3.5" />Open in IDE
                      </button>
                      <button
                        onClick={() => setLocation(`/workspace/${project.id}`)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border transition-all"
                        style={{ background: "transparent", color: "#9090B0", borderColor: "#2A2A3E" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#F0F0FF"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#9090B0"; }}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Import External Code */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Import External Code</h3>
          <p className="text-sm text-muted-foreground mb-4">Paste existing code and get AI assistance</p>
          <div
            onClick={() => setImportOpen(true)}
            className="flex flex-col items-center justify-center p-8 rounded-xl border-dashed border cursor-pointer transition-all text-center"
            style={{ background: "#12121A", borderColor: "#2A2A3E" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
          >
            <UploadCloud className="w-12 h-12 mb-3" style={{ color: "#6C63FF", opacity: 0.7 }} />
            <h4 className="font-semibold text-foreground mt-1">Import Your Code</h4>
            <p className="text-sm mt-1" style={{ color: "#9090B0" }}>
              Paste Arduino, ESP32, or MicroPython code
            </p>
            <p className="text-xs mt-2" style={{ color: "#5A5A7A" }}>.ino · .cpp · .py</p>
          </div>
        </div>

      </div>

      {importOpen && (
        <ImportModal projects={projects} onClose={() => setImportOpen(false)} />
      )}
    </DashboardLayout>
  );
}
