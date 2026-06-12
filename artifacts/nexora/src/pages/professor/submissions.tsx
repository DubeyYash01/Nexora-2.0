import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import ProfessorLayout from "@/components/professor/ProfessorLayout";
import { Loader2, ArrowLeft, Clock, Sparkles, Download } from "lucide-react";

interface Student { id: string; full_name: string; email: string; avatar_url?: string }
interface Submission {
  id: string; student_id: string; status: string; submitted_at?: string;
  grade?: string; build_steps_completed?: number; total_build_steps?: number;
  ai_assistance_log?: { totalMessages?: number };
  profiles?: Student;
}
interface Assignment {
  title: string; deadline?: string; status: string;
  classes?: { name: string; student_count?: number };
}

function Avatar({ name, url, size = 8 }: { name: string; url?: string; size?: number }) {
  const initials = name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  if (url) return <img src={url} className={`w-${size} h-${size} rounded-full object-cover`} alt={name} />;
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold shrink-0`}
      style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF" }}>
      {initials}
    </div>
  );
}

function aiUsageLabel(count: number): { label: string; color: string } {
  if (count <= 10) return { label: "Low AI use", color: "#00C896" };
  if (count <= 30) return { label: "Moderate", color: "#FFB84D" };
  return { label: "Heavy AI use", color: "#FF8040" };
}

export default function ProfessorSubmissions() {
  const [, params] = useRoute("/professor/submissions/:assignmentId");
  const [, navigate] = useLocation();
  const assignmentId = params?.assignmentId ?? "";

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("submitted");

  useEffect(() => {
    if (!assignmentId) return;
    authFetch(`/api/assignments/${assignmentId}/submissions`)
      .then(r => r.json())
      .then(({ assignment: a, submissions: s, totalStudents: t }) => {
        setAssignment(a ?? null);
        setSubmissions(s ?? []);
        setTotalStudents(t ?? 0);
      })
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const submitted = submissions.filter(s => s.status === "submitted" || s.status === "graded");
  const graded = submissions.filter(s => s.status === "graded");
  const inProgress = submissions.filter(s => s.status === "draft");
  const notStarted = Math.max(0, totalStudents - submissions.length);

  const filtered = submissions.filter(s => {
    if (filterStatus === "All") return true;
    if (filterStatus === "Submitted") return s.status === "submitted";
    if (filterStatus === "Graded") return s.status === "graded";
    if (filterStatus === "In Progress") return s.status === "draft";
    return true;
  }).sort((a, b) => {
    if (sortBy === "submitted") return (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "");
    if (sortBy === "name") return (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? "");
    return 0;
  });

  const exportCSV = () => {
    const rows = [["Student","Email","Submitted At","Status","Grade"]];
    for (const s of submissions) {
      rows.push([
        s.profiles?.full_name ?? "",
        s.profiles?.email ?? "",
        s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "",
        s.status,
        s.grade ?? "",
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `submissions-${assignmentId}.csv`;
    a.click();
  };

  const isLate = (submitted_at?: string, deadline?: string) => {
    if (!submitted_at || !deadline) return false;
    return new Date(submitted_at) > new Date(deadline);
  };

  return (
    <ProfessorLayout>
      <div className="space-y-6 max-w-6xl">
        <button onClick={() => navigate("/professor/assignments")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Assignments
        </button>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{assignment?.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {assignment?.classes?.name}
                {assignment?.deadline && <> · Due {new Date(assignment.deadline).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}</>}
                <> · <span className="capitalize">{assignment?.status}</span></>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Submitted", value: submitted.length, color: "#6C63FF" },
                { label: "Not Started", value: notStarted, color: "#5A5A7A" },
                { label: "In Progress", value: inProgress.length, color: "#FFB84D" },
                { label: "Graded", value: graded.length, color: "#00C896" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border p-4" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1.5">
                {["All","Submitted","Graded","In Progress"].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: filterStatus === s ? "#6C63FF" : "rgba(42,42,62,0.5)", color: filterStatus === s ? "#fff" : "#6A6A8A" }}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <select
                  className="px-3 py-1.5 rounded-lg border text-xs bg-background text-foreground"
                  style={{ borderColor: "#2A2A3E" }}
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="submitted">Sort: Submission Time</option>
                  <option value="name">Sort: Student Name</option>
                </select>
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2A2A3E" }}>
                    {["Student","Submission Time","Steps","AI Usage","Status","Grade",""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#5A5A7A" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const name = s.profiles?.full_name ?? "Unknown";
                    const aiCount = s.ai_assistance_log?.totalMessages ?? 0;
                    const aiInfo = aiUsageLabel(aiCount);
                    const late = isLate(s.submitted_at, assignment?.deadline);
                    return (
                      <tr key={s.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: "#1A1A2A" }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} url={s.profiles?.avatar_url} size={7} />
                            <span className="font-medium text-foreground">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {s.submitted_at ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: late ? "#FF5A5A" : "#00C896" }} />
                                {new Date(s.submitted_at).toLocaleDateString()}
                              </div>
                              {late && <span className="text-xs" style={{ color: "#FF5A5A" }}>Late</span>}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {s.build_steps_completed ?? 0}/{s.total_build_steps ?? "?"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" style={{ color: aiInfo.color }} />
                            <span className="text-xs" style={{ color: aiInfo.color }}>{aiInfo.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{aiCount} msgs</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{
                            background: s.status === "graded" ? "rgba(0,200,150,0.1)" : s.status === "submitted" ? "rgba(108,99,255,0.1)" : "rgba(90,90,120,0.2)",
                            color: s.status === "graded" ? "#00C896" : s.status === "submitted" ? "#6C63FF" : "#6A6A8A",
                          }}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{s.grade ?? "—"}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/professor/review/${s.id}`)}
                            className="text-xs px-2.5 py-1.5 rounded font-medium"
                            style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No submissions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ProfessorLayout>
  );
}
