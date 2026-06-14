import { useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Folder, Grid2x2, Code2,
  Menu, X, Settings, LogOut, ClipboardList, Cpu,
  Plus, Sparkles, ChevronRight, Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/notifications/NotificationBell";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}

interface MobileNavProps {
  navItems: NavItem[];
}

const BOTTOM_TABS = [
  { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
  { icon: Folder, label: "Projects", href: "/projects" },
  { icon: Code2, label: "IDE", href: "/ide" },
  { icon: Grid2x2, label: "Blueprints", href: "/blueprints" },
];

export function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, profile } = useAuth();
  const initials =
    profile?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ||
    user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
      style={{ height: 56, background: "#0A0A0F", borderBottom: "1px solid #2A2A3E" }}
    >
      <button
        onClick={onMenuClick}
        className="flex items-center justify-center rounded-lg"
        style={{ width: 44, height: 44 }}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" style={{ color: "#F0F0FF" }} />
      </button>

      <div className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Nexora
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("nexora:open-search"))}
          className="flex items-center justify-center rounded-lg"
          style={{ width: 36, height: 36 }}
          aria-label="Search"
        >
          <Search className="w-4.5 h-4.5" style={{ color: "#9090B0" }} />
        </button>
        <NotificationBell />
        <div
          className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

export function MobileDrawer({
  isOpen,
  onClose,
  navItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
}) {
  const { user, profile, signOut } = useAuth();
  const [location, setLocation] = useLocation();

  const initials =
    profile?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ||
    user?.email?.[0]?.toUpperCase() || "U";

  const roleColors: Record<string, string> = {
    student: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    maker: "bg-green-500/10 text-green-400 border-green-500/20",
    professor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    professional: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  const handleNav = (href: string) => {
    setLocation(href);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/60"
          onClick={onClose}
          style={{ animation: "fadeIn 0.2s ease-out" }}
        />
      )}
      <div
        className="lg:hidden fixed top-0 left-0 bottom-0 z-[70] flex flex-col overflow-hidden"
        style={{
          width: 280,
          background: "#0A0A0F",
          borderRight: "1px solid #2A2A3E",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid #2A2A3E" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-base">
              {initials}
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">
                {profile?.full_name || user?.email?.split("@")[0] || "User"}
              </p>
              {profile?.plan && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}>
                  {profile.plan === "free" ? "Free" : profile.plan === "student_pro" ? "Student Pro" : "Maker Pro"}
                </span>
              )}
              {profile?.username && (
                <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>@{profile.username}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: "#6A6A8A" }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                className="w-full flex items-center gap-3 transition-all duration-150 text-left"
                style={{
                  height: 52,
                  padding: "0 16px",
                  background: isActive ? "rgba(108,99,255,0.12)" : "transparent",
                  color: isActive ? "#F0F0FF" : "#9090B0",
                  borderLeft: isActive ? "3px solid #6C63FF" : "3px solid transparent",
                }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-[15px]">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "#00D4FF", color: "#0A0A0F" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4" style={{ borderTop: "1px solid #2A2A3E" }}>
          <button
            onClick={() => handleNav("/settings")}
            className="w-full flex items-center gap-3 h-11 px-3 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "#9090B0" }}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[15px] font-medium">Settings</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 h-11 px-3 rounded-lg transition-colors hover:bg-red-500/10"
            style={{ color: "#FF6B6B" }}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[15px] font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

export function MobileBottomTabBar({ onMoreClick }: { onMoreClick: () => void }) {
  const [location, setLocation] = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        height: 64,
        background: "#0A0A0F",
        borderTop: "1px solid #2A2A3E",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {BOTTOM_TABS.map(({ icon: Icon, label, href }) => {
        const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));
        return (
          <button
            key={href}
            onClick={() => setLocation(href)}
            className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
            style={{ minWidth: 0 }}
          >
            {isActive && (
              <span className="absolute -mt-7 w-1.5 h-1.5 rounded-full" style={{ background: "#6C63FF" }} />
            )}
            <Icon
              className="w-[22px] h-[22px]"
              style={{ color: isActive ? "#6C63FF" : "#5A5A7A" }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? "#6C63FF" : "#5A5A7A" }}
            >
              {label}
            </span>
          </button>
        );
      })}
      <button
        onClick={onMoreClick}
        className="flex-1 flex flex-col items-center justify-center gap-1"
        style={{ minWidth: 0 }}
      >
        <Menu className="w-[22px] h-[22px]" style={{ color: "#5A5A7A" }} />
        <span className="text-[10px] font-medium" style={{ color: "#5A5A7A" }}>More</span>
      </button>
    </nav>
  );
}

export default function MobileNav({ navItems }: MobileNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
      />
      <MobileBottomTabBar onMoreClick={() => setDrawerOpen(true)} />
    </>
  );
}
