import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRoute from "@/components/admin/AdminRoute";
import { Sparkles } from "lucide-react";

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => {
        const pct = Math.round((d.count / max) * 100);
        const color = d.count < 1000 ? "#00C896" : d.count < 5000 ? "#FFB84D" : "#FF5A5A";
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 relative"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {hovered === i && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs whitespace-nowrap z-10"
                style={{ background: "#2A2A3E", color: "#F0F0FF" }}>
                {d.count} msgs
              </div>
            )}
            <div className="w-full rounded-t transition-all"
              style={{ height: `${Math.max(pct, 2)}%`, minHeight: 4, background: color, maxHeight: 112 }} />
            <span className="text-xs" style={{ color: "#4A4A6A" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function AdminAIUsageContent({ adminRole }: { adminRole: string | null }) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    authFetch(`/api/admin/ai-usage?userId=${user.id}`)
      .then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const aiColor = (data?.totalToday ?? 0) < 1000 ? "#00C896" : (data?.totalToday ?? 0) < 5000 ? "#FFB84D" : "#FF5A5A";

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#F0F0FF" }}>AI Usage</h1>
        <p className="text-sm" style={{ color: "#6A6A8A" }}>Gemini API call monitoring and cost tracking</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse w-8 h-8 rounded-full" style={{ background: "#6C63FF33" }} />
        </div>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
              <p className="text-xs mb-1" style={{ color: "#6A6A8A" }}>AI Messages Today</p>
              <p className="text-3xl font-bold" style={{ color: aiColor }}>{(data?.totalToday ?? 0).toLocaleString()}</p>
              <p className="text-xs mt-1" style={{ color: "#4A4A6A" }}>
                {data?.totalToday < 1000 ? "✓ Normal" : data?.totalToday < 5000 ? "⚠ Elevated" : "🔴 High"} usage
              </p>
            </div>
            <div className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
              <p className="text-xs mb-1" style={{ color: "#6A6A8A" }}>Estimated Cost Today</p>
              <p className="text-3xl font-bold" style={{ color: "#FFB84D" }}>₹{(data?.estimatedCost ?? 0).toFixed(2)}</p>
              <p className="text-xs mt-1" style={{ color: "#4A4A6A" }}>~₹0.002 per message</p>
            </div>
            <div className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" style={{ color: "#6C63FF" }} />
                <p className="text-xs" style={{ color: "#6A6A8A" }}>7-Day Total</p>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#6C63FF" }}>
                {(data?.dailyUsage ?? []).reduce((s: number, d: any) => s + d.count, 0).toLocaleString()}
              </p>
              <p className="text-xs mt-1" style={{ color: "#4A4A6A" }}>
                ₹{((data?.dailyUsage ?? []).reduce((s: number, d: any) => s + d.count, 0) * 0.002).toFixed(2)} estimated
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="rounded-xl p-5 mb-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>AI Messages — Last 7 Days</h3>
            <BarChart data={data?.dailyUsage ?? []} />
            <div className="flex items-center gap-4 mt-3">
              {[
                { label: "Normal (<1K)", color: "#00C896" },
                { label: "Elevated (1K-5K)", color: "#FFB84D" },
                { label: "High (>5K)", color: "#FF5A5A" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs" style={{ color: "#6A6A8A" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top users */}
          <div className="rounded-xl overflow-hidden border" style={{ border: "1px solid #2A2A3E" }}>
            <div className="px-5 py-4 border-b" style={{ background: "#0D0D15", borderColor: "#2A2A3E" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>Top AI Users Today</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#0D0D15", borderBottom: "1px solid #2A2A3E" }}>
                  {["#", "User", "Plan", "Messages Today", "Est. Cost"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6A6A8A" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.topUsers ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "#4A4A6A" }}>No usage today</td></tr>
                ) : (data?.topUsers ?? []).map((u: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-white/[0.02]" style={{ borderColor: "#1A1A2E" }}>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "#4A4A6A" }}>#{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: "#F0F0FF" }}>{u.profile?.full_name || u.profile?.email || "—"}</p>
                      <p className="text-xs" style={{ color: "#4A4A6A" }}>{u.profile?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: "#9090B0" }}>{u.profile?.plan?.replace(/_/g, " ") ?? "free"}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{ color: u.ai_messages_count > 50 ? "#FF5A5A" : "#6C63FF" }}>
                        {u.ai_messages_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#6A6A8A" }}>₹{(u.ai_messages_count * 0.002).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export default function AdminAIUsage() {
  return (
    <AdminRoute>
      {(role: string | null) => <AdminAIUsageContent adminRole={role} />}
    </AdminRoute>
  );
}
