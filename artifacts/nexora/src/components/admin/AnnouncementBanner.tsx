import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, CheckCircle, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "maintenance";
  target_roles: string[];
  is_active: boolean;
  show_until?: string;
}

const TYPE_CONFIG = {
  info: {
    bg: "rgba(0,212,255,0.08)",
    border: "#00D4FF",
    color: "#00D4FF",
    icon: Info,
  },
  warning: {
    bg: "rgba(255,184,77,0.08)",
    border: "#FFB84D",
    color: "#FFB84D",
    icon: AlertTriangle,
  },
  success: {
    bg: "rgba(0,200,150,0.08)",
    border: "#00C896",
    color: "#00C896",
    icon: CheckCircle,
  },
  maintenance: {
    bg: "rgba(255,90,90,0.08)",
    border: "#FF5A5A",
    color: "#FF5A5A",
    icon: Wrench,
  },
};

const PRIORITY: Record<string, number> = { maintenance: 4, warning: 3, info: 2, success: 1 };
const STORAGE_KEY = "nexora_dismissed_announcements";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addDismissed(id: string) {
  const current = getDismissed();
  if (!current.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, id]));
  }
}

export default function AnnouncementBanner() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then(({ announcements: all }) => {
        const dismissed = getDismissed();
        const userRole = profile?.role ?? "student";
        const filtered = (all ?? [])
          .filter((a: Announcement) => !dismissed.includes(a.id))
          .filter((a: Announcement) => !a.target_roles?.length || a.target_roles.includes(userRole))
          .sort((a: Announcement, b: Announcement) => (PRIORITY[b.type] ?? 0) - (PRIORITY[a.type] ?? 0));
        setAnnouncements(filtered);
      })
      .catch(() => {});
  }, [profile?.role]);

  if (!announcements.length) return null;

  const active = announcements[current] ?? announcements[0];
  if (!active) return null;

  const cfg = TYPE_CONFIG[active.type] ?? TYPE_CONFIG.info;
  const Icon = cfg.icon;

  const dismiss = () => {
    addDismissed(active.id);
    const next = announcements.filter((a) => a.id !== active.id);
    setAnnouncements(next);
    setCurrent(0);
  };

  const urlMatch = active.message.match(/\[([^\]]+)\]\(([^)]+)\)/);

  return (
    <div
      className="relative flex items-center justify-center px-4 shrink-0"
      style={{
        height: 44,
        background: cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
      }}
    >
      <div className="flex items-center gap-2 text-sm max-w-4xl mx-auto w-full justify-center">
        <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
        <span className="font-medium" style={{ color: cfg.color }}>{active.title}</span>
        <span className="text-xs truncate max-w-xs sm:max-w-none" style={{ color: "#B0B0D0" }}>
          {urlMatch ? active.message.replace(urlMatch[0], "") : active.message}
        </span>
        {urlMatch && (
          <a
            href={urlMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline"
            style={{ color: cfg.color }}
          >
            {urlMatch[1]} →
          </a>
        )}
        {announcements.length > 1 && (
          <div className="flex items-center gap-1 ml-2">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{ background: i === current ? cfg.color : `${cfg.color}40` }}
              />
            ))}
          </div>
        )}
      </div>
      <button
        onClick={dismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
        style={{ color: "#6A6A8A" }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
