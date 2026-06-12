import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { authFetch } from "@/lib/supabase";
import ProfessorLayout from "@/components/professor/ProfessorLayout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Download, Copy, Sparkles, CheckCircle, XCircle } from "lucide-react";
import Editor from "@monaco-editor/react";

interface Submission {
  id: string; student_id: string; status: string; submitted_at?: string; grade?: string;
  professor_feedback?: string; build_steps_completed?: number; total_build_steps?: number;
  ai_assistance_log?: { totalMessages?: number; messagesLog?: { role: string; content: string; timestamp: string }[] };
  component_list?: { list?: { name: string; type: string; purpose: string; estimatedCost?: number; owned?: boolean }[] };
  profiles?: { id: string; full_name: string; email: string; avatar_url?: string };
  projects?: { title: string; description: string; ide_code?: string; build_plan?: { buildPlan?: { steps?: { stepNumber: number; title: string; phase: string }[]; platform?: string; programmingLanguage?: string } }; ai_analysis?: { projectSummary?: string; estimatedComplexity?: string }; created_at: string; updated_at: string; completed_steps?: number[] };
  assignments?: { title: string; deadline?: string; grading_criteria?: { criteria: string; maxPoints: number }[]; required_phases?: string[]; professor_id: string };
  aiMessageCount?: number;
  aiMessages?: { role: string; content: string; timestamp: string }[];
}

function Avatar({ name, url, size = 10 }: { name: string; url?: string; size?: number }) {
  const initials = name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  if (url) return <img src={url} className={`w-${size} h-${size} rounded-full object-cover`} alt={name} />;
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-sm font-bold shrink-0`}
      style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF" }}>
      {initials}
    </div>
  );
}

export default function ProfessorReview() {
  const [, params] = useRoute("/professor/review/:submissionId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const submissionId = params?.submissionId ?? "";

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "build" | "code" | "components" | "ai">("overview");

  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    authFetch(`/api/submissions/${submissionId}`)
      .then(r => r.json())
      .then(({ submission: s }) => {
        setSubmission(s ?? null);
        if (s?.grade) setGrade(s.grade);
        if (s?.professor_feedback) setFeedback(s.professor_feedback);
      })
      .finally(() => setLoading(false));
  }, [submissionId]);

  const rubricCriteria = submission?.assignments?.grading_criteria ?? [];
  const earnedTotal = rubricCriteria.reduce((sum, r) => sum + (rubricScores[r.criteria] ?? 0), 0);
  const maxTotal = rubricCriteria.reduce((sum, r) => sum + r.maxPoints, 0);

  const handleSaveGrade = async () => {
    setSaving(true);
    try {
      const finalGrade = rubricCriteria.length > 0 ? `${earnedTotal}/${maxTotal}` : grade;
      const res = await authFetch("/api/submissions/grade", {
        method: "PUT",
        body: JSON.stringify({ submissionId, grade: finalGrade, feedback, rubricScores }),
      });
      if (!res.ok) throw new Error();
      toast({ title: `Grade saved for ${submission?.profiles?.full_name}` });
      setSubmission(s => s ? { ...s, grade: finalGrade, professor_feedback: feedback, status: "graded" } : s);
    } catch {
      toast({ title: "Failed to save grade", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const name = submission?.profiles?.full_name ?? "Unknown";
  const project = submission?.projects;
  const aiMsgs = submission?.aiMessages ?? [];
  const aiCount = submission?.aiMessageCount ?? 0;

  const usageByDay = aiMsgs.reduce<Record<string, number>>((acc, m) => {
    const day = m.timestamp ? new Date(m.timestamp).toLocaleDateString() : "Unknown";
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});
  const maxDay = Math.max(...Object.values(usageByDay), 1);

  return (
    <ProfessorLayout>
      <div className="max-w-6xl space-y-6">
        <button onClick={() => navigate(-1 as unknown as string)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Submissions
        </button>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : !submission ? (
          <p className="text-muted-foreground">Submission not found</p>
        ) : (
          <div className="flex gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <Avatar name={name} url={submission.profiles?.avatar_url} size={12} />
                <div>
                  <h1 className="text-xl font-bold text-foreground">{name}</h1>
                  <p className="text-sm text-muted-foreground">{submission.profiles?.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {submission.submitted_at ? `Submitted ${new Date(submission.submitted_at).toLocaleString()}` : "Not submitted"}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium capitalize" style={{
                    background: submission.status === "graded" ? "rgba(0,200,150,0.1)" : submission.status === "submitted" ? "rgba(108,99,255,0.1)" : "rgba(90,90,120,0.2)",
                    color: submission.status === "graded" ? "#00C896" : submission.status === "submitted" ? "#6C63FF" : "#6A6A8A",
                  }}>
                    {submission.status}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b" style={{ borderColor: "#2A2A3E" }}>
                {(["overview","build","code","components","ai"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-all"
                    style={{
                      borderColor: activeTab === tab ? "#6C63FF" : "transparent",
                      color: activeTab === tab ? "#6C63FF" : "#6A6A8A",
                    }}>
                    {tab === "ai" ? "AI Usage" : tab === "build" ? "Build Plan" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Overview */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="rounded-xl border p-4" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                      <h3 className="font-semibold text-foreground mb-2">{project?.title}</h3>
                      <p className="text-sm text-muted-foreground">{project?.description}</p>
                      <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                        <span>{project?.ai_analysis?.estimatedComplexity}</span>
                        <span>{project?.build_plan?.buildPlan?.platform}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl border p-4" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                      <h3 className="font-semibold text-foreground mb-3">Submission Timeline</h3>
                      <div className="space-y-2 text-sm">
                        {[
                          ["Project started", project?.created_at],
                          ["Last active", project?.updated_at],
                          ["Submitted", submission.submitted_at],
                        ].map(([label, date]) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="text-foreground">{date ? new Date(date).toLocaleDateString() : "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border p-4" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                      <h3 className="font-semibold text-foreground mb-3">Quick Stats</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          ["Steps completed", `${submission.build_steps_completed ?? 0}/${submission.total_build_steps ?? "?"}`],
                          ["AI messages used", aiCount],
                          ["Components", (submission.component_list?.list?.length ?? 0)],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-lg p-2.5" style={{ background: "#0A0A0F" }}>
                            <div className="text-lg font-bold text-foreground">{value}</div>
                            <div className="text-xs text-muted-foreground">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Build Plan */}
              {activeTab === "build" && (
                <div className="space-y-2">
                  {(project?.build_plan?.buildPlan?.steps ?? []).map(step => {
                    const done = (project?.completed_steps ?? []).includes(step.stepNumber);
                    return (
                      <div key={step.stepNumber} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
                        {done
                          ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "#00C896" }} />
                          : <XCircle className="w-4 h-4 shrink-0" style={{ color: "#3A3A5A" }} />}
                        <div>
                          <span className="text-sm font-medium text-foreground">Step {step.stepNumber}: {step.title}</span>
                          <span className="text-xs ml-2 text-muted-foreground">{step.phase}</span>
                        </div>
                      </div>
                    );
                  })}
                  {!project?.build_plan && <p className="text-muted-foreground text-sm">No build plan available</p>}
                </div>
              )}

              {/* Code */}
              {activeTab === "code" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {project?.ide_code ? `${project.ide_code.split("\n").length} lines` : "No code yet"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(project?.ide_code ?? "")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border"
                        style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                      <button
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(new Blob([project?.ide_code ?? ""], { type: "text/plain" }));
                          a.download = "main.ino"; a.click();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border"
                        style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
                      >
                        <Download className="w-3.5 h-3.5" /> Download .ino
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">This is the student's final IDE code at submission</p>
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#2A2A3E", height: 400 }}>
                    <Editor
                      height="400px"
                      language="cpp"
                      value={project?.ide_code ?? "// No code submitted"}
                      options={{ readOnly: true, theme: "vs-dark", fontSize: 13, minimap: { enabled: false } }}
                    />
                  </div>
                </div>
              )}

              {/* Components */}
              {activeTab === "components" && (
                <div className="space-y-3">
                  {(submission.component_list?.list ?? []).map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
                      <div>
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{c.type}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.purpose}</p>
                      </div>
                      <div className="text-right">
                        {c.estimatedCost && <p className="text-sm text-foreground">₹{c.estimatedCost}</p>}
                        {c.owned !== undefined && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: c.owned ? "rgba(0,200,150,0.1)" : "rgba(108,99,255,0.1)", color: c.owned ? "#00C896" : "#6C63FF" }}>
                            {c.owned ? "Owned" : "To buy"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {!submission.component_list?.list?.length && <p className="text-muted-foreground text-sm">No components listed</p>}
                </div>
              )}

              {/* AI Usage */}
              {activeTab === "ai" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">AI Assistance Summary</h3>
                    <p className="text-sm text-muted-foreground">How this student used Nexora AI during the project</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["Total AI Messages", aiCount],
                      ["Error Debugging", aiMsgs.filter(m => m.content?.toLowerCase().includes("error")).length],
                      ["Code Explanations", aiMsgs.filter(m => m.content?.toLowerCase().includes("explain")).length],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border p-3" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                        <div className="flex items-center gap-1.5 mb-1"><Sparkles className="w-4 h-4" style={{ color: "#6C63FF" }} /></div>
                        <div className="text-2xl font-bold text-foreground">{value}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Usage timeline */}
                  {Object.keys(usageByDay).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">AI Usage Per Day</h4>
                      <div className="space-y-2">
                        {Object.entries(usageByDay).map(([day, count]) => (
                          <div key={day} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-24 shrink-0">{day}</span>
                            <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "#1A1A2E" }}>
                              <div className="h-full rounded-md" style={{ width: `${(count / maxDay) * 100}%`, background: "rgba(108,99,255,0.6)" }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl p-4" style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)" }}>
                    <p className="text-sm" style={{ color: "#7AAABB" }}>
                      AI usage shows learning engagement, not academic dishonesty. Students who ask more questions are often more engaged learners.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Grading Panel */}
            <div className="w-72 shrink-0">
              <div className="rounded-xl border sticky top-6" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: "#2A2A3E" }}>
                  <h3 className="font-semibold text-foreground">Grade Submission</h3>
                </div>
                <div className="p-4 space-y-4">
                  {rubricCriteria.length > 0 ? (
                    <div className="space-y-3">
                      {rubricCriteria.map(r => (
                        <div key={r.criteria} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-foreground">{r.criteria}</span>
                            <span className="text-muted-foreground">/{r.maxPoints}</span>
                          </div>
                          <input
                            type="number" min={0} max={r.maxPoints}
                            className="w-full px-2.5 py-1.5 rounded border text-sm bg-background text-foreground"
                            style={{ borderColor: "#2A2A3E" }}
                            value={rubricScores[r.criteria] ?? ""}
                            onChange={e => setRubricScores(s => ({ ...s, [r.criteria]: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      ))}
                      <div className="pt-2 border-t text-sm font-semibold flex justify-between" style={{ borderColor: "#2A2A3E" }}>
                        <span className="text-foreground">Total</span>
                        <span style={{ color: earnedTotal >= maxTotal * 0.9 ? "#00C896" : earnedTotal >= maxTotal * 0.6 ? "#FFB84D" : "#FF5A5A" }}>
                          {earnedTotal} / {maxTotal}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Grade</label>
                      <input
                        className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground"
                        style={{ borderColor: "#2A2A3E" }}
                        placeholder="e.g. A+, 85/100, Excellent"
                        value={grade}
                        onChange={e => setGrade(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Feedback to student</label>
                    <textarea
                      rows={5}
                      className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground resize-none"
                      style={{ borderColor: "#2A2A3E" }}
                      placeholder="Write personalized feedback for this student..."
                      maxLength={500}
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                    />
                    <p className="text-xs text-right text-muted-foreground">{feedback.length}/500</p>
                  </div>

                  <button
                    onClick={handleSaveGrade}
                    disabled={saving}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                    style={{ background: "#6C63FF", color: "#fff" }}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save Grade & Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProfessorLayout>
  );
}
