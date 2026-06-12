import { useState } from "react";
import { GitFork, Heart, Eye, Clock, DollarSign, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import type { Blueprint } from "./BlueprintCard";

const CATEGORY_GRADIENTS: Record<string, string> = {
  "Home Automation": "linear-gradient(135deg, #4C35CC 0%, #1A3A8C 100%)",
  Agriculture: "linear-gradient(135deg, #00A86B 0%, #006B5B 100%)",
  Security: "linear-gradient(135deg, #CC2A35 0%, #7A1A00 100%)",
  "Smart City": "linear-gradient(135deg, #0078CC 0%, #003F7A 100%)",
  Environment: "linear-gradient(135deg, #2FAD40 0%, #5A7A00 100%)",
  Tracking: "linear-gradient(135deg, #CC7800 0%, #7A3A00 100%)",
  Health: "linear-gradient(135deg, #CC2A7A 0%, #7A0055 100%)",
};

const DIFFICULTY_STYLES = {
  Beginner: { bg: "rgba(0,200,150,0.2)", color: "#00C896" },
  Intermediate: { bg: "rgba(255,184,77,0.2)", color: "#FFB84D" },
  Advanced: { bg: "rgba(255,90,90,0.2)", color: "#FF5A5A" },
};

export default function FeaturedBlueprintCard({
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

  const gradient = CATEGORY_GRADIENTS[blueprint.category] ?? "linear-gradient(135deg, #4C35CC 0%, #1A1A2E 100%)";
  const diff = DIFFICULTY_STYLES[blueprint.difficulty] ?? DIFFICULTY_STYLES.Beginner;
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
      className="rounded-2xl border overflow-hidden flex flex-col cursor-pointer transition-all duration-200 flex-shrink-0"
      style={{ background: "#12121A", borderColor: "#2A2A3E", width: 340 }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(108,99,255,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Gradient header */}
      <div className="relative px-5 py-6" style={{ background: gradient, minHeight: 96 }}>
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: diff.bg, color: diff.color }}>
            {blueprint.difficulty}
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.3)", color: blueprint.author_id ? "#C0C0D0" : "#B0A0FF" }}>
            {blueprint.author_id ? "Community" : "✦ Official"}
          </span>
        </div>
        <p className="text-xs mt-3 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          {blueprint.category}
        </p>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-bold text-base leading-snug" style={{ color: "#F0F0FF" }}>{blueprint.title}</h3>
          <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: "#9090B0" }}>{blueprint.description}</p>
        </div>

        {/* Components */}
        <div className="flex flex-wrap gap-1.5">
          {compList.slice(0, 3).map((c, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}>
              {c.name}
            </span>
          ))}
          {compList.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "#1A1A2E", color: "#5A5A7A" }}>
              +{compList.length - 3} more
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "#5A5A7A" }}>
          <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{blueprint.fork_count}</span>
          <button onClick={handleLike} className="flex items-center gap-1 transition-colors"
            style={{ color: liked ? "#FF5A5A" : "#5A5A7A" }}>
            <Heart className="w-3 h-3" style={{ fill: liked ? "#FF5A5A" : "none" }} />{likeCount}
          </button>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{blueprint.view_count}</span>
          <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{blueprint.estimated_time}</span>
        </div>

        <div className="text-xs font-semibold" style={{ color: "#00C896" }}>
          ₹{blueprint.estimated_cost_min}–₹{blueprint.estimated_cost_max}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 flex flex-col gap-3">
        {/* Author */}
        <div className="flex items-center gap-2">
          {blueprint.author_id ? (
            <>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: "#6C63FF", color: "#fff" }}>
                {(blueprint.profiles?.full_name ?? "?")[0].toUpperCase()}
              </div>
              <span className="text-[11px]" style={{ color: "#9090B0" }}>
                @{(blueprint.profiles?.full_name ?? "Anonymous").replace(/\s+/g, "").toLowerCase()}
              </span>
            </>
          ) : (
            <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#8A80FF" }}>
              <Star className="w-3 h-3" fill="#8A80FF" /> Official Nexora Blueprint
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onFork(blueprint); }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "#6C63FF", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#5854E0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#6C63FF")}
        >
          Fork This Blueprint
        </button>
      </div>
    </div>
  );
}
