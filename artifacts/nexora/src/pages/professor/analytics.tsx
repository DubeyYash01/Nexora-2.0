import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import ProfessorLayout from "@/components/professor/ProfessorLayout";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
  classes: { id: string; name: string; student_count: number }[];
  assignments: { id: string; title: string; completionRate: number; submittedCount: number; classStudents: number; deadline?: string }[];
  studentEngagement: { id: string; name: string; assignmentsCompleted: number; totalAiMessages: number; lastActive: string | null }[];
  componentInsights: { name: string; count: number }[];
}

export default function ProfessorAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    const url = selectedClassId
      ? `/api/analytics/${user.id}?classId=${selectedClassId}`
      : `/api/analytics/${user.id}`;
    setLoading(true);
    authFetch(url)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [user, selectedClassId]);

  const maxBar = Math.max(...(data?.componentInsights ?? []).map(c => c.count), 1);
  const maxCompletion = Math.max(...(data?.assignments ?? []).map(a => a.completionRate), 1);

  return (
    <ProfessorLayout>
      <div className="space-y-8 max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          {data && data.classes.length > 0 && (
            <select
              className="px-3 py-2 rounded-lg border text-sm bg-background text-foreground"
              style={{ borderColor: "#2A2A3E" }}
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
            >
              <option value="">All Classes</option>
              {data.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading analytics...</div>
        ) : !data ? (
          <p className="text-muted-foreground">No data available</p>
        ) : (
          <>
            {/* Class Overview */}
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Class Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.classes.filter(c => !selectedClassId || c.id === selectedClassId).map(c => (
                  <div key={c.id} className="rounded-xl border p-4" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                    <p className="font-semibold text-foreground text-sm truncate">{c.name}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: "#6C63FF" }}>{c.student_count}</p>
                    <p className="text-xs text-muted-foreground">students</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Assignment Performance */}
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Assignment Performance</h2>
              <div className="rounded-xl border overflow-hidden" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                {data.assignments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No assignments yet</p>
                ) : (
                  <div className="divide-y" style={{ borderColor: "#1A1A2A" }}>
                    {data.assignments.map(a => (
                      <div key={a.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-foreground">{a.title}</span>
                          <span className="text-sm font-semibold" style={{ color: a.completionRate >= 70 ? "#00C896" : a.completionRate >= 40 ? "#FFB84D" : "#FF5A5A" }}>
                            {a.completionRate}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1A1A2E" }}>
                          <div className="h-full rounded-full" style={{ width: `${a.completionRate}%`, background: a.completionRate >= 70 ? "#00C896" : a.completionRate >= 40 ? "#FFB84D" : "#FF5A5A" }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{a.submittedCount} of {a.classStudents} students submitted</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Student Engagement */}
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Student Engagement</h2>
              <div className="rounded-xl border overflow-hidden" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2A2A3E" }}>
                      {["Student","Assignments Completed","Avg AI Usage","Last Active"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#5A5A7A" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.studentEngagement.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No students enrolled</td></tr>
                    ) : (
                      data.studentEngagement.map(s => (
                        <tr key={s.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: "#1A1A2A" }}>
                          <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.assignmentsCompleted}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.totalAiMessages} msgs</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {s.lastActive ? new Date(s.lastActive).toLocaleDateString() : "Never"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Component Insights */}
            {data.componentInsights.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3">Most Popular Components in Your Class</h2>
                <p className="text-xs text-muted-foreground mb-3">Useful for lab procurement planning</p>
                <div className="rounded-xl border p-4 space-y-3" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                  {data.componentInsights.map(c => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-sm text-foreground w-40 truncate shrink-0">{c.name}</span>
                      <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "#1A1A2E" }}>
                        <div className="h-full rounded-md flex items-center px-2" style={{ width: `${(c.count / maxBar) * 100}%`, background: "rgba(108,99,255,0.4)" }}>
                          <span className="text-xs text-white font-medium whitespace-nowrap">{c.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </ProfessorLayout>
  );
}
