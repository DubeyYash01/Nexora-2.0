import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRoute from "@/components/admin/AdminRoute";
import { GitBranch, Eye, Star, ChevronUp, ChevronDown } from "lucide-react";

function relativeTime(date: string) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 86400000) return "Today";
  if (diff < 30 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return `${Math.floor(diff / 30 / 86400000)}mo ago`;
}

function AdminBlueprintsContent({ adminRole }: { adminRole: string | null }) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/blueprints?userId=${user.id}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const toggleFeatured = async (id: string, current: boolean) => {
    setSaving(id);
    try {
      await authFetch(`/api/admin/blueprints/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_featured: !current, userId: user?.id }),
      });
      load();
    } finally { setSaving(null); }
  };

  const togglePublic = async (id: string, current: boolean) => {
    setSaving(id);
    try {
      await authFetch(`/api/admin/blueprints/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_public: !current, userId: user?.id }),
      });
      load();
    } finally { setSaving(null); }
  };

  const stats = data?.stats ?? {};
  const blueprints = data?.blueprints ?? [];

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#F0F0FF" }}>Blueprints</h1>
        <p className="text-sm" style={{ color: "#6A6A8A" }}>Manage and moderate all platform blueprints</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Blueprints", value: stats.total ?? 0, icon: GitBranch, color: "#6C63FF" },
          { label: "Public Blueprints", value: stats.public ?? 0, icon: Eye, color: "#00D4FF" },
          { label: "Total Forks", value: stats.totalForks ?? 0, icon: GitBranch, color: "#00C896" },
          { label: "Total Views", value: stats.totalViews ?? 0, icon: Eye, color: "#FFB84D" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "#F0F0FF" }}>{value.toLocaleString()}</p>
              <p className="text-xs" style={{ color: "#6A6A8A" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border" style={{ border: "1px solid #2A2A3E" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#0D0D15", borderBottom: "1px solid #2A2A3E" }}>
              {["Blueprint", "Category", "Stats", "Status", "Featured", "Created", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6A6A8A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "#4A4A6A" }}>Loading…</td></tr>
            ) : blueprints.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "#4A4A6A" }}>No blueprints yet</td></tr>
            ) : blueprints.map((b: any) => (
              <tr key={b.id} className="border-t transition-colors hover:bg-white/[0.02]"
                style={{ borderColor: "#1A1A2E" }}>
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: "#F0F0FF" }}>{b.title}</p>
                  <p className="text-xs" style={{ color: "#4A4A6A" }}>{b.author?.full_name ?? "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-xs" style={{ color: "#9090B0" }}>{b.category ?? "—"}</p>
                    <p className="text-xs capitalize" style={{ color: "#6A6A8A" }}>{b.difficulty ?? "—"}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs" style={{ color: "#6A6A8A" }}>
                    <span title="Forks">⑂ {b.fork_count ?? 0}</span>
                    <span title="Views">👁 {b.view_count ?? 0}</span>
                    <span title="Likes">♥ {b.like_count ?? 0}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => togglePublic(b.id, b.is_public)} disabled={saving === b.id}
                    className="px-2 py-0.5 rounded text-xs font-medium transition-all"
                    style={{
                      background: b.is_public ? "rgba(0,200,150,0.12)" : "rgba(106,106,138,0.12)",
                      color: b.is_public ? "#00C896" : "#6A6A8A",
                    }}>
                    {b.is_public ? "Public" : "Private"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleFeatured(b.id, b.is_featured)} disabled={saving === b.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all"
                    style={{
                      background: b.is_featured ? "rgba(255,184,77,0.12)" : "rgba(42,42,62,0.5)",
                      color: b.is_featured ? "#FFB84D" : "#6A6A8A",
                    }}>
                    <Star className="w-3 h-3" /> {b.is_featured ? "Featured" : "Feature"}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#6A6A8A" }}>{relativeTime(b.created_at)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => window.open(`/blueprints/${b.id}`, "_blank")}
                    className="text-xs px-2 py-1 rounded" style={{ color: "#6C63FF", background: "rgba(108,99,255,0.08)" }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

export default function AdminBlueprints() {
  return (
    <AdminRoute>
      {(role: string | null) => <AdminBlueprintsContent adminRole={role} />}
    </AdminRoute>
  );
}
