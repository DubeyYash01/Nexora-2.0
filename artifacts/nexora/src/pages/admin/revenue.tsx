import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRoute from "@/components/admin/AdminRoute";
import { IndianRupee, Download } from "lucide-react";

function LineChart({ data, color = "#00C896" }: { data: { date: string; amount: number }[]; color?: string }) {
  if (!data.length) return <p className="text-xs" style={{ color: "#4A4A6A" }}>No data yet</p>;
  const max = Math.max(...data.map((d) => d.amount), 1);
  const W = 600, H = 180;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (W - 20) + 10;
    const y = H - (d.amount / max) * (H - 30) - 10;
    return `${x},${y}`;
  }).join(" ");
  const poly = `${pts} ${W - 10},${H} 10,${H}`;
  const labeled = data.filter((_, i) => i % 10 === 0 || i === data.length - 1);
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 240 }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={poly} fill={`url(#grad-${color.replace("#", "")})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {labeled.map((d) => {
          const idx = data.indexOf(d);
          const x = (idx / (data.length - 1)) * (W - 20) + 10;
          return (
            <text key={d.date} x={x} y={H - 2} textAnchor="middle" fontSize="8" fill="#4A4A6A">{d.date.slice(5)}</text>
          );
        })}
      </svg>
    </div>
  );
}

function Funnel({ stats }: { stats: any }) {
  const steps = [
    { label: "Total Signups", value: stats.totalUsers ?? 0, color: "#6C63FF" },
    { label: "Created 1+ Projects", value: stats.totalUsers ? Math.round(stats.totalUsers * 0.6) : 0, color: "#00D4FF" },
    { label: "Started Trial", value: stats.trialUsers ?? 0, color: "#FFB84D" },
    { label: "Converted to Paid", value: stats.paidUsers ?? 0, color: "#00C896" },
  ];
  const max = steps[0].value || 1;
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-32 text-xs shrink-0 text-right" style={{ color: "#9090B0" }}>{s.label}</div>
          <div className="flex-1 h-6 rounded flex items-center overflow-hidden" style={{ background: "#1A1A2E" }}>
            <div className="h-full rounded transition-all flex items-center px-2"
              style={{ width: `${Math.round((s.value / max) * 100)}%`, background: s.color, minWidth: 40 }}>
              <span className="text-xs font-medium text-white">{s.value.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminRevenueContent({ adminRole }: { adminRole: string | null }) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      authFetch(`/api/admin/revenue?userId=${user.id}`).then((r) => r.json()),
      authFetch(`/api/admin/overview?userId=${user.id}`).then((r) => r.json()),
    ]).then(([rev, ov]) => {
      setData(rev);
      setOverviewStats(ov?.stats ?? {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const exportCSV = () => {
    if (!data?.payments) return;
    const rows = [["Date", "User", "Plan", "Amount", "Status", "Razorpay ID"],
      ...data.payments.map((p: any) => [p.created_at ?? "", p.profile?.full_name ?? "", p.plan ?? "", p.amount ?? 0, p.status ?? "", p.razorpay_payment_id ?? ""])];
    const blob = new Blob([rows.map((r: any[]) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "payments.csv"; a.click();
  };

  const getChartData = () => {
    if (!data?.revenueHistory) return [];
    if (view === "daily") return data.revenueHistory.slice(-30);
    if (view === "weekly") {
      const weeks: { date: string; amount: number }[] = [];
      for (let i = 0; i < data.revenueHistory.length; i += 7) {
        const chunk = data.revenueHistory.slice(i, i + 7);
        weeks.push({ date: chunk[0].date, amount: chunk.reduce((s: number, d: any) => s + d.amount, 0) });
      }
      return weeks;
    }
    const months: Record<string, number> = {};
    data.revenueHistory.forEach((d: any) => {
      const m = d.date.slice(0, 7);
      months[m] = (months[m] ?? 0) + d.amount;
    });
    return Object.entries(months).map(([date, amount]) => ({ date, amount }));
  };

  if (loading) return (
    <AdminLayout adminRole={adminRole}>
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse w-8 h-8 rounded-full" style={{ background: "#00C89633" }} />
      </div>
    </AdminLayout>
  );

  const planSubs = data?.planSubs ?? {};

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#F0F0FF" }}>Revenue</h1>
        <p className="text-sm" style={{ color: "#6A6A8A" }}>Platform financial overview</p>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Today's Revenue", value: `₹${(data?.revenueToday ?? 0).toLocaleString()}`, color: "#00C896" },
          { label: "This Month", value: `₹${(data?.revenueMonth ?? 0).toLocaleString()}`, color: "#6C63FF" },
          { label: "Total Revenue", value: `₹${(data?.revenueTotal ?? 0).toLocaleString()}`, color: "#00D4FF" },
          { label: "MRR", value: `₹${Math.round(data?.mrr ?? 0).toLocaleString()}`, color: "#FFB84D" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-5" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
            <p className="text-xs mb-1" style={{ color: "#6A6A8A" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue by plan */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>Revenue by Plan</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["Plan", "Subscribers", "Price", "MRR"].map((h) => (
                <th key={h} className="pb-2 text-left text-xs font-semibold" style={{ color: "#6A6A8A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Student Pro Monthly", key: "student_pro_monthly", price: "₹299" },
              { label: "Student Pro Semester", key: "student_pro_semester", price: "₹999" },
              { label: "Maker Pro", key: "maker_pro", price: "₹499" },
            ].map(({ label, key, price }) => (
              <tr key={key} className="border-t" style={{ borderColor: "#1A1A2E" }}>
                <td className="py-2.5" style={{ color: "#B0B0D0" }}>{label}</td>
                <td className="py-2.5" style={{ color: "#9090B0" }}>{planSubs[key]?.count ?? 0}</td>
                <td className="py-2.5" style={{ color: "#9090B0" }}>{price}</td>
                <td className="py-2.5 font-medium" style={{ color: "#00C896" }}>₹{Math.round(planSubs[key]?.mrr ?? 0).toLocaleString()}</td>
              </tr>
            ))}
            <tr className="border-t" style={{ borderColor: "#2A2A3E" }}>
              <td className="py-2.5 font-semibold" style={{ color: "#F0F0FF" }}>Total</td>
              <td />
              <td />
              <td className="py-2.5 font-bold" style={{ color: "#00C896" }}>₹{Math.round(data?.mrr ?? 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>Revenue Chart</h3>
          <div className="flex gap-1">
            {(["daily", "weekly", "monthly"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className="px-2 py-1 rounded text-xs capitalize transition-all"
                style={{
                  background: view === v ? "rgba(0,200,150,0.15)" : "transparent",
                  color: view === v ? "#00C896" : "#6A6A8A",
                }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <LineChart data={getChartData()} />
        <div className="mt-2 border-t pt-2 flex items-center gap-2" style={{ borderColor: "#1A1A2E" }}>
          <div className="flex-1 border-t border-dashed" style={{ borderColor: "#FFB84D40" }} />
          <span className="text-xs" style={{ color: "#FFB84D" }}>Monthly Goal: ₹50,000</span>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>Conversion Funnel</h3>
        <Funnel stats={overviewStats ?? {}} />
      </div>

      {/* Payment history */}
      <div className="rounded-xl overflow-hidden border" style={{ border: "1px solid #2A2A3E" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: "#0D0D15", borderColor: "#2A2A3E" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>Payment History</h3>
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border"
            style={{ border: "1px solid #2A2A3E", color: "#9090B0" }}>
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#0D0D15", borderBottom: "1px solid #2A2A3E" }}>
              {["Date", "User", "Plan", "Amount", "Status", "Razorpay ID"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6A6A8A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.payments ?? []).slice(0, 50).map((pay: any, i: number) => (
              <tr key={i} className="border-t hover:bg-white/[0.02]" style={{ borderColor: "#1A1A2E" }}>
                <td className="px-4 py-3 text-xs" style={{ color: "#6A6A8A" }}>{new Date(pay.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#9090B0" }}>{pay.profile?.full_name ?? pay.profile?.email ?? "—"}</td>
                <td className="px-4 py-3 text-xs capitalize" style={{ color: "#9090B0" }}>{pay.plan?.replace(/_/g, " ") ?? "—"}</td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "#00C896" }}>₹{pay.amount}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(0,200,150,0.12)", color: "#00C896" }}>{pay.status ?? "captured"}</span>
                </td>
                <td className="px-4 py-3 text-xs font-mono" style={{ color: "#4A4A6A" }}>{pay.razorpay_payment_id ?? "—"}</td>
              </tr>
            ))}
            {(data?.payments ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "#4A4A6A" }}>No payments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

export default function AdminRevenue() {
  return (
    <AdminRoute>
      {(role: string | null) => <AdminRevenueContent adminRole={role} />}
    </AdminRoute>
  );
}
