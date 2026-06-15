import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRoute from "@/components/admin/AdminRoute";
import { Flag, X } from "lucide-react";

function relativeTime(date: string) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#FFB84D", bg: "rgba(255,184,77,0.12)" },
  reviewed: { label: "Reviewed", color: "#6C63FF", bg: "rgba(108,99,255,0.12)" },
  resolved: { label: "Resolved", color: "#00C896", bg: "rgba(0,200,150,0.12)" },
  dismissed: { label: "Dismissed", color: "#6A6A8A", bg: "rgba(106,106,138,0.12)" },
};

function AdminReportsContent({ adminRole }: { adminRole: string | null }) {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/reports?userId=${user.id}&status=${filter}`);
      if (res.ok) {
        const d = await res.json();
        setReports(d.reports ?? []);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user, filter]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await authFetch(`/api/admin/reports/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status, userId: user?.id }),
      });
      load();
    } finally { setUpdating(null); }
  };

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-0.5" style={{ color: "#F0F0FF" }}>Content Reports</h1>
          <p className="text-sm" style={{ color: "#6A6A8A" }}>Review and moderate reported content</p>
        </div>
        {filter === "pending" && reports.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,90,90,0.12)" }}>
            <Flag className="w-3.5 h-3.5" style={{ color: "#FF5A5A" }} />
            <span className="text-sm font-medium" style={{ color: "#FF5A5A" }}>{reports.length} pending</span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        {["all", "pending", "reviewed", "resolved", "dismissed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
            style={{
              background: filter === s ? "rgba(255,184,77,0.12)" : "transparent",
              color: filter === s ? "#FFB84D" : "#6A6A8A",
            }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-pulse w-8 h-8 rounded-full" style={{ background: "#FF5A5A33" }} />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Flag className="w-10 h-10" style={{ color: "#2A2A3E" }} />
          <p className="text-sm" style={{ color: "#4A4A6A" }}>No {filter !== "all" ? filter : ""} reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r: any) => {
            const cfg = STATUS_CFG[r.status] ?? STATUS_CFG.pending;
            return (
              <div key={r.id} className="rounded-xl p-4" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {r.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: "#1A1A2E", color: "#9090B0" }}>
                        {r.content_type}
                      </span>
                      <span className="text-xs" style={{ color: "#4A4A6A" }}>{relativeTime(r.created_at)}</span>
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: "#F0F0FF" }}>Reason: {r.reason}</p>
                    {r.description && (
                      <p className="text-sm" style={{ color: "#9090B0" }}>{r.description}</p>
                    )}
                    <p className="text-xs mt-2" style={{ color: "#4A4A6A" }}>
                      Reported by: {r.reporter?.full_name ?? r.reporter?.email ?? "Unknown"}
                    </p>
                    <p className="text-xs font-mono" style={{ color: "#3A3A5A" }}>Content ID: {r.content_id}</p>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => updateStatus(r.id, "reviewed")} disabled={updating === r.id}
                        className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}>
                        Mark Reviewed
                      </button>
                      <button onClick={() => updateStatus(r.id, "resolved")} disabled={updating === r.id}
                        className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        style={{ background: "rgba(0,200,150,0.12)", color: "#00C896" }}>
                        Resolve
                      </button>
                      <button onClick={() => updateStatus(r.id, "dismissed")} disabled={updating === r.id}
                        className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        style={{ background: "rgba(106,106,138,0.12)", color: "#6A6A8A" }}>
                        Dismiss
                      </button>
                    </div>
                  )}
                  {r.status !== "pending" && (
                    <button onClick={() => updateStatus(r.id, "pending")} disabled={updating === r.id}
                      className="text-xs px-2 py-1 rounded shrink-0"
                      style={{ color: "#4A4A6A", background: "#1A1A2E" }}>
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminReports() {
  return (
    <AdminRoute>
      {(role: string | null) => <AdminReportsContent adminRole={role} />}
    </AdminRoute>
  );
}
