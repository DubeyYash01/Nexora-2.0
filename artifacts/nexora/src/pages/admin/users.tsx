import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRoute from "@/components/admin/AdminRoute";
import { Search, Download, X, ChevronDown, ExternalLink } from "lucide-react";

function relativeTime(date: string) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 86400000) return "Today";
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  if (diff < 30 * 86400000) return `${Math.floor(diff / 7 / 86400000)}w ago`;
  return `${Math.floor(diff / 30 / 86400000)}mo ago`;
}

const PLAN_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: "Free", color: "#6A6A8A", bg: "rgba(106,106,138,0.12)" },
  student_pro: { label: "Student Pro", color: "#6C63FF", bg: "rgba(108,99,255,0.12)" },
  maker_pro: { label: "Maker Pro", color: "#00D4FF", bg: "rgba(0,212,255,0.12)" },
  trial: { label: "Trial", color: "#FFB84D", bg: "rgba(255,184,77,0.12)" },
};

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  student: { label: "Student", color: "#60A5FA" },
  maker: { label: "Maker", color: "#34D399" },
  professor: { label: "Professor", color: "#FB923C" },
  professional: { label: "Professional", color: "#A78BFA" },
};

function Badge({ type, value }: { type: "plan" | "role"; value: string }) {
  const cfg = type === "plan" ? (PLAN_BADGE[value] ?? PLAN_BADGE.free) : null;
  const rcfg = type === "role" ? (ROLE_BADGE[value] ?? { label: value, color: "#6A6A8A" }) : null;
  if (cfg) return (
    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
  );
  if (rcfg) return (
    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: `${rcfg.color}18`, color: rcfg.color }}>{rcfg.label}</span>
  );
  return null;
}

function UserDetailPanel({ userId, onClose, adminUserId }: { userId: string; onClose: () => void; adminUserId: string }) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"projects" | "payments" | "activity">("projects");
  const [changePlan, setChangePlan] = useState(false);
  const [newPlan, setNewPlan] = useState("");
  const [planReason, setPlanReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch(`/api/admin/users/${userId}?userId=${adminUserId}`)
      .then((r) => r.json()).then(setData).catch(() => {});
  }, [userId]);

  const applyPlan = async () => {
    if (!newPlan) return;
    setSaving(true);
    try {
      await authFetch(`/api/admin/users/${userId}/plan`, {
        method: "PUT",
        body: JSON.stringify({ plan: newPlan, reason: planReason, userId: adminUserId }),
      });
      setChangePlan(false);
      const updated = await authFetch(`/api/admin/users/${userId}?userId=${adminUserId}`).then((r) => r.json());
      setData(updated);
    } finally { setSaving(false); }
  };

  if (!data) return (
    <div className="fixed inset-y-0 right-0 w-[480px] flex items-center justify-center z-40"
      style={{ background: "#0D0D15", borderLeft: "1px solid #1A1A2E" }}>
      <div className="animate-pulse w-6 h-6 rounded-full" style={{ background: "#FFB84D33" }} />
    </div>
  );

  const p = data.profile ?? {};
  const initials = p.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || p.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] z-40 flex flex-col overflow-y-auto"
      style={{ background: "#0D0D15", borderLeft: "1px solid #1A1A2E" }}>
      <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: "#1A1A2E" }}>
        <h3 className="font-semibold" style={{ color: "#F0F0FF" }}>User Detail</h3>
        <button onClick={onClose}><X className="w-4 h-4" style={{ color: "#6A6A8A" }} /></button>
      </div>

      <div className="p-5 border-b" style={{ borderColor: "#1A1A2E" }}>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: "#6C63FF22", color: "#6C63FF" }}>
            {initials}
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: "#F0F0FF" }}>{p.full_name || "—"}</p>
            <p className="text-sm mb-2" style={{ color: "#6A6A8A" }}>{p.email}</p>
            <div className="flex gap-2 flex-wrap">
              {p.role && <Badge type="role" value={p.role} />}
              {p.plan && <Badge type="plan" value={p.plan} />}
            </div>
            <p className="text-xs mt-1" style={{ color: "#4A4A6A" }}>Joined {relativeTime(p.created_at)}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Projects", value: data.projects?.length ?? 0 },
            { label: "Blueprints", value: data.blueprints?.length ?? 0 },
            { label: "AI Messages", value: data.totalAI },
            { label: "Total Spent", value: `₹${data.totalSpent}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-2 text-center" style={{ background: "#1A1A2E" }}>
              <p className="text-sm font-bold" style={{ color: "#F0F0FF" }}>{value}</p>
              <p className="text-xs" style={{ color: "#4A4A6A" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-b shrink-0" style={{ borderColor: "#1A1A2E" }}>
        {(["projects", "payments", "activity"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-medium capitalize transition-colors"
            style={{
              color: tab === t ? "#FFB84D" : "#6A6A8A",
              borderBottom: tab === t ? "2px solid #FFB84D" : "2px solid transparent",
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {tab === "projects" && (
          <div className="space-y-2">
            {data.projects?.length === 0 ? <p className="text-xs" style={{ color: "#4A4A6A" }}>No projects yet</p> :
              data.projects?.map((proj: any) => (
                <div key={proj.id} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "#1A1A2E" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>{proj.title}</p>
                    <p className="text-xs capitalize" style={{ color: "#6A6A8A" }}>{proj.status} · {relativeTime(proj.created_at)}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 cursor-pointer" style={{ color: "#6A6A8A" }}
                    onClick={() => window.open(`/workspace/${proj.id}`, "_blank")} />
                </div>
              ))}
          </div>
        )}
        {tab === "payments" && (
          <div className="space-y-2">
            {data.payments?.length === 0 ? <p className="text-xs" style={{ color: "#4A4A6A" }}>No payments yet</p> :
              data.payments?.map((pay: any) => (
                <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "#1A1A2E" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#F0F0FF" }}>₹{pay.amount}</p>
                    <p className="text-xs" style={{ color: "#6A6A8A" }}>{pay.plan} · {relativeTime(pay.created_at)}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#00C89620", color: "#00C896" }}>{pay.status}</span>
                </div>
              ))}
          </div>
        )}
        {tab === "activity" && (
          <div className="space-y-2">
            {data.aiUsage?.length === 0 ? <p className="text-xs" style={{ color: "#4A4A6A" }}>No activity data</p> :
              data.aiUsage?.map((u: any) => (
                <div key={u.date} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "#1A1A2E" }}>
                  <p className="text-sm" style={{ color: "#B0B0D0" }}>{u.date}</p>
                  <p className="text-sm font-medium" style={{ color: "#6C63FF" }}>{u.ai_messages_count} AI msgs</p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Admin actions */}
      <div className="p-4 border-t space-y-2 shrink-0" style={{ borderColor: "#1A1A2E" }}>
        {!changePlan ? (
          <button onClick={() => { setChangePlan(true); setNewPlan(p.plan ?? "free"); }}
            className="w-full py-2 rounded-lg text-sm font-medium"
            style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}>
            Change Plan
          </button>
        ) : (
          <div className="space-y-2">
            <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }}>
              {["free", "student_pro", "maker_pro", "college_lab"].map((plan) => (
                <option key={plan} value={plan}>{plan.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input value={planReason} onChange={(e) => setPlanReason(e.target.value)}
              placeholder="Reason (optional)" className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }} />
            <div className="flex gap-2">
              <button onClick={() => setChangePlan(false)} className="flex-1 py-2 rounded-lg text-xs border"
                style={{ border: "1px solid #2A2A3E", color: "#6A6A8A" }}>Cancel</button>
              <button onClick={applyPlan} disabled={saving} className="flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{ background: "#6C63FF", color: "#fff" }}>
                {saving ? "Saving…" : "Apply Change"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminUsersContent({ adminRole }: { adminRole: string | null }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id, sort, plan: planFilter, role: roleFilter });
      if (search) params.set("search", search);
      const res = await authFetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const d = await res.json();
        setUsers(d.users ?? []);
        setTotal(d.total ?? 0);
      }
    } finally { setLoading(false); }
  }, [user, search, planFilter, roleFilter, sort]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const exportCSV = () => {
    const rows = [["Name", "Email", "Role", "Plan", "Projects", "Joined"],
      ...users.map((u: any) => [u.full_name ?? "", u.email ?? "", u.role ?? "", u.plan ?? "", u.project_count ?? 0, u.created_at ?? ""])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "users.csv"; a.click();
  };

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-0.5" style={{ color: "#F0F0FF" }}>Users</h1>
          <p className="text-sm" style={{ color: "#6A6A8A" }}>{total.toLocaleString()} total users</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border"
          style={{ border: "1px solid #2A2A3E", color: "#9090B0" }}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 min-w-40"
          style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#6A6A8A" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…"
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: "#F0F0FF" }} />
          {search && <button onClick={() => setSearch("")}><X className="w-3 h-3" style={{ color: "#6A6A8A" }} /></button>}
        </div>
        {[
          { label: "Plan", value: planFilter, set: setPlanFilter, opts: ["all", "free", "student_pro", "maker_pro", "trial"] },
          { label: "Role", value: roleFilter, set: setRoleFilter, opts: ["all", "student", "maker", "professor", "professional"] },
          { label: "Sort", value: sort, set: setSort, opts: ["newest", "oldest"] },
        ].map(({ label, value, set, opts }) => (
          <select key={label} value={value} onChange={(e) => set(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: "#12121A", border: "1px solid #2A2A3E", color: "#B0B0D0" }}>
            {opts.map((o) => <option key={o} value={o}>{o === "all" ? `All ${label}s` : o.replace(/_/g, " ")}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border" style={{ border: "1px solid #2A2A3E" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#0D0D15", borderBottom: "1px solid #2A2A3E" }}>
              {["User", "Role", "Plan", "Projects", "Joined", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6A6A8A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "#4A4A6A" }}>Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "#4A4A6A" }}>No users found</td></tr>
            ) : users.map((u: any) => {
              const initials = u.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || u.email?.[0]?.toUpperCase() || "?";
              return (
                <tr key={u.id} className="border-t transition-colors hover:bg-white/[0.02]"
                  style={{ borderColor: "#1A1A2E" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "#6C63FF22", color: "#6C63FF" }}>{initials}</div>
                      <div>
                        <p className="font-medium" style={{ color: "#F0F0FF" }}>{u.full_name || "—"}</p>
                        <p className="text-xs" style={{ color: "#4A4A6A" }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{u.role && <Badge type="role" value={u.role} />}</td>
                  <td className="px-4 py-3">{u.plan && <Badge type="plan" value={u.plan} />}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#9090B0" }}>{u.project_count ?? 0}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6A6A8A" }}>{relativeTime(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedUser(u.id)}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{ color: "#FFB84D", background: "rgba(255,184,77,0.08)" }}>
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setSelectedUser(null)} />
          <UserDetailPanel userId={selectedUser} onClose={() => setSelectedUser(null)} adminUserId={user?.id ?? ""} />
        </>
      )}
    </AdminLayout>
  );
}

export default function AdminUsers() {
  return (
    <AdminRoute>
      {(role: string | null) => <AdminUsersContent adminRole={role} />}
    </AdminRoute>
  );
}
