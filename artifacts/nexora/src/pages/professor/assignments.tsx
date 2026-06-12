import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import ProfessorLayout from "@/components/professor/ProfessorLayout";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Plus, ClipboardList, Loader2, X, ChevronRight,
  ChevronLeft, Trash2, Check,
} from "lucide-react";

interface Class { id: string; name: string; subject: string }
interface Assignment {
  id: string; title: string; status: string; deadline?: string;
  submission_count: number; created_at: string;
  classes?: { name: string; subject: string };
}

const PHASES = ["Setup & Planning","Circuit Wiring","Code Development","Testing & Debugging","Final Integration","Documentation"];

const DEFAULT_RUBRIC = [
  { criteria: "Project Complexity", maxPoints: 20 },
  { criteria: "Code Quality", maxPoints: 25 },
  { criteria: "Documentation", maxPoints: 20 },
  { criteria: "Functionality", maxPoints: 25 },
  { criteria: "Presentation", maxPoints: 10 },
];

function CreateAssignmentModal({ open, onClose, classes, onCreated }: {
  open: boolean; onClose: () => void; classes: Class[];
  onCreated: (a: Assignment) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    classId: "", title: "", description: "", deadline: "", maxGroupSize: 3,
    objectives: [] as string[], objInput: "",
    allowAnyComponents: true, selectedComponents: [] as string[], compInput: "",
    requiredPhases: [] as string[],
    useRubric: true, rubric: DEFAULT_RUBRIC.map((r) => ({ ...r })),
    status: "active" as "active" | "draft",
  });

  if (!open) return null;

  const totalPoints = form.rubric.reduce((s, r) => s + (r.maxPoints || 0), 0);

  const addObj = () => {
    if (!form.objInput.trim()) return;
    setForm((f) => ({ ...f, objectives: [...f.objectives, f.objInput.trim()], objInput: "" }));
  };

  const addComp = () => {
    if (!form.compInput.trim()) return;
    setForm((f) => ({ ...f, selectedComponents: [...f.selectedComponents, f.compInput.trim()], compInput: "" }));
  };

  const togglePhase = (p: string) => {
    setForm((f) => ({
      ...f,
      requiredPhases: f.requiredPhases.includes(p)
        ? f.requiredPhases.filter((x) => x !== p)
        : [...f.requiredPhases, p],
    }));
  };

  const handlePublish = async (status: "active" | "draft") => {
    if (!form.classId || !form.title || !form.description) {
      toast({ title: "Missing fields", description: "Class, title and description are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/assignments/create", {
        method: "POST",
        body: JSON.stringify({
          classId: form.classId, title: form.title, description: form.description,
          objectives: form.objectives, deadline: form.deadline || null,
          maxGroupSize: form.maxGroupSize, allowAnyComponents: form.allowAnyComponents,
          allowedComponents: form.allowAnyComponents ? null : { list: form.selectedComponents },
          requiredPhases: form.requiredPhases,
          gradingCriteria: form.useRubric ? form.rubric : null,
          status,
        }),
      });
      if (!res.ok) throw new Error();
      const { assignment } = await res.json();
      toast({ title: status === "active" ? "Assignment published!" : "Saved as draft" });
      onCreated(assignment);
      onClose();
      setStep(1);
    } catch {
      toast({ title: "Failed", description: "Could not create assignment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-xl rounded-2xl border overflow-hidden"
        style={{ background: "#12121A", borderColor: "#2A2A3E", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#2A2A3E" }}>
          <div>
            <h2 className="font-semibold text-foreground">Create Assignment</h2>
            <p className="text-xs text-muted-foreground">Step {step} of 3</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Progress */}
        <div className="flex px-6 pt-3 gap-2">
          {[1,2,3].map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full" style={{
              background: s <= step ? "#6C63FF" : "#2A2A3E",
            }} />
          ))}
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: "65vh" }}>
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Select Class *</label>
                <select
                  className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground"
                  style={{ borderColor: "#2A2A3E" }}
                  value={form.classId}
                  onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                >
                  <option value="">Choose a class...</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Assignment Title *</label>
                <input
                  className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground"
                  style={{ borderColor: "#2A2A3E" }}
                  placeholder="Smart Home Automation Project"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description *</label>
                <textarea
                  className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground resize-none"
                  style={{ borderColor: "#2A2A3E" }}
                  rows={3}
                  maxLength={500}
                  placeholder="Describe what students should build..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground text-right">{form.description.length}/500</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Learning Objectives</label>
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg border text-sm bg-background text-foreground"
                    style={{ borderColor: "#2A2A3E" }}
                    placeholder="Add objective and press Enter"
                    value={form.objInput}
                    onChange={(e) => setForm((f) => ({ ...f, objInput: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addObj()}
                  />
                  <button onClick={addObj} className="px-3 py-2 rounded-lg text-sm" style={{ background: "#6C63FF", color: "#fff" }}>Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.objectives.map((o, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}>
                      {o}
                      <button onClick={() => setForm((f) => ({ ...f, objectives: f.objectives.filter((_, j) => j !== i) }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Deadline *</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground"
                    style={{ borderColor: "#2A2A3E" }}
                    value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Max Group Size</label>
                  <input
                    type="number" min={1} max={6}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground"
                    style={{ borderColor: "#2A2A3E" }}
                    value={form.maxGroupSize}
                    onChange={(e) => setForm((f) => ({ ...f, maxGroupSize: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Allowed Components</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setForm((f) => ({ ...f, allowAnyComponents: !f.allowAnyComponents }))}
                      className="w-10 h-5 rounded-full relative transition-all"
                      style={{ background: form.allowAnyComponents ? "#6C63FF" : "#2A2A3E" }}
                    >
                      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all" style={{ left: form.allowAnyComponents ? "22px" : "2px" }} />
                    </div>
                    <span className="text-sm text-foreground">Allow any components</span>
                  </label>
                </div>
                {!form.allowAnyComponents && (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        className="flex-1 px-3 py-2 rounded-lg border text-sm bg-background text-foreground"
                        style={{ borderColor: "#2A2A3E" }}
                        placeholder="e.g. ESP32, DHT22 sensor..."
                        value={form.compInput}
                        onChange={(e) => setForm((f) => ({ ...f, compInput: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addComp()}
                      />
                      <button onClick={addComp} className="px-3 py-2 rounded-lg text-sm" style={{ background: "#6C63FF", color: "#fff" }}>Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.selectedComponents.map((c, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(0,212,255,0.08)", color: "#00D4FF" }}>
                          {c}
                          <button onClick={() => setForm((f) => ({ ...f, selectedComponents: f.selectedComponents.filter((_, j) => j !== i) }))}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Required Build Phases</label>
                <div className="space-y-2">
                  {PHASES.map((p) => (
                    <label key={p} className="flex items-center gap-2.5 cursor-pointer">
                      <div
                        onClick={() => togglePhase(p)}
                        className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                        style={{
                          background: form.requiredPhases.includes(p) ? "#6C63FF" : "transparent",
                          borderColor: form.requiredPhases.includes(p) ? "#6C63FF" : "#3A3A5A",
                        }}
                      >
                        {form.requiredPhases.includes(p) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-foreground">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm((f) => ({ ...f, useRubric: !f.useRubric }))}
                  className="w-10 h-5 rounded-full relative transition-all"
                  style={{ background: form.useRubric ? "#6C63FF" : "#2A2A3E" }}
                >
                  <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all" style={{ left: form.useRubric ? "22px" : "2px" }} />
                </div>
                <span className="text-sm font-medium text-foreground">Use structured grading rubric</span>
              </label>

              {form.useRubric ? (
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2A2A3E" }}>
                        <th className="text-left py-2 text-xs text-muted-foreground">Criteria</th>
                        <th className="text-right py-2 text-xs text-muted-foreground">Max Points</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.rubric.map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #1A1A2A" }}>
                          <td className="py-2 pr-2">
                            <input
                              className="w-full px-2 py-1.5 rounded bg-background text-sm text-foreground border"
                              style={{ borderColor: "#2A2A3E" }}
                              value={row.criteria}
                              onChange={(e) => setForm((f) => ({ ...f, rubric: f.rubric.map((r, j) => j === i ? { ...r, criteria: e.target.value } : r) }))}
                            />
                          </td>
                          <td className="py-2 pl-2">
                            <input
                              type="number" min={0} max={100}
                              className="w-full px-2 py-1.5 rounded bg-background text-sm text-foreground border text-right"
                              style={{ borderColor: "#2A2A3E" }}
                              value={row.maxPoints}
                              onChange={(e) => setForm((f) => ({ ...f, rubric: f.rubric.map((r, j) => j === i ? { ...r, maxPoints: parseInt(e.target.value) || 0 } : r) }))}
                            />
                          </td>
                          <td className="py-2 pl-1">
                            <button onClick={() => setForm((f) => ({ ...f, rubric: f.rubric.filter((_, j) => j !== i) }))} style={{ color: "#5A5A7A" }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={() => setForm((f) => ({ ...f, rubric: [...f.rubric, { criteria: "New Criteria", maxPoints: 10 }] }))}
                      className="text-xs"
                      style={{ color: "#6C63FF" }}
                    >
                      + Add Criteria
                    </button>
                    <span className="text-sm font-semibold" style={{ color: totalPoints === 100 ? "#00C896" : "#FFB84D" }}>
                      Total: {totalPoints} points
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-lg p-4"
                  style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)" }}
                >
                  <p className="text-sm text-muted-foreground">
                    You can give qualitative feedback without a point system
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: "#2A2A3E" }}>
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            {step > 1 ? "Back" : "Cancel"}
          </button>
          <div className="flex gap-2">
            {step === 3 && (
              <button
                onClick={() => handlePublish("draft")}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
              >
                Save Draft
              </button>
            )}
            <button
              onClick={() => step < 3 ? setStep(s => s + 1) : handlePublish("active")}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
              style={{ background: "#6C63FF", color: "#fff" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {step < 3 ? <>Next <ChevronRight className="w-4 h-4" /></> : "Publish Assignment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfessorAssignments() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      authFetch(`/api/assignments/professor/${user.id}`).then(r => r.json()),
      authFetch(`/api/classes/professor/${user.id}`).then(r => r.json()),
    ]).then(([aData, cData]) => {
      setAssignments(aData.assignments ?? []);
      setClasses(cData.classes ?? []);
    }).finally(() => setLoading(false));
  }, [user]);

  const deleteAssignment = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    await authFetch(`/api/assignments/${id}`, { method: "DELETE" });
    setAssignments(a => a.filter(x => x.id !== id));
    toast({ title: "Assignment deleted" });
  };

  const deadlineColor = (d?: string) => {
    if (!d) return "#6A6A8A";
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    if (diff < 0) return "#FF5A5A";
    if (diff <= 3) return "#FFB84D";
    return "#00C896";
  };

  const filtered = filterStatus === "All" ? assignments : assignments.filter(a => a.status === filterStatus.toLowerCase());

  return (
    <ProfessorLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Assignments</h1>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: "#6C63FF", color: "#fff" }}
          >
            <Plus className="w-4 h-4" /> Create Assignment
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex gap-2">
          {["All", "Active", "Draft", "Closed"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: filterStatus === s ? "#6C63FF" : "rgba(42,42,62,0.5)",
                color: filterStatus === s ? "#fff" : "#6A6A8A",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border p-12 text-center" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
            <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: "#3A3A5A" }} />
            <p className="text-foreground font-medium mb-1">No assignments yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first assignment to get started</p>
            <button onClick={() => setModalOpen(true)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: "#6C63FF", color: "#fff" }}>
              + Create Assignment
            </button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2A2A3E" }}>
                  {["Assignment / Class","Created","Deadline","Submissions","Status",""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#5A5A7A" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: "#1A1A2A" }}>
                    <td className="px-4 py-3">
                      <button className="font-medium text-foreground hover:text-primary text-left" onClick={() => navigate(`/professor/submissions/${a.id}`)}>
                        {a.title}
                      </button>
                      <p className="text-xs text-muted-foreground">{a.classes?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: deadlineColor(a.deadline) }}>
                        {a.deadline ? new Date(a.deadline).toLocaleDateString("en-IN",{month:"short",day:"numeric",year:"numeric"}) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{a.submission_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        background: a.status === "active" ? "rgba(0,200,150,0.1)" : a.status === "draft" ? "rgba(255,184,77,0.1)" : "rgba(90,90,120,0.2)",
                        color: a.status === "active" ? "#00C896" : a.status === "draft" ? "#FFB84D" : "#6A6A8A",
                      }}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/professor/submissions/${a.id}`)}
                        className="text-xs px-2.5 py-1.5 rounded font-medium"
                        style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}
                      >
                        View Submissions
                      </button>
                      <button onClick={() => deleteAssignment(a.id)} className="p-1.5 rounded hover:bg-white/5" style={{ color: "#5A5A7A" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateAssignmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        classes={classes}
        onCreated={a => setAssignments(x => [a, ...x])}
      />
    </ProfessorLayout>
  );
}
