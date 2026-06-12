import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import { DashboardLayout } from "./dashboard";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, Clock, CheckCircle2, XCircle,
  Loader2, X, Plus, AlertCircle, ArrowRight,
  GraduationCap, Users,
} from "lucide-react";

interface Assignment {
  id: string; title: string; description: string; deadline?: string;
  status: string; required_phases?: string[]; max_group_size?: number;
  objectives?: string[];
  classes?: { name: string; subject: string; profiles?: { full_name: string } };
  submission?: {
    id: string; status: string; grade?: string;
    submitted_at?: string; professor_feedback?: string;
    project_id?: string;
  } | null;
}

function JoinClassModal({ open, onClose, onJoined }: {
  open: boolean; onClose: () => void; onJoined: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  if (!open) return null;

  const handleJoin = async () => {
    if (code.trim().length < 6) { setError("Enter the 6-character class code"); return; }
    setLoading(true); setError("");
    try {
      const res = await authFetch("/api/classes/join", { method: "POST", body: JSON.stringify({ joinCode: code.trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not join class"); return; }
      toast({ title: `Joined ${data.class?.name ?? "class"}!`, description: `You now have access to all assignments.` });
      onJoined();
      onClose();
    } catch {
      setError("Something went wrong, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border p-6 space-y-5" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-lg">Join a Class</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Class Code</label>
          <input
            className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 rounded-xl border bg-background"
            style={{ borderColor: error ? "#FF5A5A" : "#2A2A3E", color: "#6C63FF", letterSpacing: "6px" }}
            placeholder="XXXXXX"
            maxLength={6}
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
          />
          {error && <p className="text-xs mt-1.5" style={{ color: "#FF5A5A" }}>{error}</p>}
          <p className="text-xs text-muted-foreground mt-2">Ask your professor for the 6-character code</p>
        </div>
        <button
          onClick={handleJoin}
          disabled={loading || code.length < 6}
          className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          style={{ background: code.length >= 6 ? "#6C63FF" : "#1A1A2E", color: code.length >= 6 ? "#fff" : "#3A3A5A" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Join Class
        </button>
      </div>
    </div>
  );
}

function StartAssignmentModal({ open, assignment, onClose }: {
  open: boolean; assignment: Assignment | null; onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!open || !assignment) return null;

  const start = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title: assignment.title,
          description: assignment.description,
          idea_input: assignment.description,
          assignment_id: assignment.id,
        }),
      });
      if (!res.ok) throw new Error();
      const { project } = await res.json();
      toast({ title: "Project created!", description: "Starting with assignment context" });
      navigate(`/projects/new?assignmentId=${assignment.id}&projectId=${project.id}`);
    } catch {
      toast({ title: "Failed", description: "Could not create project", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border p-6 space-y-5" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Start Assignment</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)" }}>
          <h3 className="font-semibold text-foreground">{assignment.title}</h3>
          <p className="text-sm text-muted-foreground">{assignment.description}</p>
          {assignment.deadline && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: "#FFB84D" }}>
              <Clock className="w-3 h-3" />
              Due: {new Date(assignment.deadline).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
          {(assignment.required_phases ?? []).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Required phases:</p>
              <div className="flex flex-wrap gap-1">
                {(assignment.required_phases ?? []).map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,212,255,0.08)", color: "#00D4FF" }}>{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          This will create a new project pre-loaded with the assignment brief. The AI will guide you through the required phases.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>Cancel</button>
          <button
            onClick={start}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "#6C63FF", color: "#fff" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Start Project
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmitAssignmentModal({ open, assignment, onClose, onSubmitted }: {
  open: boolean; assignment: Assignment | null; onClose: () => void; onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [confirm, setConfirm] = useState(false);

  if (!open || !assignment || !assignment.submission?.project_id) return null;

  const handleSubmit = async () => {
    if (!confirm) { toast({ title: "Please check the confirmation box", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await authFetch("/api/submissions/submit", {
        method: "POST",
        body: JSON.stringify({
          projectId: assignment.submission!.project_id,
          assignmentId: assignment.id,
          studentId: user?.id,
          studentNote: note,
          videoDemoUrl: videoUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Assignment submitted!", description: "Your work has been sent to the professor." });
      onSubmitted();
      onClose();
    } catch {
      toast({ title: "Submission failed", description: "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border p-6 space-y-5" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Submit Assignment</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="rounded-xl p-4" style={{ background: "rgba(0,200,150,0.05)", border: "1px solid rgba(0,200,150,0.2)" }}>
          <h3 className="font-medium text-foreground">{assignment.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{assignment.classes?.name}</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground block">Note to professor (optional)</label>
          <textarea
            rows={3} maxLength={300}
            className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground resize-none"
            style={{ borderColor: "#2A2A3E" }}
            placeholder="Any notes about your work, challenges faced, etc..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground block">Demo Video URL (optional)</label>
          <input
            className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground"
            style={{ borderColor: "#2A2A3E" }}
            placeholder="https://youtube.com/..."
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
          />
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <div
            onClick={() => setConfirm(!confirm)}
            className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: confirm ? "#6C63FF" : "transparent", borderColor: confirm ? "#6C63FF" : "#3A3A5A" }}
          >
            {confirm && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm text-foreground">
            I confirm this is my original work. This submission is final and will be sent to my professor.
          </span>
        </label>
        <div className="rounded-xl p-3" style={{ background: "rgba(255,184,77,0.06)", border: "1px solid rgba(255,184,77,0.15)" }}>
          <p className="text-xs flex items-center gap-1.5" style={{ color: "#FFB84D" }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Once submitted, your professor will be able to view your project, code, and AI usage.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "#00C896", color: "#fff" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function GradeView({ submission }: { submission: NonNullable<Assignment["submission"]> }) {
  if (submission.status !== "graded" || !submission.grade) return null;
  return (
    <div className="rounded-xl p-4 mt-3" style={{ background: "rgba(0,200,150,0.06)", border: "1px solid rgba(0,200,150,0.25)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: "#00C896" }}>Grade</span>
        <span className="text-2xl font-bold text-foreground">{submission.grade}</span>
      </div>
      {submission.professor_feedback && (
        <p className="text-sm text-muted-foreground border-t pt-2 mt-2" style={{ borderColor: "rgba(0,200,150,0.2)" }}>
          {submission.professor_feedback}
        </p>
      )}
      {submission.submitted_at && (
        <p className="text-xs text-muted-foreground mt-1">Graded on {new Date(submission.submitted_at).toLocaleDateString()}</p>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  submitted: { bg: "rgba(108,99,255,0.1)", color: "#6C63FF" },
  graded: { bg: "rgba(0,200,150,0.1)", color: "#00C896" },
  draft: { bg: "rgba(255,184,77,0.1)", color: "#FFB84D" },
};

export default function StudentAssignments() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [startAssignment, setStartAssignment] = useState<Assignment | null>(null);
  const [submitAssignment, setSubmitAssignment] = useState<Assignment | null>(null);

  const loadAssignments = async () => {
    if (!user) return;
    const res = await authFetch(`/api/assignments/student/${user.id}`);
    if (res.ok) {
      const { assignments: a } = await res.json();
      setAssignments(a ?? []);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadAssignments().finally(() => setLoading(false));
  }, [user]);

  const deadlineStatus = (d?: string) => {
    if (!d) return null;
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    if (diff < 0) return { label: "Overdue", color: "#FF5A5A" };
    if (diff <= 1) return { label: "Due in <24h", color: "#FF5A5A" };
    if (diff <= 3) return { label: `Due in ${Math.ceil(diff)}d`, color: "#FFB84D" };
    return { label: new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" }), color: "#9090B0" };
  };

  const noSub = assignments.filter(a => !a.submission);
  const inProg = assignments.filter(a => a.submission?.status === "draft");
  const submitted = assignments.filter(a => a.submission?.status === "submitted" || a.submission?.status === "graded");

  return (
    <DashboardLayout title="My Assignments">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Assignments</h1>
            <p className="text-muted-foreground text-sm mt-1">Assignments from your enrolled classes</p>
          </div>
          <button
            onClick={() => setJoinOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border"
            style={{ borderColor: "#6C63FF", color: "#6C63FF" }}
          >
            <Plus className="w-4 h-4" /> Join a Class
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border p-16 text-center" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
            <GraduationCap className="w-14 h-14 mx-auto mb-4" style={{ color: "#3A3A5A" }} />
            <h3 className="text-lg font-semibold text-foreground mb-2">No assignments yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Join a class using the code your professor shared to see assignments.
            </p>
            <button
              onClick={() => setJoinOpen(true)}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: "#6C63FF", color: "#fff" }}
            >
              Join Your First Class
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* New assignments */}
            {noSub.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  To Do ({noSub.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {noSub.map(a => {
                    const ds = deadlineStatus(a.deadline);
                    return (
                      <div key={a.id} className="rounded-xl border p-5 space-y-3" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{a.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{a.classes?.name} · {a.classes?.subject}</p>
                          </div>
                          {ds && (
                            <span className="text-xs font-medium shrink-0" style={{ color: ds.color }}>
                              {ds.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
                        {(a.objectives ?? []).length > 0 && (
                          <ul className="space-y-1">
                            {(a.objectives ?? []).slice(0, 2).map((o, i) => (
                              <li key={i} className="text-xs flex items-center gap-1.5 text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#6C63FF" }} />
                                {o}
                              </li>
                            ))}
                          </ul>
                        )}
                        {(a.required_phases ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {(a.required_phases ?? []).map(p => (
                              <span key={p} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,212,255,0.08)", color: "#00D4FF" }}>{p}</span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => setStartAssignment(a)}
                          className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                          style={{ background: "#6C63FF", color: "#fff" }}
                        >
                          Start Assignment <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* In progress */}
            {inProg.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#FFB84D" }} />
                  In Progress ({inProg.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {inProg.map(a => {
                    const ds = deadlineStatus(a.deadline);
                    return (
                      <div key={a.id} className="rounded-xl border p-5 space-y-3" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{a.title}</h3>
                            <p className="text-xs text-muted-foreground">{a.classes?.name}</p>
                          </div>
                          {ds && <span className="text-xs font-medium shrink-0" style={{ color: ds.color }}>{ds.label}</span>}
                        </div>
                        <div className="flex gap-2">
                          {a.submission?.project_id && (
                            <button
                              onClick={() => navigate(`/workspace/${a.submission!.project_id}`)}
                              className="flex-1 py-2 rounded-lg font-medium text-sm"
                              style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}
                            >
                              Continue Working
                            </button>
                          )}
                          <button
                            onClick={() => setSubmitAssignment(a)}
                            className="flex-1 py-2 rounded-lg font-semibold text-sm"
                            style={{ background: "#6C63FF", color: "#fff" }}
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Submitted / Graded */}
            {submitted.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#00C896" }} />
                  Submitted ({submitted.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {submitted.map(a => {
                    const sub = a.submission!;
                    const sc = STATUS_COLORS[sub.status] ?? { bg: "rgba(90,90,120,0.2)", color: "#6A6A8A" };
                    return (
                      <div key={a.id} className="rounded-xl border p-5 space-y-3" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{a.title}</h3>
                            <p className="text-xs text-muted-foreground">{a.classes?.name}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0" style={{ background: sc.bg, color: sc.color }}>
                            {sub.status}
                          </span>
                        </div>
                        {sub.submitted_at && (
                          <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                          </p>
                        )}
                        <GradeView submission={sub} />
                        {sub.project_id && (
                          <button
                            onClick={() => navigate(`/workspace/${sub.project_id}`)}
                            className="text-sm font-medium"
                            style={{ color: "#6C63FF" }}
                          >
                            View Project →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <JoinClassModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={loadAssignments} />
      <StartAssignmentModal open={!!startAssignment} assignment={startAssignment} onClose={() => setStartAssignment(null)} />
      <SubmitAssignmentModal
        open={!!submitAssignment}
        assignment={submitAssignment}
        onClose={() => setSubmitAssignment(null)}
        onSubmitted={loadAssignments}
      />
    </DashboardLayout>
  );
}
