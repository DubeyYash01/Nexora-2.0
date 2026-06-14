import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Users, ClipboardList, Inbox,
  GraduationCap, BarChart2, Settings, Bell, LogOut,
  Monitor,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/professor" },
  { icon: Users, label: "My Classes", href: "/professor/classes" },
  { icon: ClipboardList, label: "Assignments", href: "/professor/assignments" },
  { icon: Inbox, label: "Submissions", href: "/professor/submissions" },
  { icon: GraduationCap, label: "Students", href: "/professor/students" },
  { icon: BarChart2, label: "Analytics", href: "/professor/analytics" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const [location, setLocation] = useLocation();

  const initials = profile?.full_name
    ?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "P";

  const lastName = profile?.full_name?.split(" ").slice(-1)[0] ?? "";

  return (
    <div className="flex min-h-screen" style={{ background: "#0A0A0F" }}>
      {/* Mobile banner */}
      <div
        className="sm:hidden fixed top-0 left-0 right-0 z-50 px-4 py-2 text-xs text-center font-medium"
        style={{ background: "#1A0A2E", color: "#FFB84D", borderBottom: "1px solid #2A1A3E" }}
      >
        Professor dashboard works best on desktop.
      </div>

      {/* Sidebar */}
      <aside
        className="hidden sm:flex flex-col w-60 shrink-0 border-r h-screen sticky top-0"
        style={{ background: "#0D0D15", borderColor: "#1A1A2E" }}
      >
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: "#1A1A2E" }}>
          <div className="text-lg font-bold" style={{
            background: "linear-gradient(135deg, #6C63FF, #00D4FF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Nexora
          </div>
          <p className="text-xs mt-0.5" style={{ color: "#4A4A6A" }}>Professor Portal</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = location === href || (href !== "/professor" && location.startsWith(href));
            return (
              <button
                key={href}
                onClick={() => setLocation(href)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
                style={{
                  background: active ? "rgba(108,99,255,0.12)" : "transparent",
                  color: active ? "#6C63FF" : "#6A6A8A",
                  borderLeft: active ? "2px solid #6C63FF" : "2px solid transparent",
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: "#1A1A2E" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF" }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                Prof. {lastName}
              </p>
              <span
                className="text-xs px-1.5 py-0.5 rounded font-semibold"
                style={{ background: "rgba(255,184,77,0.15)", color: "#FFB84D" }}
              >
                Professor
              </span>
            </div>
          </div>
          <button
            onClick={async () => { await signOut(); setLocation("/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
            style={{ color: "#5A5A7A" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header
          className="hidden sm:flex items-center justify-between px-6 py-3 border-b shrink-0"
          style={{ background: "#0D0D15", borderColor: "#1A1A2E" }}
        >
          <div />
          <div className="flex items-center gap-4">
            <button
              className="relative p-2 rounded-lg"
              style={{ color: "#6A6A8A" }}
            >
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF" }}
              >
                {initials}
              </div>
              <span className="text-sm font-medium text-foreground">
                {profile?.full_name ?? "Professor"}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded font-semibold"
                style={{ background: "rgba(255,184,77,0.15)", color: "#FFB84D" }}
              >
                Professor
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:pt-6 pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function ProtectedProfessorRoute({ component: Component }: { component: React.ComponentType }) {
  const { profile, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile || profile.role !== "professor") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0A0A0F" }}>
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-6xl mb-4">🔒</div>
          <Monitor className="w-16 h-16 mx-auto" style={{ color: "#FF5A5A" }} />
          <h1 className="text-2xl font-bold text-foreground">Professor Access Only</h1>
          <p className="text-muted-foreground">
            This area is for educators. If you're a professor, update your role in Settings.
          </p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="px-6 py-2.5 rounded-lg font-semibold text-sm"
            style={{ background: "#6C63FF", color: "#fff" }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <Component />;
}
