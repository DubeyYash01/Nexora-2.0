import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import ProfessorLayout from "@/components/professor/ProfessorLayout";
import {
  Users, ClipboardList, Inbox, TrendingUp,
  AlertCircle, Clock, ChevronRight, Loader2,
  CheckCircle2, XCircle,
} from "lucide-react";

interface Stats {
  totalClasses: number;
  activeAssignments: number;
  totalStudents: number;
  pendingReviews: number;
  completionRate: number;
}

interface Assignment {
  id: string;
  title: string;
  classes?: { name: string };
  deadline?: string;
  status: string;
  submission_count: number;
}

export default function ProfessorOverview() {
  const { user, profile } = useAuth();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [statsRes, assRes] = await Promise.all([
          authFetch("/api/classes/professor/stats"),
          authFetch(`/api/assignments/professor/${user.id}`),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (assRes.ok) {
          const { assignments: a } = await assRes.json();
          setAssignments(a ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const lastName = profile?.full_name?.split(" ").slice(-1)[0] ?? "";

  const deadlineColor = (d?: string) => {
    if (!d) return "#6A6A8A";
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    if (diff < 0) return "#FF5A5A";
    if (diff <= 3) return "#FFB84D";
    return "#00C896";
  };

  const deadlineLabel = (d?: string) => {
    if (!d) return "No deadline";
    const diff = (new Date(d).getTime() - Date.now()) / 86400000;
    if (diff < 0) return "Overdue";
    if (diff <= 1) return "Due soon!";
    if (diff <= 3) return `${Math.ceil(diff)}d left`;
    return new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  const STAT_CARDS = [
    { label: "Total Classes", value: stats?.totalClasses ?? 0, icon: Users, color: "#6C63FF" },
    { label: "Active Assignments", value: stats?.activeAssignments ?? 0, icon: ClipboardList, color: "#00D4FF" },
    { label: "Total Students", value: stats?.totalStudents ?? 0, icon: Users, color: "#00C896" },
    {
      label: "Pending Reviews",
      value: stats?.pendingReviews ?? 0,
      icon: Inbox,
      color: stats?.pendingReviews ? "#FF5A5A" : "#00C896",
      alert: (stats?.pendingReviews ?? 0) > 0,
    },
    { label: "Avg Completion", value: `${stats?.completionRate ?? 0}%`, icon: TrendingUp, color: "#FFB84D" },
  ];

  return (
    <ProfessorLayout>
      <div className="space-y-8 max-w-6xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, Prof. {lastName}
          </h1>
          <p className="text-muted-foreground mt-1">Here's your teaching overview</p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading stats...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {STAT_CARDS.map((card) => (
              <div
                key={card.label}
                className="rounded-xl p-4 border relative"
                style={{
                  background: "#12121A",
                  borderColor: card.alert ? "#FF5A5A" : "#2A2A3E",
                  boxShadow: card.alert ? "0 0 0 1px #FF5A5A33" : undefined,
                }}
              >
                {card.alert && (
                  <div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "#FF5A5A" }}
                  />
                )}
                <card.icon className="w-5 h-5 mb-2" style={{ color: card.color }} />
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
                {card.alert && (
                  <div className="text-xs mt-1" style={{ color: "#FF5A5A" }}>Needs attention</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Assignments Table */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Active Assignments</h2>
              <button
                onClick={() => navigate("/professor/assignments")}
                className="text-xs flex items-center gap-1"
                style={{ color: "#6C63FF" }}
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div
              className="rounded-xl border overflow-hidden"
              style={{ background: "#12121A", borderColor: "#2A2A3E" }}
            >
              {assignments.length === 0 ? (
                <div className="p-8 text-center">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2" style={{ color: "#3A3A5A" }} />
                  <p className="text-sm text-muted-foreground">No assignments yet</p>
                  <button
                    onClick={() => navigate("/professor/assignments")}
                    className="mt-3 text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: "#6C63FF", color: "#fff" }}
                  >
                    Create First Assignment
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2A2A3E" }}>
                      {["Assignment", "Class", "Submitted", "Deadline", "Status", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#5A5A7A" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.slice(0, 8).map((a) => (
                      <tr
                        key={a.id}
                        className="border-b transition-colors hover:bg-white/[0.02]"
                        style={{ borderColor: "#1A1A2A" }}
                      >
                        <td className="px-4 py-3">
                          <button
                            className="font-medium text-foreground hover:text-primary text-left"
                            onClick={() => navigate(`/professor/submissions/${a.id}`)}
                          >
                            {a.title}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {a.classes?.name ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {a.submission_count ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium" style={{ color: deadlineColor(a.deadline) }}>
                            {deadlineLabel(a.deadline)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: a.status === "active" ? "rgba(0,200,150,0.1)" : "rgba(90,90,120,0.2)",
                              color: a.status === "active" ? "#00C896" : "#6A6A8A",
                            }}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/professor/submissions/${a.id}`)}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4">Recent Activity</h2>
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{ background: "#12121A", borderColor: "#2A2A3E" }}
            >
              {assignments.slice(0, 5).map((a) => (
                <div key={a.id} className="flex gap-3 items-start">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(108,99,255,0.1)" }}
                  >
                    <ClipboardList className="w-3.5 h-3.5" style={{ color: "#6C63FF" }} />
                  </div>
                  <div>
                    <p className="text-xs text-foreground font-medium leading-snug">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.classes?.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#3A3A5A" }}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(a.deadline ?? Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {assignments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProfessorLayout>
  );
}
