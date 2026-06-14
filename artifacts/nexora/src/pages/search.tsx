import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { authFetch } from "@/lib/supabase";
import { DashboardLayout } from "./dashboard";
import {
  Search, GitBranch, Folder, Cpu, SlidersHorizontal,
  X, Filter, ChevronDown, Loader2, GitFork, Heart, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  type: "blueprint" | "project" | "component";
  title: string;
  description: string;
  difficulty?: string;
  category?: string;
  platform?: string;
  fork_count?: number;
  like_count?: number;
  status?: string;
  current_step?: number;
  total_steps?: number;
  quantity?: number;
  condition?: string;
  estimated_cost_min?: number;
  estimated_cost_max?: number;
  tags?: string[];
  updated_at?: string;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: "rgba(0,200,150,0.1)", color: "#00C896" },
  Intermediate: { bg: "rgba(255,184,77,0.1)", color: "#FFB84D" },
  Advanced: { bg: "rgba(255,90,90,0.1)", color: "#FF5A5A" },
};

function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{ background: "rgba(108,99,255,0.3)", color: "#F0F0FF", borderRadius: 3, padding: "0 2px" }}>{p}</mark>
        ) : p
      )}
    </>
  );
}

function TypeIcon({ type, size = 48 }: { type: string; size?: number }) {
  const s = size;
  if (type === "blueprint") return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: s, height: s, background: "rgba(108,99,255,0.15)" }}>
      <GitBranch style={{ width: s * 0.45, height: s * 0.45, color: "#6C63FF" }} />
    </div>
  );
  if (type === "project") return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: s, height: s, background: "rgba(0,150,255,0.12)" }}>
      <Folder style={{ width: s * 0.45, height: s * 0.45, color: "#4A9EFF" }} />
    </div>
  );
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: s, height: s, background: "rgba(0,212,255,0.1)" }}>
      <Cpu style={{ width: s * 0.45, height: s * 0.45, color: "#00D4FF" }} />
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    blueprint: { bg: "rgba(108,99,255,0.12)", color: "#8A80FF" },
    project: { bg: "rgba(0,150,255,0.1)", color: "#4A9EFF" },
    component: { bg: "rgba(0,212,255,0.1)", color: "#00D4FF" },
  };
  const c = colors[type] ?? colors.blueprint;
  return (
    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
      {type}
    </span>
  );
}

export default function SearchPage() {
  const searchStr = useSearch();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const params = new URLSearchParams(searchStr);
  const initQuery = params.get("q") ?? "";

  const [query, setQuery] = useState(initQuery);
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [typeFilters, setTypeFilters] = useState({ blueprints: true, projects: true, components: true });
  const [diffFilter, setDiffFilter] = useState<string[]>([]);
  const [costFilter, setCostFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState("relevant");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const activeFilterCount = [
    !typeFilters.blueprints || !typeFilters.projects || !typeFilters.components,
    diffFilter.length > 0,
    !!costFilter,
    !!platformFilter,
  ].filter(Boolean).length;

  const doSearch = async (q: string, pg: number, append = false) => {
    if (!q || q.length < 2) { setResults([]); setTotalCount(0); return; }
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const types = Object.entries(typeFilters).filter(([, v]) => v).map(([k]) => k);
      const fetchFn = user ? authFetch : fetch;
      const res = await fetchFn("/api/search/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, types, limit: 20 * pg }),
      });
      const data = await res.json() as { results: SearchResult[]; totalCount: number };
      let filtered = data.results ?? [];

      if (diffFilter.length) filtered = filtered.filter((r) => !r.difficulty || diffFilter.includes(r.difficulty));
      if (costFilter) {
        filtered = filtered.filter((r) => {
          const cost = r.estimated_cost_min ?? 0;
          if (costFilter === "under500") return cost < 500;
          if (costFilter === "500-1000") return cost >= 500 && cost < 1000;
          if (costFilter === "1000-2000") return cost >= 1000 && cost < 2000;
          if (costFilter === "above2000") return cost >= 2000;
          return true;
        });
      }
      if (platformFilter) filtered = filtered.filter((r) => !r.platform || r.platform.toLowerCase().includes(platformFilter.toLowerCase()));

      if (sortBy === "popular") filtered.sort((a, b) => (b.fork_count ?? 0) + (b.like_count ?? 0) - ((a.fork_count ?? 0) + (a.like_count ?? 0)));
      else if (sortBy === "newest") filtered.sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
      else if (sortBy === "cost") filtered.sort((a, b) => (a.estimated_cost_min ?? 0) - (b.estimated_cost_min ?? 0));
      else if (sortBy === "forked") filtered.sort((a, b) => (b.fork_count ?? 0) - (a.fork_count ?? 0));

      if (append) setResults((prev) => [...prev, ...filtered.slice(results.length)]);
      else setResults(filtered);
      setTotalCount(filtered.length);
    } catch {
      if (!append) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    doSearch(debouncedQuery, 1);
    if (debouncedQuery) {
      const url = new URL(window.location.href);
      url.searchParams.set("q", debouncedQuery);
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [debouncedQuery, typeFilters, diffFilter, costFilter, platformFilter, sortBy]);

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#5A5A7A" }}>Type</p>
        {[["blueprints", "Blueprints"], ["projects", "My Projects"], ["components", "Components"]].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input type="checkbox" checked={typeFilters[key as keyof typeof typeFilters]}
              onChange={(e) => setTypeFilters((prev) => ({ ...prev, [key]: e.target.checked }))}
              className="rounded" style={{ accentColor: "#6C63FF" }} />
            <span className="text-sm" style={{ color: "#C0C0D0" }}>{label}</span>
          </label>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#5A5A7A" }}>Difficulty</p>
        {["Beginner", "Intermediate", "Advanced"].map((d) => (
          <label key={d} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input type="checkbox" checked={diffFilter.includes(d)}
              onChange={(e) => setDiffFilter((prev) => e.target.checked ? [...prev, d] : prev.filter((x) => x !== d))}
              className="rounded" style={{ accentColor: "#6C63FF" }} />
            <span className="text-sm" style={{ color: "#C0C0D0" }}>{d}</span>
          </label>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#5A5A7A" }}>Cost (Blueprints)</p>
        {[["under500", "Under ₹500"], ["500-1000", "₹500–₹1,000"], ["1000-2000", "₹1,000–₹2,000"], ["above2000", "Above ₹2,000"]].map(([val, label]) => (
          <label key={val} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input type="radio" name="cost" checked={costFilter === val} onChange={() => setCostFilter((prev) => prev === val ? "" : val)}
              style={{ accentColor: "#6C63FF" }} />
            <span className="text-sm" style={{ color: "#C0C0D0" }}>{label}</span>
          </label>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#5A5A7A" }}>Platform</p>
        {["ESP32", "Arduino Uno", "Arduino Nano", "Raspberry Pi"].map((p) => (
          <label key={p} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input type="radio" name="platform" checked={platformFilter === p} onChange={() => setPlatformFilter((prev) => prev === p ? "" : p)}
              style={{ accentColor: "#6C63FF" }} />
            <span className="text-sm" style={{ color: "#C0C0D0" }}>{p}</span>
          </label>
        ))}
      </div>
      {activeFilterCount > 0 && (
        <button onClick={() => { setTypeFilters({ blueprints: true, projects: true, components: true }); setDiffFilter([]); setCostFilter(""); setPlatformFilter(""); }}
          className="w-full text-sm py-2 rounded-lg" style={{ color: "#FF5A5A", background: "rgba(255,90,90,0.08)" }}>
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <DashboardLayout title="Search">
      <div className="max-w-6xl mx-auto">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#5A5A7A" }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, blueprints, components..."
              className="w-full pl-12 pr-12 py-3.5 rounded-xl border text-base outline-none transition-all"
              style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#F0F0FF" }}
              onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
              onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")}
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4" style={{ color: "#5A5A7A" }} />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters — desktop */}
          <div className="hidden lg:block w-56 flex-shrink-0">
            <div className="p-4 rounded-xl border sticky top-6" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
              <p className="text-sm font-semibold mb-4" style={{ color: "#F0F0FF" }}>Filters</p>
              {filterPanel}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Sort + mobile filter + count row */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <p className="text-sm flex-1" style={{ color: "#9090B0" }}>
                {loading ? "Searching..." : query.length >= 2 ? `${totalCount} results for "${query}"` : "Type to search"}
              </p>
              <div className="flex items-center gap-2">
                {/* Mobile filters btn */}
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-all"
                  style={{
                    background: activeFilterCount > 0 ? "rgba(108,99,255,0.1)" : "#12121A",
                    borderColor: activeFilterCount > 0 ? "#6C63FF" : "#2A2A3E",
                    color: activeFilterCount > 0 ? "#6C63FF" : "#9090B0",
                  }}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>
                <div className="relative">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 rounded-lg border text-xs outline-none"
                    style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#C0C0D0" }}>
                    <option value="relevant">Most Relevant</option>
                    <option value="popular">Most Popular</option>
                    <option value="newest">Newest First</option>
                    <option value="cost">Lowest Cost</option>
                    <option value="forked">Most Forked</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "#5A5A7A" }} />
                </div>
              </div>
            </div>

            {/* Result cards */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#6C63FF" }} />
              </div>
            ) : query.length < 2 ? (
              <div className="text-center py-20" style={{ color: "#5A5A7A" }}>
                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium" style={{ color: "#9090B0" }}>Start typing to search</p>
                <p className="text-sm mt-1">Search across blueprints, your projects, and components</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-semibold" style={{ color: "#F0F0FF" }}>No results for "{query}"</p>
                <p className="text-sm mt-1" style={{ color: "#5A5A7A" }}>Try different keywords or clear filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((r) => {
                  const diff = r.difficulty ? DIFFICULTY_COLORS[r.difficulty] : null;
                  return (
                    <div
                      key={`${r.type}-${r.id}`}
                      className="p-5 rounded-xl border flex items-start gap-4 transition-all cursor-pointer"
                      style={{ background: "#12121A", borderColor: "#2A2A3E" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
                      onClick={() => {
                        const url = r.type === "blueprint" ? `/blueprints/${r.id}` : r.type === "project" ? `/workspace/${r.id}` : `/components`;
                        setLocation(url);
                      }}
                    >
                      <TypeIcon type={r.type} size={48} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeBadge type={r.type} />
                          {diff && r.difficulty && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.color }}>
                              {r.difficulty}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base mt-1 leading-snug" style={{ color: "#F0F0FF" }}>
                          {highlightText(r.title, query)}
                        </h3>
                        {r.description && (
                          <p className="text-sm mt-1 line-clamp-2" style={{ color: "#9090B0" }}>
                            {highlightText(r.description.slice(0, 160), query)}
                          </p>
                        )}
                        {r.tags && r.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {r.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border"
                                style={{ background: "rgba(108,99,255,0.06)", borderColor: "rgba(108,99,255,0.2)", color: "#8A80FF" }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "#5A5A7A" }}>
                          {r.type === "blueprint" && (
                            <>
                              <span className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {r.fork_count ?? 0} forks</span>
                              <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {r.like_count ?? 0} likes</span>
                              {r.estimated_cost_min !== undefined && (
                                <span style={{ color: "#00C896" }}>₹{r.estimated_cost_min}–₹{r.estimated_cost_max}</span>
                              )}
                            </>
                          )}
                          {r.type === "project" && r.status && (
                            <span className="capitalize">{r.status.replace("_", " ")} · Step {r.current_step} of {r.total_steps}</span>
                          )}
                          {r.type === "component" && (
                            <span>Qty: {r.quantity} · {r.condition}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        <button
                          className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                          style={{ background: "rgba(108,99,255,0.1)", borderColor: "rgba(108,99,255,0.3)", color: "#8A80FF" }}
                          onClick={(e) => { e.stopPropagation(); const url = r.type === "blueprint" ? `/blueprints/${r.id}` : r.type === "project" ? `/workspace/${r.id}` : `/components`; setLocation(url); }}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {results.length >= 20 && (
                  <div className="text-center pt-4 pb-2">
                    <p className="text-sm mb-3" style={{ color: "#5A5A7A" }}>Showing {results.length} of {totalCount}</p>
                    <button
                      onClick={() => { const nextPage = page + 1; setPage(nextPage); doSearch(query, nextPage, true); }}
                      disabled={loadingMore}
                      className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{ background: "#6C63FF", color: "#fff" }}
                    >
                      {loadingMore ? "Loading..." : "Load 20 more"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters sheet */}
      <BottomSheet isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="p-4">{filterPanel}</div>
      </BottomSheet>
    </DashboardLayout>
  );
}
