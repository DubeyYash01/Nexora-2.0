import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRoute from "@/components/admin/AdminRoute";
import {
  Users, Activity, Crown, IndianRupee, Folder, Sparkles,
  Star, Megaphone, Flag, Download, TrendingUp, TrendingDown,
  UserPlus, GitBranch,
} from "lucide-react";

function StatCard({ title, value, sub, icon: Icon, iconColor, trend }: any) {
  return (
    <div className="rounded-xl p-5 flex items-start justify-between gap-3"
      style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs mb-1" style={{ color: "#6A6A8A" }}>{title}</p>
        <p className="text-2xl font-bold mb-1" style={{ color: "#F0F0FF" }}>{value}</p>
        <p className="text-xs" style={{ color: "#4A4A6A" }}>{sub}</p>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {trend >= 0
              ? <TrendingUp className="w-3 h-3" style={{ color: "#00C896" }} />
              : <TrendingDown className="w-3 h-3" style={{ color: "#FF5A5A" }} />}
            <span className="text-xs" style={{ color: trend >= 0 ? "#00C896" : "#FF5A5A" }}>
              {trend >= 0 ? "+" : ""}{trend}
            </span>
          </div>
        )}
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${iconColor}18` }}>
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex items-end gap-1.5 h-28 relative">
      {data.map((d, i) => {
        const pct = Math.round((d.count / max) * 100);
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 relative group"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {hovered === i && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs whitespace-nowrap z-10"
                style={{ background: "#2A2A3E", color: "#F0F0FF" }}>
                {d.count} users
              </div>
            )}
            <div className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max(pct, 2)}%`,
                minHeight: 4,
                background: hovered === i ? "#5A52E0" : "#6C63FF",
                maxHeight: 96,
              }} />
            <span className="text-xs" style={{ color: "#4A4A6A" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data }: { data: { date: string; amount: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.amount), 1);
  const W = 600, H = 200;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d.amount / max) * (H - 20) - 10;
    return `${x},${y}`;
  }).join(" ");
  const poly = `${pts} ${W},${H} 0,${H}`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 240 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C896" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#00C896" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={poly} fill="url(#revGrad)" />
        <polyline points={pts} fill="none" stroke="#00C896" strokeWidth="2" strokeLinejoin="round" />
        {data.filter((_, i) => i % 5 === 0).map((d, i, arr) => {
          const idx = data.indexOf(d);
          const x = (idx / (data.length - 1)) * W;
          return (
            <text key={i} x={x} y={H - 2} textAnchor="middle" fontSize="9" fill="#4A4A6A">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ planCounts }: { planCounts: Record<string, number> }) {
  const total = Object.values(planCounts).reduce((s, v) => s + v, 0) || 1;
  const segments = [
    { label: "Free", key: "free", color: "#3A3A5A" },
    { label: "Student Pro", key: "student_pro", color: "#6C63FF" },
    { label: "Maker Pro", key: "maker_pro", color: "#00D4FF" },
    { label: "Trial", key: "trial", color: "#FFB84D" },
  ];
  let cumulative = 0;
  const R = 60, cx = 80, cy = 80, r = 40;
  const paths = segments.map((s) => {
    const val = planCounts[s.key] ?? 0;
    const pct = val / total;
    const start = cumulative;
    cumulative += pct;
    if (pct === 0) return null;
    const a1 = (start * 2 * Math.PI) - Math.PI / 2;
    const a2 = (cumulative * 2 * Math.PI) - Math.PI / 2;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const large = pct > 0.5 ? 1 : 0;
    const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
    const xi2 = cx + r * Math.cos(a2), yi2 = cy + r * Math.sin(a2);
    return (
      <path key={s.key}
        d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1} Z`}
        fill={s.color} opacity="0.9"
      />
    );
  });
  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg viewBox="0 0 160 160" className="w-32 h-32">
          {paths}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#F0F0FF">{total}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="#6A6A8A">users</text>
        </svg>
      </div>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-xs" style={{ color: "#9090B0" }}>{s.label}</span>
            <span className="text-xs font-medium ml-auto pl-4" style={{ color: "#F0F0FF" }}>{planCounts[s.key] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const EVENT_ICONS: Record<string, { icon: any; color: string }> = {
  signup: { icon: UserPlus, color: "#6C63FF" },
  payment: { icon: IndianRupee, color: "#00C896" },
  project: { icon: Folder, color: "#9090B0" },
  blueprint: { icon: GitBranch, color: "#00D4FF" },
  report: { icon: Flag, color: "#FF5A5A" },
  class: { icon: Users, color: "#FFB84D" },
};

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function AdminOverviewContent({ adminRole }: { adminRole: string | null }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      const res = await authFetch(`/api/admin/overview?userId=${user.id}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user]);

  const downloadCSV = () => {
    if (!data) return;
    const s = data.stats;
    const rows = [
      ["Metric", "Value"],
      ["Total Users", s.totalUsers],
      ["New Users Today", s.newUsersToday],
      ["Paid Users", s.paidUsers],
      ["Revenue Today (INR)", s.revenueToday],
      ["Revenue Month (INR)", s.revenueMonth],
      ["Total Projects", s.totalProjects],
      ["New Projects Today", s.newProjectsToday],
      ["Total Blueprints", s.totalBlueprints],
      ["AI Messages Today", s.aiMessagesToday],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nexora-metrics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <AdminLayout adminRole={adminRole}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse w-8 h-8 rounded-full" style={{ background: "#FFB84D33" }} />
        </div>
      </AdminLayout>
    );
  }

  const s = data?.stats ?? {};
  const aiColor = s.aiMessagesToday < 1000 ? "#00C896" : s.aiMessagesToday < 5000 ? "#FFB84D" : "#FF5A5A";

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#F0F0FF" }}>Platform Overview</h1>
        <p className="text-sm" style={{ color: "#6A6A8A" }}>Real-time platform snapshot</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button onClick={() => setFeaturedOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "#6C63FF", color: "#fff" }}>
          <Star className="w-4 h-4" /> Feature a Blueprint
        </button>
        <button onClick={() => setAnnouncementOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ border: "1px solid #2A2A3E", color: "#B0B0D0", background: "transparent" }}>
          <Megaphone className="w-4 h-4" /> Send Announcement
        </button>
        <button onClick={() => setLocation("/admin/reports")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border relative transition-colors"
          style={{ border: "1px solid #2A2A3E", color: "#B0B0D0", background: "transparent" }}>
          <Flag className="w-4 h-4" /> View Pending Reports
          {s.pendingReports > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ background: "#FF5A5A", color: "#fff" }}>
              {s.pendingReports}
            </span>
          )}
        </button>
        <button onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ border: "1px solid #2A2A3E", color: "#6A6A8A", background: "transparent" }}>
          <Download className="w-4 h-4" /> Download Report
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Users" value={s.totalUsers?.toLocaleString() ?? "0"} sub={`+${s.newUsersToday ?? 0} today`} icon={Users} iconColor="#6C63FF" trend={s.newUsersToday} />
        <StatCard title="Active Today" value={s.activeToday?.toLocaleString() ?? "0"} sub={`${s.totalUsers ? Math.round((s.activeToday / s.totalUsers) * 100) : 0}% of total`} icon={Activity} iconColor="#00D4FF" />
        <StatCard title="Paid Users" value={s.paidUsers?.toLocaleString() ?? "0"} sub={`${s.totalUsers ? Math.round((s.paidUsers / s.totalUsers) * 100) : 0}% conversion`} icon={Crown} iconColor="#FFB84D" />
        <StatCard title="Revenue Today" value={`₹${(s.revenueToday ?? 0).toLocaleString()}`} sub={`₹${(s.revenueMonth ?? 0).toLocaleString()} this month`} icon={IndianRupee} iconColor="#00C896" />
        <StatCard title="Projects Created" value={s.totalProjects?.toLocaleString() ?? "0"} sub={`+${s.newProjectsToday ?? 0} today`} icon={Folder} iconColor="#9090B0" />
        <div className="rounded-xl p-5 flex items-start justify-between gap-3"
          style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: "#6A6A8A" }}>AI Messages Today</p>
            <p className="text-2xl font-bold mb-1" style={{ color: aiColor }}>{s.aiMessagesToday?.toLocaleString() ?? "0"}</p>
            <p className="text-xs" style={{ color: "#4A4A6A" }}>~₹{((s.aiMessagesToday ?? 0) * 0.002).toFixed(2)} estimated</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${aiColor}18` }}>
            <Sparkles className="w-5 h-5" style={{ color: aiColor }} />
          </div>
        </div>
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 space-y-6">
          {/* User growth bar chart */}
          <div className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>New Users — Last 7 Days</h3>
            <BarChart data={data?.userGrowth ?? []} />
          </div>

          {/* Revenue line chart */}
          <div className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>Revenue — Last 30 Days</h3>
            <LineChart data={data?.revenueHistory ?? []} />
          </div>

          {/* Plan donut */}
          <div className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>Users by Plan</h3>
            <DonutChart planCounts={data?.planCounts ?? {}} />
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>Live Activity</h3>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#00C896" }} />
          </div>
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 480 }}>
            {(data?.activity ?? []).length === 0 ? (
              <p className="text-xs" style={{ color: "#4A4A6A" }}>No activity yet</p>
            ) : (
              (data?.activity ?? []).map((event: any, i: number) => {
                const cfg = EVENT_ICONS[event.type] ?? EVENT_ICONS.project;
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${cfg.color}15` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed" style={{ color: "#B0B0D0" }}>{event.text}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#4A4A6A" }}>{relativeTime(event.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Announcement composer modal */}
      {announcementOpen && (
        <AnnouncementModal onClose={() => setAnnouncementOpen(false)} userId={user?.id ?? ""} />
      )}
      {featuredOpen && (
        <FeaturedBlueprintModal onClose={() => setFeaturedOpen(false)} userId={user?.id ?? ""} />
      )}
    </AdminLayout>
  );
}

function AnnouncementModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [form, setForm] = useState({ title: "", message: "", type: "info", showUntil: "" });
  const [saving, setSaving] = useState(false);
  const types = ["info", "warning", "success", "maintenance"] as const;

  const submit = async () => {
    if (!form.title || !form.message) return;
    setSaving(true);
    try {
      await authFetch("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ ...form, userId }),
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: "#F0F0FF" }}>Send Announcement</h2>
        <div className="space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title" maxLength={80}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }} />
          <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Message" rows={3} maxLength={500}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }} />
          <div className="flex gap-2">
            {types.map((t) => (
              <button key={t} onClick={() => setForm({ ...form, type: t })}
                className="px-3 py-1 rounded-lg text-xs font-medium border capitalize transition-all"
                style={{
                  border: form.type === t ? "1px solid #FFB84D" : "1px solid #2A2A3E",
                  color: form.type === t ? "#FFB84D" : "#6A6A8A",
                  background: form.type === t ? "rgba(255,184,77,0.08)" : "transparent",
                }}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border"
              style={{ border: "1px solid #2A2A3E", color: "#6A6A8A" }}>Cancel</button>
            <button onClick={submit} disabled={saving || !form.title || !form.message}
              className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: "#6C63FF", color: "#fff" }}>
              {saving ? "Sending…" : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedBlueprintModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    authFetch(`/api/blueprints?search=${encodeURIComponent(search)}&limit=5`)
      .then((r) => r.json()).then((d) => setResults(d.blueprints ?? [])).catch(() => {});
  }, [search]);

  const feature = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await authFetch(`/api/admin/blueprints/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_featured: true, userId }),
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: "#F0F0FF" }}>Feature a Blueprint</h2>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search blueprints…"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none mb-3"
          style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }} />
        {results.map((b: any) => (
          <button key={b.id} onClick={() => setSelected(b)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors"
            style={{
              background: selected?.id === b.id ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.03)",
              border: selected?.id === b.id ? "1px solid #6C63FF" : "1px solid transparent",
              color: "#B0B0D0",
            }}>
            {b.title}
          </button>
        ))}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border"
            style={{ border: "1px solid #2A2A3E", color: "#6A6A8A" }}>Cancel</button>
          <button onClick={feature} disabled={saving || !selected}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "#6C63FF", color: "#fff" }}>
            {saving ? "Saving…" : "Feature It"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  return (
    <AdminRoute>
      {(role: string | null) => <AdminOverviewContent adminRole={role} />}
    </AdminRoute>
  );
}
