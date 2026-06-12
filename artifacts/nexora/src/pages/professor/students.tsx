import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import ProfessorLayout from "@/components/professor/ProfessorLayout";
import { useLocation } from "wouter";
import { Loader2, GraduationCap } from "lucide-react";

interface Student { id: string; full_name: string; email: string; avatar_url?: string; joined_at: string }
interface Class { id: string; name: string }

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  if (url) return <img src={url} className="w-9 h-9 rounded-full object-cover" alt={name} />;
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF" }}>
      {initials}
    </div>
  );
}

export default function ProfessorStudents() {
  const { user } = useAuth();
  const [location] = useLocation();
  const classId = new URLSearchParams(location.split("?")[1]).get("classId") ?? "";
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState(classId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch(`/api/classes/professor/${user.id}`)
      .then(r => r.json())
      .then(({ classes: c }) => {
        setClasses(c ?? []);
        if (!selectedClass && c?.length > 0) setSelectedClass(c[0].id);
      });
  }, [user]);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    authFetch(`/api/classes/${selectedClass}/students`)
      .then(r => r.json())
      .then(({ students: s }) => setStudents((s ?? []).map((m: { profiles: Student; joined_at: string }) => ({ ...m.profiles, joined_at: m.joined_at }))))
      .finally(() => setLoading(false));
  }, [selectedClass]);

  return (
    <ProfessorLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          {classes.length > 0 && (
            <select className="px-3 py-2 rounded-lg border text-sm bg-background text-foreground" style={{ borderColor: "#2A2A3E" }} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading students...</div>
        ) : students.length === 0 ? (
          <div className="rounded-2xl border p-12 text-center" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
            <GraduationCap className="w-12 h-12 mx-auto mb-3" style={{ color: "#3A3A5A" }} />
            <p className="text-foreground font-medium">No students yet</p>
            <p className="text-sm text-muted-foreground mt-1">Share the class join code to enroll students</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2A2A3E" }}>
                  {["Student","Email","Joined"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#5A5A7A" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: "#1A1A2A" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.full_name} url={s.avatar_url} />
                        <span className="font-medium text-foreground">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.joined_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProfessorLayout>
  );
}
