import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import ProfessorLayout from "@/components/professor/ProfessorLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Plus, Copy, RefreshCw, MoreHorizontal,
  Pencil, Trash2, Loader2, X, Check,
} from "lucide-react";
import { useLocation } from "wouter";

interface Class {
  id: string;
  name: string;
  subject: string;
  college: string;
  academic_year: string;
  join_code: string;
  student_count: number;
  is_active: boolean;
  created_at: string;
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const YEARS = ["2024-25", "2025-26", "2026-27", "2027-28"];

function CreateClassDrawer({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (cls: Class) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", subject: "", college: "", academicYear: "2025-26", maxStudents: 60 });
  const [code, setCode] = useState(generateCode());
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.college) {
      toast({ title: "Missing fields", description: "Name, subject, and college are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/classes/create", {
        method: "POST",
        body: JSON.stringify({ ...form, joinCode: code }),
      });
      if (!res.ok) throw new Error();
      const { class: cls } = await res.json();
      toast({ title: `Class created!`, description: `Share code ${code} with students` });
      onCreated(cls);
      onClose();
    } catch {
      toast({ title: "Failed", description: "Could not create class", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full border-l overflow-y-auto"
        style={{ background: "#12121A", borderColor: "#2A2A3E" }}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Create Class</h2>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>

          {[
            { key: "name", label: "Class Name *", placeholder: "IoT Lab — Semester 6" },
            { key: "subject", label: "Subject *", placeholder: "Internet of Things" },
            { key: "college", label: "College / Institution *", placeholder: "MIT College of Engineering" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{label}</label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground"
                style={{ borderColor: "#2A2A3E" }}
                placeholder={placeholder}
                value={(form as Record<string, string | number>)[key] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Academic Year *</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground"
              style={{ borderColor: "#2A2A3E" }}
              value={form.academicYear}
              onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Join code */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Join Code</label>
            <div
              className="rounded-lg px-4 py-3 flex items-center justify-between"
              style={{ background: "#0A0A0F", border: "1px solid #2A2A3E" }}
            >
              <span
                className="text-xl font-mono tracking-widest"
                style={{ color: "#6C63FF", letterSpacing: "4px" }}
              >
                {code}
              </span>
              <button
                onClick={() => setCode(generateCode())}
                className="p-1.5 rounded"
                style={{ color: "#6A6A8A" }}
                title="Generate new code"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Students will join using code: <strong style={{ color: "#6C63FF" }}>{code}</strong></p>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            style={{ background: "#6C63FF", color: "#fff" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Class
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfessorClasses() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    authFetch(`/api/classes/professor/${user.id}`)
      .then((r) => r.json())
      .then(({ classes: c }) => setClasses(c ?? []))
      .finally(() => setLoading(false));
  }, [user]);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Delete this class? This cannot be undone.")) return;
    await authFetch(`/api/classes/${id}`, { method: "DELETE" });
    setClasses((c) => c.filter((cls) => cls.id !== id));
    toast({ title: "Class deleted" });
  };

  return (
    <ProfessorLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">My Classes</h1>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: "#6C63FF", color: "#fff" }}
          >
            <Plus className="w-4 h-4" /> Create New Class
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading classes...
          </div>
        ) : classes.length === 0 ? (
          <div
            className="rounded-2xl border p-16 text-center"
            style={{ background: "#12121A", borderColor: "#2A2A3E" }}
          >
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "#3A3A5A" }} />
            <h3 className="text-lg font-semibold text-foreground mb-1">No classes yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first class and share the join code with students.
            </p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: "#6C63FF", color: "#fff" }}
            >
              + Create First Class
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="rounded-xl border p-6 space-y-4"
                style={{ background: "#12121A", borderColor: "#2A2A3E" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{cls.name}</h3>
                    <p className="text-sm text-muted-foreground">{cls.subject}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: cls.is_active ? "rgba(0,200,150,0.1)" : "rgba(90,90,120,0.2)",
                        color: cls.is_active ? "#00C896" : "#6A6A8A",
                      }}
                    >
                      {cls.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => deleteClass(cls.id)}
                      className="p-1.5 rounded hover:bg-white/5"
                      style={{ color: "#5A5A7A" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">College:</span>
                    <span className="text-foreground truncate">{cls.college}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">Year:</span>
                    <span className="text-foreground">{cls.academic_year}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground">{cls.student_count ?? 0} students</span>
                  </div>
                </div>

                {/* Join code */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Class Join Code</p>
                  <div
                    className="rounded-lg px-4 py-3 flex items-center justify-between"
                    style={{ background: "#0A0A0F", border: "1px solid #2A2A3E" }}
                  >
                    <span
                      className="text-xl font-mono font-bold tracking-widest"
                      style={{ color: "#6C63FF", letterSpacing: "4px" }}
                    >
                      {cls.join_code}
                    </span>
                    <button
                      onClick={() => copyCode(cls.join_code, cls.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
                      style={{
                        background: copiedId === cls.id ? "rgba(0,200,150,0.1)" : "rgba(108,99,255,0.1)",
                        color: copiedId === cls.id ? "#00C896" : "#6C63FF",
                      }}
                    >
                      {copiedId === cls.id ? (
                        <><Check className="w-3 h-3" /> Copied!</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy</>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => navigate(`/professor/students?classId=${cls.id}`)}
                    className="text-sm font-medium"
                    style={{ color: "#6C63FF" }}
                  >
                    View Students
                  </button>
                  <span style={{ color: "#2A2A3E" }}>·</span>
                  <button
                    onClick={() => navigate(`/professor/assignments?classId=${cls.id}`)}
                    className="text-sm font-medium"
                    style={{ color: "#6C63FF" }}
                  >
                    Manage Assignments
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateClassDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={(cls) => setClasses((c) => [cls, ...c])}
      />
    </ProfessorLayout>
  );
}
