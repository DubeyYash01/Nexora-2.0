import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRoute from "@/components/admin/AdminRoute";
import { Building, X, Mail } from "lucide-react";

function relativeTime(date: string) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 86400000) return "Today";
  if (diff < 30 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return `${Math.floor(diff / 30 / 86400000)}mo ago`;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "New", color: "#FFB84D", bg: "rgba(255,184,77,0.12)" },
  new: { label: "New", color: "#FFB84D", bg: "rgba(255,184,77,0.12)" },
  contacted: { label: "Contacted", color: "#00D4FF", bg: "rgba(0,212,255,0.12)" },
  demo_scheduled: { label: "Demo Scheduled", color: "#6C63FF", bg: "rgba(108,99,255,0.12)" },
  converted: { label: "Converted", color: "#00C896", bg: "rgba(0,200,150,0.12)" },
  lost: { label: "Lost", color: "#6A6A8A", bg: "rgba(106,106,138,0.12)" },
};

function InquiryModal({ inquiry, onClose, onSave, adminId }: {
  inquiry: any; onClose: () => void; onSave: () => void; adminId: string;
}) {
  const [notes, setNotes] = useState(inquiry.admin_notes ?? "");
  const [status, setStatus] = useState(inquiry.status ?? "new");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await authFetch(`/api/admin/college-inquiries/${inquiry.id}`, {
        method: "PUT",
        body: JSON.stringify({ status, adminNotes: notes, userId: adminId }),
      });
      onSave();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "#F0F0FF" }}>{inquiry.institution_name}</h2>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: "#6A6A8A" }} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#4A4A6A" }}>Contact</p>
              <p style={{ color: "#B0B0D0" }}>{inquiry.contact_name}</p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#4A4A6A" }}>Email</p>
              <p style={{ color: "#B0B0D0" }}>{inquiry.email}</p>
            </div>
            {inquiry.phone && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: "#4A4A6A" }}>Phone</p>
                <p style={{ color: "#B0B0D0" }}>{inquiry.phone}</p>
              </div>
            )}
            {inquiry.student_count && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: "#4A4A6A" }}>Students</p>
                <p style={{ color: "#B0B0D0" }}>{inquiry.student_count}</p>
              </div>
            )}
          </div>
          {inquiry.message && (
            <div className="rounded-lg p-3" style={{ background: "#1A1A2E" }}>
              <p className="text-xs mb-1" style={{ color: "#4A4A6A" }}>Their message</p>
              <p className="text-sm" style={{ color: "#9090B0" }}>{inquiry.message}</p>
            </div>
          )}
          <div>
            <p className="text-xs mb-1" style={{ color: "#4A4A6A" }}>Admin Notes</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} placeholder="Internal notes…"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
              style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "#4A4A6A" }}>Status</p>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "#1A1A2E", border: "1px solid #2A2A3E", color: "#F0F0FF" }}>
              {Object.entries(STATUS_CFG).filter(([k]) => k !== "pending").map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <a href={`mailto:${inquiry.email}`}
              className="flex items-center gap-1.5 flex-1 py-2 rounded-lg text-sm font-medium text-center justify-center"
              style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}>
              <Mail className="w-3.5 h-3.5" /> Email {inquiry.contact_name?.split(" ")[0]}
            </a>
            <button onClick={save} disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: "#6C63FF", color: "#fff" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminCollegeContent({ adminRole }: { adminRole: string | null }) {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/college-inquiries?userId=${user.id}&status=${statusFilter}`);
      if (res.ok) setInquiries((await res.json()).inquiries ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user, statusFilter]);

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const newCount = inquiries.filter((i) => (i.status === "new" || i.status === "pending")).length;
  const inProgress = inquiries.filter((i) => ["contacted", "demo_scheduled"].includes(i.status)).length;
  const converted = inquiries.filter((i) => i.status === "converted").length;
  const thisMonth = inquiries.filter((i) => i.created_at?.startsWith(monthStart.slice(0, 7))).length;

  return (
    <AdminLayout adminRole={adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#F0F0FF" }}>College Inquiries</h1>
        <p className="text-sm" style={{ color: "#6A6A8A" }}>Manage institutional leads from the college lab contact form</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "New Inquiries", value: newCount, color: "#FF5A5A" },
          { label: "In Progress", value: inProgress, color: "#6C63FF" },
          { label: "Converted", value: converted, color: "#00C896" },
          { label: "Total This Month", value: thisMonth, color: "#FFB84D" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "#6A6A8A" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
        {["all", "new", "contacted", "demo_scheduled", "converted", "lost"].map((s) => {
          const cfg = STATUS_CFG[s];
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: statusFilter === s ? (cfg ? cfg.bg : "rgba(255,184,77,0.08)") : "transparent",
                color: statusFilter === s ? (cfg ? cfg.color : "#FFB84D") : "#6A6A8A",
              }}>
              {cfg?.label ?? "All"}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border" style={{ border: "1px solid #2A2A3E" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#0D0D15", borderBottom: "1px solid #2A2A3E" }}>
              {["Institution", "Contact", "Email", "Students", "Status", "Date", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6A6A8A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "#4A4A6A" }}>Loading…</td></tr>
            ) : inquiries.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "#4A4A6A" }}>
                <Building className="w-8 h-8 mx-auto mb-2" style={{ color: "#2A2A3E" }} />
                No inquiries yet
              </td></tr>
            ) : inquiries.map((inq: any) => {
              const cfg = STATUS_CFG[inq.status ?? "new"] ?? STATUS_CFG.new;
              return (
                <tr key={inq.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: "#1A1A2E" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "#F0F0FF" }}>{inq.institution_name}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#9090B0" }}>{inq.contact_name}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#6A6A8A" }}>{inq.email}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#9090B0" }}>{inq.student_count ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6A6A8A" }}>{relativeTime(inq.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(inq)}
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

      {selected && (
        <InquiryModal
          inquiry={selected}
          onClose={() => setSelected(null)}
          onSave={load}
          adminId={user?.id ?? ""}
        />
      )}
    </AdminLayout>
  );
}

export default function AdminCollege() {
  return (
    <AdminRoute>
      {(role: string | null) => <AdminCollegeContent adminRole={role} />}
    </AdminRoute>
  );
}
