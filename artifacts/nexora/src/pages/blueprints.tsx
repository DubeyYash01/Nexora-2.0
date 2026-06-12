import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import { DashboardLayout } from "./dashboard";
import {
  Search, GitFork, ChevronDown, Loader2, Sparkles,
  Users, BookOpen, Layers,
} from "lucide-react";
import FeaturedBlueprintCard from "@/components/blueprints/FeaturedBlueprintCard";
import BlueprintCard, { type Blueprint } from "@/components/blueprints/BlueprintCard";
import ForkModal from "@/components/blueprints/ForkModal";
import PublishBlueprintModal from "@/components/blueprints/PublishBlueprintModal";

const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];
const CATEGORIES = [
  "All Categories", "Home Automation", "Agriculture", "Security",
  "Smart City", "Environment", "Tracking", "Health", "Education", "Other",
];
const SORTS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "forked", label: "Most Forked" },
  { value: "cost", label: "Lowest Cost" },
];

export default function BlueprintsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState("popular");
  const [forkTarget, setForkTarget] = useState<Blueprint | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [stats, setStats] = useState({ blueprints: 0, projects: 0, makers: 0 });
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hasFilters = search || difficulty !== "All" || category !== "All Categories";

  const loadBlueprints = useCallback(async (q?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (difficulty !== "All") params.set("difficulty", difficulty);
    if (category !== "All Categories") params.set("category", category);
    params.set("sort", sort);
    params.set("limit", "50");

    const fetchFn = user ? authFetch : fetch;
    try {
      const res = await fetchFn(`/api/blueprints?${params}`);
      const data = await res.json() as { blueprints?: Blueprint[] };
      const all = data.blueprints ?? [];
      setBlueprints(all);
      setStats({
        blueprints: all.length,
        projects: all.reduce((s, b) => s + (b.fork_count ?? 0), 0),
        makers: Math.max(1, Math.round(all.reduce((s, b) => s + (b.view_count ?? 0), 0) / 3)),
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [difficulty, category, sort, user]);

  // Seed + load on mount
  useEffect(() => {
    const seed = async () => {
      try { await fetch("/api/blueprints/seed"); } catch {}
      loadBlueprints();
    };
    seed();
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadBlueprints(search), 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search, difficulty, category, sort, loadBlueprints]);

  const featured = blueprints.filter((b) => b.is_featured);
  const all = blueprints;

  return (
    <DashboardLayout title="Blueprints">
      <div className="space-y-0 -mx-6 -mt-6">

        {/* ── Hero ── */}
        <div
          className="px-6 py-12 border-b"
          style={{
            background: "linear-gradient(180deg, #12121A 0%, #0A0A0F 100%)",
            borderColor: "#2A2A3E",
          }}
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border"
                style={{ background: "rgba(108,99,255,0.1)", borderColor: "rgba(108,99,255,0.3)", color: "#8A80FF" }}>
                <Sparkles className="w-3 h-3" /> Community Library
              </span>
              <h1 className="text-3xl font-black leading-tight" style={{ color: "#F0F0FF" }}>
                IoT Project Blueprints
              </h1>
              <p className="text-base max-w-md" style={{ color: "#9090B0" }}>
                Start from a proven template. Customize to your components. Build faster.
              </p>
              <div className="flex items-center gap-5 text-sm pt-1">
                {[
                  { icon: BookOpen, value: stats.blueprints, label: "blueprints" },
                  { icon: GitFork, value: stats.projects, label: "projects built" },
                  { icon: Users, value: stats.makers, label: "makers" },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: "#6C63FF" }} />
                    <span className="font-bold" style={{ color: "#F0F0FF" }}>{value}</span>
                    <span style={{ color: "#5A5A7A" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0">
              {user ? (
                <button
                  onClick={() => setShowPublish(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "#6C63FF", color: "#fff" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#5854E0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#6C63FF")}
                >
                  <Sparkles className="w-4 h-4" /> Publish Your Blueprint
                </button>
              ) : (
                <p className="text-sm max-w-xs text-right" style={{ color: "#5A5A7A" }}>
                  Share your project as a blueprint after completing it
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Search & Filters ── */}
        <div
          className="px-6 py-4 border-b sticky top-0 z-10"
          style={{ background: "#0A0A0F", borderColor: "#2A2A3E" }}
        >
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5A5A7A" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blueprints, components, categories..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#F0F0FF" }}
                onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
                onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")}
              />
            </div>

            {/* Difficulty pills */}
            <div className="flex gap-1.5 overflow-x-auto flex-shrink-0">
              {DIFFICULTIES.map((d) => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className="px-3 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap"
                  style={{
                    background: difficulty === d ? "#6C63FF" : "#12121A",
                    borderColor: difficulty === d ? "#6C63FF" : "#2A2A3E",
                    color: difficulty === d ? "#fff" : "#9090B0",
                  }}>
                  {d}
                </button>
              ))}
            </div>

            {/* Category + Sort */}
            <div className="flex gap-2 flex-shrink-0">
              <div className="relative">
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2.5 rounded-xl border text-xs outline-none"
                  style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#C0C0D0" }}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "#5A5A7A" }} />
              </div>
              <div className="relative">
                <select value={sort} onChange={(e) => setSort(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2.5 rounded-xl border text-xs outline-none"
                  style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#C0C0D0" }}>
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "#5A5A7A" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-6 py-8 max-w-5xl mx-auto space-y-10">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#6C63FF" }} />
            </div>
          ) : (
            <>
              {/* Featured — only when no filters */}
              {!hasFilters && featured.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#F0F0FF" }}>
                    <span style={{ color: "#FFB84D" }}>⭐</span> Featured Blueprints
                  </h2>
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
                    {featured.map((bp) => (
                      <FeaturedBlueprintCard
                        key={bp.id}
                        blueprint={bp}
                        onFork={setForkTarget}
                        onClick={(b) => setLocation(`/blueprints/${b.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Blueprints */}
              <div className="space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#F0F0FF" }}>
                  <Layers className="w-4 h-4" style={{ color: "#6C63FF" }} />
                  {hasFilters ? `Results (${all.length})` : "All Blueprints"}
                </h2>
                {all.length === 0 ? (
                  <div className="rounded-2xl border border-dashed flex flex-col items-center py-16 text-center"
                    style={{ borderColor: "#2A2A3E" }}>
                    <BookOpen className="w-12 h-12 mb-4" style={{ color: "#3A3A5A" }} />
                    <p className="text-muted-foreground">No blueprints match your search</p>
                    <button onClick={() => { setSearch(""); setDifficulty("All"); setCategory("All Categories"); }}
                      className="mt-3 text-sm" style={{ color: "#6C63FF" }}>
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {all.map((bp) => (
                      <BlueprintCard
                        key={bp.id}
                        blueprint={bp}
                        onFork={setForkTarget}
                        onClick={(b) => setLocation(`/blueprints/${b.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fork Modal */}
      {forkTarget && (
        <ForkModal blueprint={forkTarget} onClose={() => setForkTarget(null)} />
      )}

      {/* Publish Modal */}
      {showPublish && (
        <PublishBlueprintModal
          projectId="__none__"
          projectTitle=""
          onClose={() => setShowPublish(false)}
          onPublished={() => { setShowPublish(false); loadBlueprints(); }}
        />
      )}
    </DashboardLayout>
  );
}
