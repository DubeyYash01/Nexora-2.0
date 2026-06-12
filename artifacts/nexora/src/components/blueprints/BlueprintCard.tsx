import { useState } from "react";
import { GitFork, Heart, Eye, Clock, DollarSign, Cpu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";

export interface Blueprint {
  id: string;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  category: string;
  tags: string[];
  platform: string;
  estimated_cost_min: number;
  estimated_cost_max: number;
  estimated_time: string;
  fork_count: number;
  like_count: number;
  view_count: number;
  is_featured: boolean;
  author_id: string | null;
  components: { list: Array<{ name: string; type: string }> };
  build_plan: { steps: Array<{ title: string }> } | null;
  userLiked?: boolean;
  profiles?: { full_name: string; avatar_url: string | null } | null;
  ai_analysis?: {
    overview?: string;
    difficultyLevel?: string;
    platform?: string;
    skillsLearned?: string[];
    projectTitle?: string;
  } | null;
}

const DIFFICULTY_STYLES = {
  Beginner: { bg: "rgba(0,200,150,0.1)", color: "#00C896" },
  Intermediate: { bg: "rgba(255,184,77,0.1)", color: "#FFB84D" },
  Advanced: { bg: "rgba(255,90,90,0.1)", color: "#FF5A5A" },
};

const CATEGORY_BORDER: Record<string, string> = {
  "Home Automation": "#6C63FF",
  Agriculture: "#00C896",
  Security: "#FF5A5A",
  "Smart City": "#00D4FF",
  Environment: "#7EC850",
  Tracking: "#FFB84D",
  Health: "#FF6B9D",
};

export default function BlueprintCard({
  blueprint,
  onFork,
  onClick,
}: {
  blueprint: Blueprint;
  onFork: (bp: Blueprint) => void;
  onClick: (bp: Blueprint) => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(blueprint.userLiked ?? false);
  const [likeCount, setLikeCount] = useState(blueprint.like_count ?? 0);
  const [liking, setLiking] = useState(false);

  const diff = DIFFICULTY_STYLES[blueprint.difficulty] ?? DIFFICULTY_STYLES.Beginner;
  const borderColor = CATEGORY_BORDER[blueprint.category] ?? "#6C63FF";
  const compList = blueprint.components?.list ?? [];

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || liking) return;
    setLiking(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));
    try {
      await authFetch("/api/blueprints/like", { method: "POST", body: JSON.stringify({ blueprintId: blueprint.id }) });
    } catch { setLiked(!newLiked); setLikeCount((c) => (newLiked ? Math.max(0, c - 1) : c + 1)); }
    finally { setLiking(false); }
  };

  return (
    <div
      onClick={() => onClick(blueprint)}
      className="rounded-xl border flex flex-col overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        background: "#12121A",
        borderColor: "#2A2A3E",
        borderLeft: `3px solid ${borderColor}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.borderLeftColor = borderColor; e.currentTarget.style.boxShadow = "0 4px 20px rgba(108,99,255,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.borderLeftColor = borderColor; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Top */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-bold text-sm leading-tight" style={{ color: "#F0F0FF" }}>{blueprint.title}</span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: diff.bg, color: diff.color }}>
            {blueprint.difficulty}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#9090B0" }}>{blueprint.description}</p>

        {/* Components */}
        <div className="flex flex-wrap gap-1.5">
          {compList.slice(0, 3).map((c, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border"
              style={{ background: "#1A1A2E", borderColor: "#2A2A3E", color: "#9090B0" }}>
              {c.name}
            </span>
          ))}
          {compList.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border"
              style={{ background: "#1A1A2E", borderColor: "#2A2A3E", color: "#5A5A7A" }}>
              +{compList.length - 3}
            </span>
          )}
        </div>

        {/* Info row */}
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "#5A5A7A" }}>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{blueprint.estimated_time}</span>
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            ₹{blueprint.estimated_cost_min}–₹{blueprint.estimated_cost_max}
          </span>
          <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{blueprint.platform}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between border-t" style={{ borderColor: "#2A2A3E" }}>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "#5A5A7A" }}>
          <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{blueprint.fork_count}</span>
          <button
            onClick={handleLike}
            className="flex items-center gap-1 transition-colors"
            style={{ color: liked ? "#FF5A5A" : "#5A5A7A" }}
          >
            <Heart className="w-3 h-3" style={{ fill: liked ? "#FF5A5A" : "none" }} />
            {likeCount}
          </button>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{blueprint.view_count}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onFork(blueprint); }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
          style={{ borderColor: "#2A2A3E", color: "#9090B0", background: "transparent" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#6C63FF"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#9090B0"; }}
        >
          Fork
        </button>
      </div>
    </div>
  );
}
