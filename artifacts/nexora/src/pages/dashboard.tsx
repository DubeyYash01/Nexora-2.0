import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import {
  useGetProjectStats,
  useGetProjects,
  getGetProjectStatsQueryKey,
  getGetProjectsQueryKey,
} from "@workspace/api-client-react";
import {
  LayoutDashboard, Folder, Plus, Grid2x2, Cpu,
  Sparkles, Settings, LogOut, Loader2,
  FolderOpen, Zap, CheckCircle2, Package,
  Lightbulb, ThermometerSun, ParkingSquare, Droplets,
  ClipboardList, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectCard from "@/components/ui/ProjectCard";
import NotificationBell from "@/components/notifications/NotificationBell";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import MobileNav from "@/components/ui/MobileNav";

export function DashboardLayout({
  children,
  title = "Dashboard",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { user, profile, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Folder, label: "My Projects", href: "/projects" },
    { icon: Plus, label: "New Project", href: "/projects/new" },
    { icon: Code2, label: "IDE", href: "/ide", badge: "NEW" },
    { icon: Grid2x2, label: "Blueprints", href: "/blueprints" },
    { icon: Cpu, label: "My Components", href: "/components" },
    ...(profile?.role === "student" ? [{ icon: ClipboardList, label: "Assignments", href: "/assignments" }] : []),
    ...(profile?.role === "professor" ? [{ icon: ClipboardList, label: "Professor Portal", href: "/professor" }] : []),
    { icon: Sparkles, label: "AI Assistant", href: "/assistant" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const roleColors: Record<string, string> = {
    student: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    maker: "bg-green-500/10 text-green-400 border-green-500/20",
    professor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    professional: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  const roleStyle = profile?.role
    ? roleColors[profile.role] || "bg-secondary text-secondary-foreground"
    : "bg-secondary text-secondary-foreground";

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 flex-col hidden lg:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Nexora
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const hasBadge = "badge" in item && item.badge;
            return (
              <button
                key={item.href}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setLocation(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-left ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent border border-transparent"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-sm">{item.label}</span>
                {hasBadge && (
                  <span
                    className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "#00D4FF", color: "#0A0A0F" }}
                  >
                    {String(item.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate text-foreground">
                {profile?.full_name || user?.email?.split("@")[0] || "User"}
              </div>
              {profile?.role && (
                <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 border ${roleStyle}`}>
                  {profile.role}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive text-sm h-8"
            onClick={handleSignOut}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <MobileNav navItems={navItems} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop header — hidden on mobile */}
        <header className="h-16 border-b border-border bg-card items-center justify-between px-6 flex-shrink-0 hidden lg:flex">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {initials}
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "User"}
            </span>
          </div>
        </header>

        {/* Main content — mobile padding accounts for fixed top/bottom bars */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pt-[calc(56px+16px)] pb-[calc(64px+16px)] lg:pt-6 lg:pb-6">
          {children}
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
}

interface DashBlueprint {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_cost_min: number;
  estimated_cost_max: number;
  fork_count: number;
  like_count: number;
  components: { list?: Array<{ name: string }> };
}

/* ─── Greeting ───────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ─── Dashboard page ─────────────────────────────────────── */
export default function Dashboard() {
  const { profile } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useGetProjectStats({
    query: { queryKey: getGetProjectStatsQueryKey() },
  });
  const { data: projects, isLoading: projectsLoading } = useGetProjects({
    query: { queryKey: getGetProjectsQueryKey() },
  });

  const [componentCount, setComponentCount] = useState(0);
  useEffect(() => {
    authFetch("/api/components/count")
      .then((r) => r.json())
      .then((d: { count?: number }) => setComponentCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  const [featuredBlueprints, setFeaturedBlueprints] = useState<DashBlueprint[]>([]);
  const [blueprintsLoading, setBlueprintsLoading] = useState(true);
  useEffect(() => {
    const loadBlueprints = async () => {
      try {
        await fetch("/api/blueprints/seed");
        const res = await authFetch("/api/blueprints?is_featured=true&limit=3&sort=popular");
        const data = await res.json() as { blueprints?: DashBlueprint[] };
        setFeaturedBlueprints((data.blueprints ?? []).slice(0, 3));
      } catch { /* silent */ }
      finally { setBlueprintsLoading(false); }
    };
    loadBlueprints();
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] || "Builder";
  const recentProjects = (projects ?? []).slice(0, 3);

  const statCards = [
    { icon: FolderOpen, label: "Total Projects", value: stats?.total ?? 0 },
    { icon: Zap, label: "In Progress", value: stats?.in_progress ?? 0 },
    { icon: CheckCircle2, label: "Completed", value: stats?.completed ?? 0 },
    { icon: Package, label: "Components Saved", value: componentCount },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8">

        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
              {getGreeting()}, {firstName} 👋
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">What are you building today?</p>
          </div>
          <Button
            data-testid="btn-new-project"
            onClick={() => setLocation("/projects/new")}
            className="flex-shrink-0 hidden sm:flex"
          >
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>

        {/* Stats — 2x2 on mobile, 4-col on desktop */}
        <div data-tour="stats-row" className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {statCards.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="p-4 lg:p-5 rounded-xl border transition-all duration-200 hover:border-primary/50"
              style={{ background: "#12121A", borderColor: "#2A2A3E" }}
            >
              <Icon className="w-5 h-5 mb-2 lg:mb-3" style={{ color: "#6C63FF" }} />
              <div className="text-2xl lg:text-3xl font-bold text-foreground mb-1">
                {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : value}
              </div>
              <div className="text-xs lg:text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base lg:text-lg font-semibold text-foreground">Recent Projects</h3>
            <button
              data-testid="link-view-all-projects"
              onClick={() => setLocation("/projects")}
              className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              View all →
            </button>
          </div>

          {projectsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((p: Parameters<typeof ProjectCard>[0]["project"]) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 lg:p-10 flex flex-col items-center text-center"
              style={{ borderColor: "#2A2A3E", background: "#12121A" }}>
              <Sparkles className="w-10 h-10 lg:w-12 lg:h-12 mb-4" style={{ color: "#6C63FF" }} />
              <h4 className="text-base lg:text-lg font-semibold text-foreground mb-2">No projects yet</h4>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                Start by describing your IoT idea and let Nexora do the rest.
              </p>
              <Button data-testid="btn-create-first-project" onClick={() => setLocation("/projects/new")}>
                Create your first project
              </Button>
            </div>
          )}
        </div>

        {/* Continue in IDE */}
        <div>
          <h3 className="text-base lg:text-lg font-semibold text-foreground mb-4">Continue in IDE</h3>
          <div
            className="flex items-center justify-between p-4 lg:p-5 rounded-xl border cursor-pointer transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(0,212,255,0.04) 100%)",
              borderColor: "#2A2A3E",
            }}
            onClick={() => setLocation("/ide")}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
          >
            <div className="flex items-center gap-3 lg:gap-4">
              <Code2 className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0" style={{ color: "#6C63FF" }} />
              <div>
                <p className="font-bold text-foreground text-sm lg:text-base">Nexora IDE</p>
                {(() => {
                  const inProgress = (projects ?? []).find((p: { status: string }) => p.status === "in_progress");
                  if (inProgress) {
                    return (
                      <p className="text-xs lg:text-sm mt-0.5" style={{ color: "#9090B0" }}>
                        Continue:{" "}
                        <span style={{ color: "#00D4FF" }}>
                          {(inProgress as { title: string }).title}
                        </span>
                      </p>
                    );
                  }
                  return <p className="text-xs lg:text-sm mt-0.5" style={{ color: "#9090B0" }}>Open the standalone code editor</p>;
                })()}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const inProgress = (projects ?? []).find((p: { status: string }) => p.status === "in_progress");
                if (inProgress) setLocation(`/workspace/${(inProgress as { id: string }).id}?panel=ide`);
                else setLocation("/ide");
              }}
              className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
              style={{ background: "#6C63FF", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#5A52E0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#6C63FF")}
            >
              <Code2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Open </span>IDE
            </button>
          </div>
        </div>

        {/* Blueprints */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base lg:text-lg font-semibold text-foreground">Start from a Blueprint</h3>
              <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                Pre-built IoT project templates you can customize
              </p>
            </div>
            <button onClick={() => setLocation("/blueprints")}
              className="text-sm transition-colors flex items-center gap-1"
              style={{ color: "#6C63FF" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#5854E0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6C63FF")}>
              View all →
            </button>
          </div>
          {blueprintsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#6C63FF" }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredBlueprints.map((bp) => {
                const diffColors: Record<string, { bg: string; color: string }> = {
                  Beginner: { bg: "rgba(0,200,150,0.1)", color: "#00C896" },
                  Intermediate: { bg: "rgba(255,184,77,0.1)", color: "#FFB84D" },
                  Advanced: { bg: "rgba(255,90,90,0.1)", color: "#FF5A5A" },
                };
                const d = diffColors[bp.difficulty] ?? diffColors.Beginner;
                const compList = bp.components?.list ?? [];
                return (
                  <div
                    key={bp.id}
                    className="p-4 lg:p-5 rounded-xl border flex flex-col gap-3 transition-all duration-200 cursor-pointer"
                    style={{ background: "#12121A", borderColor: "#2A2A3E" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; }}
                    onClick={() => setLocation(`/blueprints/${bp.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-foreground text-sm leading-snug">{bp.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: d.bg, color: d.color }}>
                        {bp.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{bp.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {compList.slice(0, 3).map((c) => (
                        <span key={c.name} className="text-[10px] px-1.5 py-0.5 rounded border"
                          style={{ background: "#1A1A2E", color: "#9090B0", borderColor: "#2A2A3E" }}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t"
                      style={{ borderColor: "#2A2A3E" }}>
                      <span className="text-xs font-semibold" style={{ color: "#00C896" }}>
                        ₹{bp.estimated_cost_min}–₹{bp.estimated_cost_max}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-3"
                        onClick={(e) => { e.stopPropagation(); setLocation(`/blueprints/${bp.id}`); }}
                      >
                        Use Blueprint
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Mobile FAB — New Project */}
      <button
        onClick={() => setLocation("/projects/new")}
        className="lg:hidden fixed z-40 flex items-center justify-center rounded-full shadow-lg"
        style={{
          bottom: 80,
          right: 16,
          width: 56,
          height: 56,
          background: "#6C63FF",
          boxShadow: "0 4px 20px rgba(108,99,255,0.5)",
        }}
        aria-label="New Project"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
    </DashboardLayout>
  );
}
