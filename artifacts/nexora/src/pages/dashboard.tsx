import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  useGetProjectStats,
  useGetProjects,
  getGetProjectStatsQueryKey,
  getGetProjectsQueryKey,
} from "@workspace/api-client-react";
import {
  LayoutDashboard, Folder, Plus, Grid2x2, Cpu,
  Sparkles, Settings, Bell, LogOut, Loader2,
  FolderOpen, Zap, CheckCircle2, Package,
  Lightbulb, ThermometerSun, ParkingSquare, Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectCard from "@/components/ui/ProjectCard";

export function DashboardLayout({
  children,
  title = "Dashboard",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { user, profile, signOut } = useAuth();
  const [location, setLocation] = useLocation();

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Folder, label: "My Projects", href: "/projects" },
    { icon: Plus, label: "New Project", href: "/projects/new" },
    { icon: Grid2x2, label: "Blueprints", href: "/blueprints" },
    { icon: Cpu, label: "My Components", href: "/components" },
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
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Nexora
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
              <Bell className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {initials}
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "User"}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

/* ─── Blueprints ─────────────────────────────────────────── */
const BLUEPRINTS = [
  {
    title: "Smart Plant Monitor",
    description: "Monitors soil moisture and auto-waters your plant",
    components: ["ESP32", "Soil Moisture Sensor", "Water Pump", "Relay Module"],
    difficulty: "Beginner",
    cost: "₹850",
    tag: "Popular",
    tagColor: "#00C896",
  },
  {
    title: "Home Temperature Logger",
    description: "Logs temperature and humidity with phone alerts",
    components: ["ESP32", "DHT22", "OLED Display"],
    difficulty: "Beginner",
    cost: "₹650",
    tag: "Staff Pick",
    tagColor: "#6C63FF",
  },
  {
    title: "Motion Security Alert",
    description: "Detects motion and sends WhatsApp/email notification",
    components: ["ESP32", "PIR Sensor", "Buzzer"],
    difficulty: "Intermediate",
    cost: "₹550",
    tag: "Trending",
    tagColor: "#FF5A5A",
  },
];

function DifficultyBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Beginner: "text-[#00C896] bg-[#00C896]/10 border-[#00C896]/20",
    Intermediate: "text-[#FFB84D] bg-[#FFB84D]/10 border-[#FFB84D]/20",
    Advanced: "text-[#FF5A5A] bg-[#FF5A5A]/10 border-[#FF5A5A]/20",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[level] || colors.Beginner}`}>
      {level}
    </span>
  );
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

  const firstName = profile?.full_name?.split(" ")[0] || "Builder";
  const recentProjects = (projects ?? []).slice(0, 3);

  const statCards = [
    { icon: FolderOpen, label: "Total Projects", value: stats?.total ?? 0 },
    { icon: Zap, label: "In Progress", value: stats?.in_progress ?? 0 },
    { icon: CheckCircle2, label: "Completed", value: stats?.completed ?? 0 },
    { icon: Package, label: "Components Saved", value: 0 },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {getGreeting()}, {firstName} 👋
            </h2>
            <p className="text-muted-foreground mt-1">What are you building today?</p>
          </div>
          <Button
            data-testid="btn-new-project"
            onClick={() => setLocation("/projects/new")}
            className="flex-shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="p-5 rounded-xl border transition-all duration-200 hover:border-primary/50"
              style={{ background: "#12121A", borderColor: "#2A2A3E" }}
            >
              <Icon className="w-5 h-5 mb-3" style={{ color: "#6C63FF" }} />
              <div className="text-3xl font-bold text-foreground mb-1">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : value}
              </div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Projects</h3>
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((p) => (
                <ProjectCard key={p.id} project={p as Parameters<typeof ProjectCard>[0]["project"]} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-10 flex flex-col items-center text-center"
              style={{ borderColor: "#2A2A3E", background: "#12121A" }}>
              <Sparkles className="w-12 h-12 mb-4" style={{ color: "#6C63FF" }} />
              <h4 className="text-lg font-semibold text-foreground mb-2">No projects yet</h4>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                Start by describing your IoT idea and let Nexora do the rest.
              </p>
              <Button data-testid="btn-create-first-project" onClick={() => setLocation("/projects/new")}>
                Create your first project
              </Button>
            </div>
          )}
        </div>

        {/* Blueprints */}
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Start from a Blueprint</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pre-built IoT project templates you can customize
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BLUEPRINTS.map((bp) => (
              <div
                key={bp.title}
                data-testid={`blueprint-card-${bp.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="p-5 rounded-xl border flex flex-col gap-3 transition-all duration-200 hover:border-primary/50"
                style={{ background: "#12121A", borderColor: "#2A2A3E" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-foreground text-sm leading-snug">{bp.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${bp.tagColor}18`, color: bp.tagColor }}>
                    {bp.tag}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{bp.description}</p>
                <div className="flex flex-wrap gap-1">
                  {bp.components.map((c) => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded border"
                      style={{ background: "#1A1A2E", color: "#9090B0", borderColor: "#2A2A3E" }}>
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t"
                  style={{ borderColor: "#2A2A3E" }}>
                  <div className="flex items-center gap-2">
                    <DifficultyBadge level={bp.difficulty} />
                    <span className="text-xs font-medium" style={{ color: "#00C896" }}>{bp.cost}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-3"
                    onClick={() => setLocation(`/projects/new?blueprint=${encodeURIComponent(bp.title)}`)}
                  >
                    Use Blueprint
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
