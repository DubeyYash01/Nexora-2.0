import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import { DashboardLayout } from "./dashboard";
import {
  ArrowLeft, GitFork, Heart, ChevronDown, ChevronRight,
  Clock, DollarSign, Cpu, Star, Loader2, CheckCircle2, Package,
  AlertCircle,
} from "lucide-react";
import ForkModal from "@/components/blueprints/ForkModal";
import type { Blueprint } from "@/components/blueprints/BlueprintCard";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

interface FullBlueprint extends Blueprint {
  reviews: Review[];
  userForked: boolean;
}

type TabType = "Overview" | "Components" | "Build Plan" | "Reviews";

const DIFFICULTY_STYLES = {
  Beginner: { bg: "rgba(0,200,150,0.1)", color: "#00C896" },
  Intermediate: { bg: "rgba(255,184,77,0.1)", color: "#FFB84D" },
  Advanced: { bg: "rgba(255,90,90,0.1)", color: "#FF5A5A" },
};

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} style={{ width: size, height: size, color: s <= rating ? "#FFB84D" : "#2A2A3E", fill: s <= rating ? "#FFB84D" : "none" }} />
      ))}
    </div>
  );
}

export default function BlueprintDetailPage() {
  const [, params] = useRoute("/blueprints/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const id = params?.id ?? "";

  const [blueprint, setBlueprint] = useState<FullBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("Overview");
  const [forkOpen, setForkOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Inventory match
  const [inventoryMatched, setInventoryMatched] = useState<Record<string, boolean>>({});
  const [showInventoryMatch, setShowInventoryMatch] = useState(false);
  const [matchingInventory, setMatchingInventory] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchFn = user ? authFetch : fetch;
    fetchFn(`/api/blueprints/${id}`)
      .then((r) => r.json())
      .then((data: { blueprint?: FullBlueprint }) => {
        if (data.blueprint) {
          setBlueprint(data.blueprint);
          setLiked(data.blueprint.userLiked ?? false);
          setLikeCount(data.blueprint.like_count ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleLike = async () => {
    if (!user) { setLocation("/login"); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => newLiked ? c + 1 : Math.max(0, c - 1));
    try {
      await authFetch("/api/blueprints/like", { method: "POST", body: JSON.stringify({ blueprintId: id }) });
    } catch { setLiked(!newLiked); }
  };

  const matchInventory = async () => {
    if (!user) return;
    setMatchingInventory(true);
    try {
      const res = await authFetch("/api/components/me");
      const data = await res.json() as { components?: Array<{ name: string }> };
      const inventory = (data.components ?? []).map((c) => c.name.toLowerCase());
      const compList = blueprint?.components?.list ?? [];
      const matched: Record<string, boolean> = {};
      compList.forEach((c) => {
        const cLow = c.name.toLowerCase();
        matched[c.name] = inventory.some((inv) => inv.includes(cLow) || cLow.includes(inv));
      });
      setInventoryMatched(matched);
      setShowInventoryMatch(true);
    } finally { setMatchingInventory(false); }
  };

  const submitReview = async () => {
    if (!user) return;
    setSubmittingReview(true);
    try {
      const res = await authFetch("/api/blueprints/review", {
        method: "POST",
        body: JSON.stringify({ blueprintId: id, rating: reviewRating, reviewText }),
      });
      const data = await res.json() as { review?: Review };
      if (data.review && blueprint) {
        setBlueprint((prev) => prev ? { ...prev, reviews: [data.review!, ...(prev.reviews.filter((r) => r.user_id !== user.id))] } : prev);
        setReviewText("");
      }
    } finally { setSubmittingReview(false); }
  };

  if (loading) {
    return (
      <DashboardLayout title="Blueprint">
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#6C63FF" }} />
        </div>
      </DashboardLayout>
    );
  }

  if (!blueprint) {
    return (
      <DashboardLayout title="Blueprint">
        <div className="flex flex-col items-center py-20 gap-4">
          <AlertCircle className="w-12 h-12" style={{ color: "#FF5A5A" }} />
          <p style={{ color: "#9090B0" }}>Blueprint not found</p>
          <button onClick={() => setLocation("/blueprints")} className="text-sm" style={{ color: "#6C63FF" }}>← Back to Library</button>
        </div>
      </DashboardLayout>
    );
  }

  const diff = DIFFICULTY_STYLES[blueprint.difficulty] ?? DIFFICULTY_STYLES.Beginner;
  const compList = blueprint.components?.list ?? [];
  const steps = blueprint.build_plan?.steps ?? [];
  const avgRating = blueprint.reviews.length > 0
    ? Math.round(blueprint.reviews.reduce((s, r) => s + r.rating, 0) / blueprint.reviews.length)
    : 0;
  const ownedCount = Object.values(inventoryMatched).filter(Boolean).length;
  const neededCost = showInventoryMatch
    ? compList.filter((c) => !inventoryMatched[c.name]).reduce((s, c) => s + ((c as { estimatedCost?: number }).estimatedCost ?? 0), 0)
    : 0;

  return (
    <DashboardLayout title={blueprint.title}>
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Breadcrumb */}
        <button onClick={() => setLocation("/blueprints")}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "#9090B0" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#6C63FF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9090B0")}>
          <ArrowLeft className="w-4 h-4" /> Blueprints / {blueprint.title}
        </button>

        {/* Hero */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: diff.bg, color: diff.color }}>
              {blueprint.difficulty}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>
              {blueprint.category}
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>
              <Clock className="w-3 h-3" /> {blueprint.estimated_time}
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: "#2A2A3E", color: "#00C896" }}>
              <DollarSign className="w-3 h-3" /> ₹{blueprint.estimated_cost_min}–₹{blueprint.estimated_cost_max}
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: "#2A2A3E", color: "#9090B0" }}>
              <GitFork className="w-3 h-3" /> {blueprint.fork_count} forks
            </span>
          </div>

          <h1 className="text-3xl font-black" style={{ color: "#F0F0FF" }}>{blueprint.title}</h1>
          <p className="text-base leading-relaxed" style={{ color: "#9090B0" }}>{blueprint.description}</p>

          {/* Author */}
          <div className="flex items-center gap-2">
            {blueprint.author_id ? (
              <>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "#6C63FF", color: "#fff" }}>
                  {(blueprint.profiles?.full_name ?? "?")[0].toUpperCase()}
                </div>
                <span className="text-sm" style={{ color: "#9090B0" }}>
                  {blueprint.profiles?.full_name ?? "Community Member"} · Published
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "#8A80FF" }}>
                <Star className="w-3.5 h-3.5" fill="#8A80FF" /> Official Nexora Blueprint
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => user ? setForkOpen(true) : setLocation(`/signup?blueprint=${id}`)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "#6C63FF", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#5854E0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#6C63FF")}
            >
              <GitFork className="w-4 h-4" /> Fork This Blueprint
            </button>
            <button
              onClick={handleLike}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{ borderColor: liked ? "rgba(255,90,90,0.5)" : "#2A2A3E", color: liked ? "#FF5A5A" : "#9090B0", background: liked ? "rgba(255,90,90,0.06)" : "transparent" }}
            >
              <Heart className="w-4 h-4" style={{ fill: liked ? "#FF5A5A" : "none" }} /> {likeCount}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b" style={{ borderColor: "#2A2A3E" }}>
          <div className="flex gap-0">
            {(["Overview", "Components", "Build Plan", "Reviews"] as TabType[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-5 py-3 text-sm font-medium transition-all"
                style={{ color: tab === t ? "#6C63FF" : "#5A5A7A", borderBottom: tab === t ? "2px solid #6C63FF" : "2px solid transparent" }}>
                {t}
                {t === "Reviews" && blueprint.reviews.length > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}>
                    {blueprint.reviews.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === "Overview" && (
          <div className="space-y-6">
            {(blueprint.ai_analysis?.skillsLearned?.length ?? 0) > 0 && (
              <div className="p-5 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                <h3 className="font-bold mb-3" style={{ color: "#F0F0FF" }}>What you'll learn</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(blueprint.ai_analysis?.skillsLearned ?? []).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00C896" }} />
                      <span style={{ color: "#C0C0D0" }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="p-5 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
              <h3 className="font-bold mb-2" style={{ color: "#F0F0FF" }}>Overview</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#9090B0" }}>
                {blueprint.ai_analysis?.overview ?? blueprint.description}
              </p>
            </div>
            <div className="p-5 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
              <h3 className="font-bold mb-2" style={{ color: "#F0F0FF" }}>Who is this for</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#9090B0" }}>
                This project is ideal for <strong style={{ color: "#F0F0FF" }}>{blueprint.difficulty}</strong> makers working with the <strong style={{ color: "#F0F0FF" }}>{blueprint.platform}</strong> platform. Estimated time: <strong style={{ color: "#F0F0FF" }}>{blueprint.estimated_time}</strong>.
              </p>
            </div>
          </div>
        )}

        {tab === "Components" && (
          <div className="space-y-4">
            {/* Inventory match */}
            {user && (
              <div className="p-4 rounded-xl border flex items-center justify-between gap-4"
                style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                <div>
                  {showInventoryMatch ? (
                    <>
                      <p className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>
                        You own {ownedCount} of {compList.length} components
                      </p>
                      {neededCost > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>
                          You need ~₹{neededCost.toLocaleString("en-IN")} more
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: "#9090B0" }}>Check what you already own</p>
                  )}
                </div>
                <button
                  onClick={matchInventory}
                  disabled={matchingInventory}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-all flex-shrink-0"
                  style={{ borderColor: "#6C63FF", color: "#6C63FF", background: "rgba(108,99,255,0.06)" }}
                >
                  {matchingInventory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {showInventoryMatch ? "Rematch" : "Match with my inventory"}
                </button>
              </div>
            )}

            {/* Component list */}
            <div className="space-y-2">
              {compList.map((c, i) => {
                const comp = c as { name: string; type: string; purpose: string; estimatedCost?: number; isEssential?: boolean };
                const owned = inventoryMatched[comp.name];
                return (
                  <div key={i} className="p-4 rounded-xl border flex items-center gap-3"
                    style={{ background: "#12121A", borderColor: showInventoryMatch && owned ? "rgba(0,200,150,0.3)" : "#2A2A3E" }}>
                    <Package className="w-4 h-4 flex-shrink-0" style={{ color: "#6C63FF" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "#F0F0FF" }}>{comp.name}</span>
                        {showInventoryMatch && owned && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border"
                            style={{ color: "#00D4FF", borderColor: "rgba(0,212,255,0.3)", background: "rgba(0,212,255,0.08)" }}>
                            ✓ In inventory
                          </span>
                        )}
                        {!comp.isEssential && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border"
                            style={{ color: "#9090B0", borderColor: "#2A2A3E", background: "#1A1A2E" }}>Optional</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "#9090B0" }}>{comp.purpose}</p>
                    </div>
                    {comp.estimatedCost != null && (
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: "#00C896" }}>
                        ₹{comp.estimatedCost}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Shopping list CTA */}
            <button
              onClick={() => setForkOpen(true)}
              className="w-full py-3 rounded-xl border text-sm font-medium transition-all"
              style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#6C63FF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#9090B0"; }}>
              Fork to generate a personalized shopping list →
            </button>
          </div>
        )}

        {tab === "Build Plan" && (
          <div className="space-y-3">
            {steps.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "#5A5A7A" }}>No build plan available for this blueprint</p>
            ) : (
              steps.map((step) => {
                const s = step as { stepNumber: number; title: string; phase?: string; objective?: string; duration?: string; instructions?: string[] };
                const isOpen = expandedSteps.has(s.stepNumber);
                return (
                  <div key={s.stepNumber} className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A3E" }}>
                    <button
                      onClick={() => setExpandedSteps((prev) => { const n = new Set(prev); n.has(s.stepNumber) ? n.delete(s.stepNumber) : n.add(s.stepNumber); return n; })}
                      className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors"
                      style={{ background: "#12121A" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A2E")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#12121A")}>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "rgba(108,99,255,0.15)", color: "#6C63FF" }}>
                        {s.stepNumber}
                      </span>
                      <div className="flex-1 text-left min-w-0">
                        <span className="text-sm font-medium" style={{ color: "#F0F0FF" }}>{s.title}</span>
                        {s.phase && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF" }}>{s.phase}</span>
                        )}
                      </div>
                      {s.duration && <span className="text-[11px] flex-shrink-0" style={{ color: "#5A5A7A" }}>{s.duration}</span>}
                      {isOpen ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#5A5A7A" }} /> : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#5A5A7A" }} />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t space-y-2" style={{ borderColor: "#2A2A3E" }}>
                        {s.objective && <p className="text-sm" style={{ color: "#9090B0" }}>{s.objective}</p>}
                        {(s.instructions ?? []).map((inst, j) => (
                          <div key={j} className="flex items-start gap-2 text-xs">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: "#1A1A2E", color: "#5A5A7A", fontSize: 9 }}>{j + 1}</span>
                            <span style={{ color: "#C0C0D0" }}>{inst}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <button
              onClick={() => user ? setForkOpen(true) : setLocation(`/signup?blueprint=${id}`)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all mt-4"
              style={{ background: "#6C63FF", color: "#fff" }}>
              Fork to start building →
            </button>
          </div>
        )}

        {tab === "Reviews" && (
          <div className="space-y-5">
            {/* Average rating */}
            {blueprint.reviews.length > 0 && (
              <div className="p-4 rounded-xl border flex items-center gap-4" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                <div className="text-4xl font-black" style={{ color: "#F0F0FF" }}>{avgRating}.0</div>
                <div>
                  <StarRow rating={avgRating} size={18} />
                  <p className="text-xs mt-1" style={{ color: "#9090B0" }}>Based on {blueprint.reviews.length} review{blueprint.reviews.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            )}

            {/* Write review */}
            {user && (blueprint.userForked || blueprint.reviews.length === 0) && (
              <div className="p-4 rounded-xl border space-y-3" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                <p className="text-sm font-semibold" style={{ color: "#F0F0FF" }}>
                  {blueprint.reviews.find((r) => r.user_id === user.id) ? "Edit your review" : "Write a review"}
                </p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setReviewRating(s)}>
                      <Star style={{ width: 20, height: 20, color: s <= reviewRating ? "#FFB84D" : "#2A2A3E", fill: s <= reviewRating ? "#FFB84D" : "none" }} />
                    </button>
                  ))}
                </div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                  rows={3} placeholder="Share your experience building this project..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none resize-none transition-all"
                  style={{ background: "#0A0A0F", borderColor: "#2A2A3E", color: "#F0F0FF" }}
                  onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
                  onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")} />
                <button onClick={submitReview} disabled={submittingReview || !reviewText}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                  style={{ background: "#6C63FF", color: "#fff", opacity: submittingReview ? 0.7 : 1 }}>
                  {submittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Review
                </button>
              </div>
            )}

            {/* Review list */}
            {blueprint.reviews.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "#5A5A7A" }}>No reviews yet. Fork this blueprint and be the first to review!</p>
            ) : (
              <div className="space-y-3">
                {blueprint.reviews.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: "#6C63FF", color: "#fff" }}>
                          {(r.profiles?.full_name ?? "?")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium" style={{ color: "#C0C0D0" }}>
                          {r.profiles?.full_name ?? "Anonymous"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <StarRow rating={r.rating} size={13} />
                        <span className="text-[10px]" style={{ color: "#5A5A7A" }}>
                          {new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    {r.review_text && <p className="text-sm leading-relaxed" style={{ color: "#9090B0" }}>{r.review_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {forkOpen && blueprint && (
        <ForkModal blueprint={blueprint} onClose={() => setForkOpen(false)} />
      )}
    </DashboardLayout>
  );
}
