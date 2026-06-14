import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, ClipboardList, GitFork, CheckCircle, Sparkles, X } from "lucide-react";
import { authFetch } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(date: string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const typeIcon: Record<string, { Icon: typeof Bell; color: string }> = {
  assignment: { Icon: ClipboardList, color: "#6C63FF" },
  blueprint_fork: { Icon: GitFork, color: "#00D4FF" },
  step_complete: { Icon: CheckCircle, color: "#00C896" },
  ai_limit: { Icon: Sparkles, color: "#FFB84D" },
  system: { Icon: Bell, color: "#9090B0" },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useState<string>("");

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json() as { notifications: Notification[]; unreadCount: number };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const poll = () => { if (!document.hidden) fetchNotifications(); };
    const interval = setInterval(poll, 60_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markRead = async (ids: string[]) => {
    try {
      await authFetch("/api/notifications/read", {
        method: "PUT",
        body: JSON.stringify({ notificationIds: ids }),
      });
      setNotifications((prev) => prev.map((n) => (ids.length === 0 || ids.includes(n.id) ? { ...n, is_read: true } : n)));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleNotifClick = (n: Notification) => {
    if (!n.is_read) markRead([n.id]);
    if (n.link) window.location.href = n.link;
    setOpen(false);
  };

  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-white/5"
        style={{ color: "#9090B0" }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center font-bold"
            style={{
              top: -4, right: -4,
              minWidth: 18, height: 18,
              background: "#FF5A5A",
              color: "white",
              fontSize: 10,
              borderRadius: 9999,
              padding: "0 3px",
            }}
          >
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 z-50 flex flex-col"
          style={{
            width: 360,
            maxHeight: 480,
            background: "#12121A",
            border: "1px solid #2A2A3E",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1A1A2E" }}>
            <span className="font-bold text-sm" style={{ color: "#F0F0FF" }}>Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markRead([])}
                  className="text-xs"
                  style={{ color: "#6C63FF" }}
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ color: "#5A5A7A" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Bell className="w-8 h-8 mb-3" style={{ color: "#2A2A3E" }} />
                <p className="font-medium text-sm" style={{ color: "#9090B0" }}>No notifications yet</p>
                <p className="text-xs mt-1 text-center px-6" style={{ color: "#5A5A7A" }}>
                  We'll notify you about your projects and activity here
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const typeInfo = typeIcon[n.type] ?? typeIcon.system;
                const { Icon, color } = typeInfo;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="flex items-start gap-3 cursor-pointer transition-colors"
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #1A1A2E",
                      background: n.is_read ? "transparent" : "rgba(108,99,255,0.06)",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = n.is_read ? "transparent" : "rgba(108,99,255,0.06)")}
                  >
                    {!n.is_read && (
                      <div className="flex-shrink-0 mt-1.5" style={{ width: 6, height: 6, borderRadius: "50%", background: "#6C63FF" }} />
                    )}
                    <div className="flex-shrink-0" style={{ marginTop: n.is_read ? 0 : 0 }}>
                      <div
                        className="flex items-center justify-center"
                        style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18` }}
                      >
                        <Icon style={{ width: 14, height: 14, color }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "#F0F0FF" }}>{n.title}</p>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#9090B0" }}>{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: "#5A5A7A" }}>{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
