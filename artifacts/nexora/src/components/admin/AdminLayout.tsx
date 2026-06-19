import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Users, GitBranch, IndianRupee, Sparkles,
  Flag, Megaphone, Building, Settings2, ArrowLeft, Rocket,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: GitBranch, label: "Blueprints", href: "/admin/blueprints" },
  { icon: IndianRupee, label: "Revenue", href: "/admin/revenue" },
  { icon: Sparkles, label: "AI Usage", href: "/admin/ai-usage" },
  { icon: Flag, label: "Reports", href: "/admin/reports" },
  { icon: Megaphone, label: "Announcements", href: "/admin/announcements" },
  { icon: Building, label: "College Inquiries", href: "/admin/college" },
  { icon: Settings2, label: "Platform Settings", href: "/admin/settings" },
  { icon: Rocket, label: "Launch Check", href: "/admin/launch-check" },
];

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: "Super Admin", color: "#FFB84D", bg: "rgba(255,184,77,0.12)" },
  admin: { label: "Admin", color: "#6C63FF", bg: "rgba(108,99,255,0.12)" },
  moderator: { label: "Moderator", color: "#00D4FF", bg: "rgba(0,212,255,0.12)" },
};

export default function AdminLayout({
  children,
  adminRole,
}: {
  children: React.ReactNode;
  adminRole?: string | null;
}) {
  const { profile } = useAuth();
  const [location, setLocation] = useLocation();

  const badge = ROLE_BADGE[adminRole ?? "admin"] ?? ROLE_BADGE.admin;
  const initials =
    profile?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ||
    profile?.email?.[0]?.toUpperCase() ||
    "A";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0A0A0F" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 h-screen sticky top-0"
        style={{ width: 220, background: "#080810", borderRight: "1px solid #1A1A2E" }}
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: "#1A1A2E" }}>
          <div className="font-bold text-base mb-1" style={{ color: "#F0F0FF" }}>
            Nexora Admin
          </div>
          <div
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mb-2"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </div>
          <div className="text-xs" style={{ color: "#FF5A5A" }}>
            Internal tools only
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = location === href || (href !== "/admin" && location.startsWith(href));
            return (
              <button
                key={href}
                onClick={() => setLocation(href)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
                style={{
                  background: active ? "rgba(255,184,77,0.08)" : "transparent",
                  color: active ? "#FFB84D" : "#6A6A8A",
                  borderLeft: active ? "2px solid #FFB84D" : "2px solid transparent",
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* User area */}
        <div className="p-4 border-t" style={{ borderColor: "#1A1A2E" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "#FFB84D", color: "#080810" }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "#F0F0FF" }}>
                {profile?.full_name || profile?.email || "Admin"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-3 shrink-0 border-b"
          style={{ background: "#080810", borderColor: "#1A1A2E" }}
        >
          <div className="text-xs font-medium" style={{ color: "#4A4A6A" }}>
            {NAV_ITEMS.find((n) => location === n.href || (n.href !== "/admin" && location.startsWith(n.href)))?.label ?? "Admin"}
          </div>
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "#9090B0", background: "rgba(255,255,255,0.04)" }}
          >
            <ArrowLeft className="w-3 h-3" />
            Back to App
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 32 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
