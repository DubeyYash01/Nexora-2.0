import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Globe, Calendar, Folder, GitFork, Eye, User, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReportModal from "@/components/admin/ReportModal";

interface PublicProfile {
  id: string;
  full_name: string;
  username: string;
  bio?: string;
  role?: string;
  location?: string;
  website?: string;
  created_at: string;
  profile_views?: number;
  is_profile_public?: boolean;
}

interface Blueprint {
  id: string; title: string; description?: string; difficulty?: string; category?: string;
  fork_count?: number; like_count?: number; created_at: string;
}
interface Project {
  id: string; title: string; description?: string; status: string; created_at: string;
}

const roleColors: Record<string, string> = {
  student: "#3B82F6", maker: "#10B981", professor: "#F97316", professional: "#8B5CF6",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:username");
  const username = params?.username;
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<{ profile: PublicProfile; blueprints: Blueprint[]; projects: Project[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"blueprints" | "projects">("blueprints");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`/api/profile/${username}`)
      .then((r) => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
      .then((d: { profile: PublicProfile; blueprints: Blueprint[]; projects: Project[] }) => setData(d))
      .catch((e: string) => setError(e || "Profile not found"))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0A0A0F" }}>
        <User className="w-12 h-12 mb-4" style={{ color: "#2A2A3E" }} />
        <h2 className="text-xl font-semibold mb-2" style={{ color: "#F0F0FF" }}>
          {error === "This profile is private" ? "This profile is private" : "User not found"}
        </h2>
        <p className="text-sm mb-6" style={{ color: "#9090B0" }}>
          {error === "This profile is private"
            ? "This user has set their profile to private."
            : "We couldn't find a user with that username."}
        </p>
        <Button onClick={() => setLocation("/dashboard")} className="bg-primary text-white">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const { profile: p, blueprints, projects } = data;
  const isOwn = user && profile && p.id === user.id;
  const initials = p.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? p.username?.[0]?.toUpperCase() ?? "U";
  const roleColor = roleColors[p.role ?? ""] ?? "#9090B0";

  return (
    <>
    <div className="min-h-screen pb-12" style={{ background: "#0A0A0F" }}>
      <div className="max-w-3xl mx-auto px-4 pt-12">

        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          <div
            className="flex-shrink-0 flex items-center justify-center font-bold text-white text-3xl"
            style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #00D4FF)" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>{p.full_name}</h1>
                {p.username && <p className="text-sm mt-0.5" style={{ color: "#9090B0" }}>@{p.username}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isOwn ? (
                  <Button variant="outline" size="sm" onClick={() => setLocation("/settings")}>
                    Edit Profile
                  </Button>
                ) : (
                  <button
                    onClick={() => setReportOpen(true)}
                    title="Report this profile"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all"
                    style={{ borderColor: "#2A2A3E", color: "#5A5A7A" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#FF5A5A"; e.currentTarget.style.borderColor = "rgba(255,90,90,0.3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#5A5A7A"; e.currentTarget.style.borderColor = "#2A2A3E"; }}
                  >
                    <Flag className="w-3.5 h-3.5" /> Report
                  </button>
                )}
              </div>
            </div>

            {p.bio && <p className="text-sm mt-3 leading-relaxed" style={{ color: "#9090B0" }}>{p.bio}</p>}

            <div className="flex flex-wrap gap-4 mt-3">
              {p.role && (
                <span
                  className="text-xs font-semibold capitalize px-2.5 py-1 rounded-full border"
                  style={{ color: roleColor, borderColor: `${roleColor}40`, background: `${roleColor}15` }}
                >
                  {p.role}
                </span>
              )}
              {p.location && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "#9090B0" }}>
                  <MapPin className="w-3.5 h-3.5" /> {p.location}
                </span>
              )}
              {p.website && (
                <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: "#6C63FF" }}>
                  <Globe className="w-3.5 h-3.5" /> {p.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span className="flex items-center gap-1 text-xs" style={{ color: "#5A5A7A" }}>
                <Calendar className="w-3.5 h-3.5" /> Member since {formatDate(p.created_at)}
              </span>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-4">
              {[
                { icon: Folder, label: "Projects", value: projects.length },
                { icon: GitFork, label: "Blueprints", value: blueprints.length },
                { icon: Eye, label: "Profile views", value: p.profile_views ?? 0 },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: "#5A5A7A" }} />
                  <span className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>{value}</span>
                  <span className="text-xs" style={{ color: "#5A5A7A" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "#2A2A3E" }}>
          {(["blueprints", "projects"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-medium capitalize transition-all"
              style={{
                color: tab === t ? "#F0F0FF" : "#9090B0",
                borderBottom: tab === t ? "2px solid #6C63FF" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t} ({t === "blueprints" ? blueprints.length : projects.length})
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "blueprints" && (
          blueprints.length === 0
            ? <EmptyTab message="No public blueprints yet" />
            : (
              <div className="grid sm:grid-cols-2 gap-4">
                {blueprints.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setLocation(`/blueprints/${b.id}`)}
                    className="p-4 rounded-xl cursor-pointer transition-all"
                    style={{ background: "#12121A", border: "1px solid #2A2A3E" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
                  >
                    <h3 className="font-semibold text-sm mb-1" style={{ color: "#F0F0FF" }}>{b.title}</h3>
                    {b.description && <p className="text-xs line-clamp-2 mb-3" style={{ color: "#9090B0" }}>{b.description}</p>}
                    <div className="flex items-center gap-3 text-xs" style={{ color: "#5A5A7A" }}>
                      <span className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {b.fork_count ?? 0}</span>
                      {b.difficulty && <span className="px-2 py-0.5 rounded-full" style={{ background: "#1A1A2E" }}>{b.difficulty}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
        )}

        {tab === "projects" && (
          projects.length === 0
            ? <EmptyTab message="No public projects yet" />
            : (
              <div className="grid sm:grid-cols-2 gap-4">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-4 rounded-xl" style={{ background: "#12121A", border: "1px solid #2A2A3E" }}>
                    <h3 className="font-semibold text-sm mb-1" style={{ color: "#F0F0FF" }}>{proj.title}</h3>
                    {proj.description && <p className="text-xs line-clamp-2" style={{ color: "#9090B0" }}>{proj.description}</p>}
                    <span
                      className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{ background: "#1A1A2E", color: "#9090B0" }}
                    >
                      {proj.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </div>
    <ReportModal
      open={reportOpen}
      onClose={() => setReportOpen(false)}
      contentType="profile"
      contentId={data?.profile.id ?? ""}
      contentTitle={data?.profile.full_name}
    />
    </>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm" style={{ color: "#5A5A7A" }}>{message}</p>
    </div>
  );
}
