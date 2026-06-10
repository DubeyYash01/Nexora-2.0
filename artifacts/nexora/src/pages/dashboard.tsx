import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useGetProjectStats } from "@workspace/api-client-react";
import { 
  LayoutDashboard, Folder, Plus, Grid2x2, Cpu, 
  Sparkles, Settings, Bell, LogOut, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";

function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    student: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    maker: "bg-green-500/10 text-green-500 border-green-500/20",
    professor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    professional: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  const roleStyle = profile?.role ? roleColors[profile.role] || "bg-secondary text-secondary-foreground" : "bg-secondary text-secondary-foreground";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Nexora
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}>
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{profile?.full_name || "User"}</div>
              {profile?.role && (
                <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 border ${roleStyle}`}>
                  {profile.role}
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Bell className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useGetProjectStats({ query: { queryKey: ["/api/projects/stats"] } });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome back, {profile?.full_name?.split(' ')[0] || "Builder"}!
          </h1>
          <p className="text-muted-foreground">
            Ready to turn your next idea into reality?
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Projects</div>
            <div className="text-3xl font-bold flex items-center gap-2">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : (stats?.total || 0)}
            </div>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-1">In Progress</div>
            <div className="text-3xl font-bold flex items-center gap-2">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : (stats?.in_progress || 0)}
            </div>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-1">Completed</div>
            <div className="text-3xl font-bold flex items-center gap-2 text-success">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : (stats?.completed || 0)}
            </div>
          </div>
        </div>

        <div className="p-8 rounded-xl border border-dashed border-border bg-card/50 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Your dashboard is coming together</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            We're building out the full project management experience. More features dropping in the next build.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Start a New Project
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
