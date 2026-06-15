import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRoute from "@/components/admin/AdminRoute";
import { Megaphone, Plus, Info, AlertTriangle, CheckCircle, Wrench } from "lucide-react";

const TYPE_CFG = {
  info: { color: "#00D4FF", bg: "rgba(0,212,255,0.08)", border: "#00D4FF22", label: "Info", icon: Info },
  warning: { color: "#FFB84D", bg: "rgba(255,184,77,0.08)", border: "#FFB84D22", label: "Warning", icon: AlertTriangle },
  success: { color: "#00C896", bg: "rgba(0,200,150,0.08)", border: "#00C89622", label: "Success", icon: CheckCircle },
  maintenance: { color: "#FF5A5A", bg: "rgba(255,90,90,0.08)", border: "#FF5A5A22", label: "Maintenance", icon: Wrench },
};

function BannerPreview({ title, message, type }: { title: string; message: string; type: string }) {
  const cfg = TYPE_CFG[type as keyof typeof TYPE_CFG] ?? TYPE_CFG.info;
  const Icon = cfg.icon;
  return (
    <div className="rounded-lg px-4 py-3 flex items-center gap-2"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
      <span className="text-sm font-medium" style={{ color: cfg.color }}>{title || "Title"}</span>
      <span className="text-sm" style={{ color: "#9090B0" }}>{message || "Your message here…"}</span>
    </div>
  );
}

function AdminAnnouncementsContent({ adminRole }: { adminRole: string | null }) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", message: "", type: "info", showUntil: "",
    targetRoles: ["student", "maker", "professor", "professional"],
  });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // For admin we need all announcements, not just active
      const res = await authFetch(`/api/admin/announcements`);
      if (res.ok) {
        const d = await res.json();
        setAnnouncements(d.announcements ?? []);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!form.title || !form.message) return;
    setSaving(true);
    try {
      await authFetch("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ ...form, userId: user?.id }),
      });
      setForm({ title: "", message: "", type: "info", showUntil: "", targetRoles: ["student", "maker", "professor", "professional"] });
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const toggle = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      await authFetch(`/api/admin/announcements/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !current, userId: user?.id }),
      });
      load();
    } finally { setToggling(null); }
  };

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      targetRoles: f.targetRoles.includes(role) ? f.targetRoles.filter((r) => r !== role) : [...f.targetRoles, role],
    }));
  };

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-0.5" style={{ color: "#F0F0FF" }}>Announcements</h1>
          <p className="text-sm" style={{ color: "#6A6A8A" }}>Send messages to platform users</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "#6C63FF", color: "#fff" }}>
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-5 mb-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>Create Announcement</h3>
          <div className="space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title (max 80 chars)" maxLength={80}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }} />
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Message (max 500 chars)" maxLength={500} rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
              style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }} />
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_CFG) as (keyof typeof TYPE_CFG)[]).map((t) => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border"
                  style={{
                    border: form.type === t ? `1px solid ${TYPE_CFG[t].color}` : "1px solid #2A2A3E",
                    color: form.type === t ? TYPE_CFG[t].color : "#6A6A8A",
                    background: form.type === t ? TYPE_CFG[t].bg : "transparent",
                  }}>
                  {TYPE_CFG[t].label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: "#6A6A8A" }}>Target users:</p>
              <div className="flex gap-2 flex-wrap">
                {["student", "maker", "professor", "professional"].map((role) => (
                  <button key={role} onClick={() => toggleRole(role)}
                    className="px-3 py-1 rounded-lg text-xs capitalize transition-all border"
                    style={{
                      border: form.targetRoles.includes(role) ? "1px solid #FFB84D" : "1px solid #2A2A3E",
                      color: form.targetRoles.includes(role) ? "#FFB84D" : "#6A6A8A",
                      background: form.targetRoles.includes(role) ? "rgba(255,184,77,0.08)" : "transparent",
                    }}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: "#6A6A8A" }}>Show until (optional):</p>
              <input type="datetime-local" value={form.showUntil} onChange={(e) => setForm({ ...form, showUntil: e.target.value })}
                className="px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }} />
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: "#6A6A8A" }}>Preview:</p>
              <BannerPreview title={form.title} message={form.message} type={form.type} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-lg text-sm border"
                style={{ border: "1px solid #2A2A3E", color: "#6A6A8A" }}>
                Cancel
              </button>
              <button onClick={create} disabled={saving || !form.title || !form.message}
                className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: "#6C63FF", color: "#fff" }}>
                {saving ? "Publishing…" : "Publish Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-pulse w-8 h-8 rounded-full" style={{ background: "#6C63FF33" }} />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Megaphone className="w-10 h-10" style={{ color: "#2A2A3E" }} />
          <p className="text-sm" style={{ color: "#4A4A6A" }}>No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => {
            const cfg = TYPE_CFG[a.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.info;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className="rounded-xl p-4 flex items-start gap-4"
                style={{ background: "#12121A", border: `1px solid ${a.is_active ? cfg.border : "#1A1A2E"}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-0.5" style={{ color: "#F0F0FF" }}>{a.title}</p>
                  <p className="text-sm mb-2" style={{ color: "#9090B0" }}>{a.message}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-0.5 rounded capitalize"
                      style={{ background: cfg.bg, color: cfg.color }}>{a.type}</span>
                    {(a.target_roles ?? []).map((r: string) => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded capitalize"
                        style={{ background: "#1A1A2E", color: "#6A6A8A" }}>{r}</span>
                    ))}
                    {a.show_until && (
                      <span className="text-xs" style={{ color: "#4A4A6A" }}>
                        Until {new Date(a.show_until).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => toggle(a.id, a.is_active)} disabled={toggling === a.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: a.is_active ? "rgba(0,200,150,0.12)" : "rgba(106,106,138,0.12)",
                    color: a.is_active ? "#00C896" : "#6A6A8A",
                  }}>
                  {a.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminAnnouncements() {
  return (
    <AdminRoute>
      {(role: string | null) => <AdminAnnouncementsContent adminRole={role} />}
    </AdminRoute>
  );
}
