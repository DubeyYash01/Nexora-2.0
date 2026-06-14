import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, X, Clock, Folder, GitBranch, Cpu, ArrowRight, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
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
  status?: string;
  current_step?: number;
  total_steps?: number;
  quantity?: number;
  estimated_cost_min?: number;
  estimated_cost_max?: number;
}

interface SearchHistory {
  id: string;
  query: string;
  created_at: string;
}

interface RecentItem {
  id: string;
  item_id: string;
  item_type: string;
  item_title: string;
  viewed_at: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 mx-2">
      <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "#2A2A3E" }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 rounded animate-pulse w-2/3" style={{ background: "#2A2A3E" }} />
        <div className="h-2.5 rounded animate-pulse w-1/2" style={{ background: "#1A1A2E" }} />
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  if (type === "blueprint") return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(108,99,255,0.2)" }}>
      <GitBranch className="w-4 h-4" style={{ color: "#6C63FF" }} />
    </div>
  );
  if (type === "project") return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,150,255,0.15)" }}>
      <Folder className="w-4 h-4" style={{ color: "#4A9EFF" }} />
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,212,255,0.12)" }}>
      <Cpu className="w-4 h-4" style={{ color: "#00D4FF" }} />
    </div>
  );
}

function resultSubtitle(r: SearchResult): string {
  if (r.type === "blueprint") return `${r.difficulty ?? "Beginner"} · ₹${r.estimated_cost_min ?? 0}–₹${r.estimated_cost_max ?? 0}`;
  if (r.type === "project") return `${(r.status ?? "draft").replace("_", " ")} · Step ${r.current_step ?? 1} of ${r.total_steps ?? 0}`;
  return `${r.category ?? "Component"} · Qty: ${r.quantity ?? 1}`;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [popularTags] = useState(["ESP32", "Arduino", "Sensors", "WiFi", "Beginner", "Home Automation", "Weather"]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIdx(-1);
      loadHistory();
      loadRecent();
    }
  }, [open]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const res = await authFetch("/api/search/history");
      const data = await res.json() as { history: SearchHistory[] };
      setHistory(data.history ?? []);
    } catch {}
  };

  const loadRecent = async () => {
    if (!user) return;
    try {
      const res = await authFetch("/api/recently-viewed");
      const data = await res.json() as { items: RecentItem[] };
      setRecentItems((data.items ?? []).slice(0, 4));
    } catch {}
  };

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await authFetch("/api/search/global", {
        method: "POST",
        body: JSON.stringify({ query: q, types: ["blueprints", "projects", "components"], limit: 10 }),
      });
      const data = await res.json() as { results: SearchResult[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery.length >= 2) doSearch(debouncedQuery);
    else { setResults([]); setLoading(false); }
  }, [debouncedQuery, doSearch]);

  const handleNavigate = async (result: SearchResult) => {
    if (user && query) {
      authFetch("/api/search/history", {
        method: "POST",
        body: JSON.stringify({ query, clickedId: result.id, clickedType: result.type, resultsCount: results.length }),
      }).catch(() => {});
    }
    const url = result.type === "blueprint" ? `/blueprints/${result.id}` :
                result.type === "project" ? `/workspace/${result.id}` :
                `/components`;
    onClose();
    setLocation(url);
  };

  const handleHistoryClick = (q: string) => setQuery(q);
  const handleTagClick = (tag: string) => setQuery(tag);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && selectedIdx >= 0) { handleNavigate(results[selectedIdx]); }
    if (e.key === "Enter" && selectedIdx < 0 && query.length >= 2) {
      onClose();
      setLocation(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const grouped: { label: string; items: SearchResult[] }[] = [];
  const blueprints = results.filter((r) => r.type === "blueprint");
  const projects = results.filter((r) => r.type === "project");
  const components = results.filter((r) => r.type === "component");
  if (blueprints.length) grouped.push({ label: "Blueprints", items: blueprints.slice(0, 4) });
  if (projects.length) grouped.push({ label: "Your Projects", items: projects.slice(0, 3) });
  if (components.length) grouped.push({ label: "Components", items: components.slice(0, 3) });

  let globalIdx = 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", paddingTop: "15vh" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: 640,
          margin: "0 auto",
          background: "#12121A",
          border: "1px solid #6C63FF",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(108,99,255,0.3)",
          maxHeight: "70vh",
        }}
      >
        {/* Input row */}
        <div className="flex items-center px-5 py-4 gap-3 flex-shrink-0" style={{ borderBottom: "1px solid #2A2A3E" }}>
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: "#6C63FF" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(-1); }}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, blueprints, components..."
            className="flex-1 bg-transparent border-none outline-none text-lg"
            style={{ color: "#F0F0FF", caretColor: "#6C63FF" }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}>
              <X className="w-4 h-4" style={{ color: "#5A5A7A" }} />
            </button>
          )}
          <kbd className="text-xs px-2 py-1 rounded border" style={{ background: "#1A1A2E", borderColor: "#2A2A3E", color: "#5A5A7A" }}>ESC</kbd>
        </div>

        {/* Results area */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {loading && (
            <div className="py-2">
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="py-2 space-y-4">
              {history.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "#5A5A7A", letterSpacing: "0.1em" }}>Recent Searches</p>
                  {history.slice(0, 5).map((h) => (
                    <button key={h.id} onClick={() => handleHistoryClick(h.query)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all"
                      style={{ color: "#C0C0D0" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#5A5A7A" }} />
                      {h.query}
                    </button>
                  ))}
                </div>
              )}

              {recentItems.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "#5A5A7A", letterSpacing: "0.1em" }}>Recently Viewed</p>
                  {recentItems.map((item) => (
                    <button key={item.id} onClick={() => {
                      onClose();
                      const url = item.item_type === "blueprint" ? `/blueprints/${item.item_id}` : item.item_type === "project" ? `/workspace/${item.item_id}` : `/components`;
                      setLocation(url);
                    }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all"
                      style={{ color: "#C0C0D0" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <TypeIcon type={item.item_type} />
                      <span className="flex-1 truncate">{item.item_title}</span>
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#5A5A7A" }} />
                    </button>
                  ))}
                </div>
              )}

              <div>
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "#5A5A7A", letterSpacing: "0.1em" }}>Popular Tags</p>
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <button key={tag} onClick={() => handleTagClick(tag)}
                      className="text-xs px-3 py-1.5 rounded-full border transition-all"
                      style={{ background: "rgba(108,99,255,0.08)", borderColor: "rgba(108,99,255,0.25)", color: "#8A80FF" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.08)")}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="py-12 px-6 text-center">
              <Search className="w-10 h-10 mx-auto mb-3" style={{ color: "#3A3A5A" }} />
              <p className="font-semibold mb-1" style={{ color: "#F0F0FF" }}>No results for "{query}"</p>
              <p className="text-sm mb-4" style={{ color: "#5A5A7A" }}>Try searching for:</p>
              <ul className="text-sm space-y-1 mb-6" style={{ color: "#9090B0" }}>
                <li>• A component name (ESP32, DHT11)</li>
                <li>• A project type (temperature, security)</li>
                <li>• A category (home automation, agriculture)</li>
              </ul>
              <button onClick={() => { onClose(); setLocation("/blueprints"); }}
                className="text-sm px-4 py-2 rounded-lg font-medium"
                style={{ background: "rgba(108,99,255,0.12)", color: "#6C63FF", border: "1px solid rgba(108,99,255,0.3)" }}>
                Browse all blueprints
              </button>
            </div>
          )}

          {!loading && grouped.length > 0 && (
            <div className="py-2">
              {grouped.map((group, gi) => {
                return (
                  <div key={group.label}>
                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest mt-1" style={{ color: "#5A5A7A", letterSpacing: "0.1em", borderTop: gi > 0 ? "1px solid #1A1A2E" : "none" }}>
                      {group.label}
                    </p>
                    {group.items.map((result) => {
                      const idx = globalIdx++;
                      const isSelected = idx === selectedIdx;
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleNavigate(result)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 mx-0 rounded-none text-left transition-all"
                          style={{ background: isSelected ? "rgba(108,99,255,0.12)" : "transparent" }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(108,99,255,0.06)"; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                        >
                          <TypeIcon type={result.type} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "#F0F0FF" }}>{result.title}</p>
                            <p className="text-xs truncate" style={{ color: "#9090B0" }}>{resultSubtitle(result)}</p>
                          </div>
                          {result.type === "blueprint" && result.fork_count !== undefined && (
                            <span className="text-xs flex-shrink-0" style={{ color: "#5A5A7A" }}>{result.fork_count} forks</span>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#5A5A7A" }} />
                        </button>
                      );
                    })}
                    {group.label === "Blueprints" && blueprints.length > 4 && (
                      <button onClick={() => { onClose(); setLocation(`/search?q=${encodeURIComponent(query)}&type=blueprints`); }}
                        className="w-full px-4 py-2 text-xs text-left transition-all"
                        style={{ color: "#6C63FF" }}>
                        View all {blueprints.length} blueprints →
                      </button>
                    )}
                    {group.label === "Your Projects" && projects.length > 3 && (
                      <button onClick={() => { onClose(); setLocation(`/search?q=${encodeURIComponent(query)}&type=projects`); }}
                        className="w-full px-4 py-2 text-xs text-left"
                        style={{ color: "#6C63FF" }}>
                        View all {projects.length} projects →
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="border-t mx-4 mt-2 pt-3 pb-3" style={{ borderColor: "#1A1A2E" }}>
                <button onClick={() => { onClose(); setLocation(`/search?q=${encodeURIComponent(query)}`); }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all"
                  style={{ color: "#6C63FF", background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.2)" }}>
                  <Search className="w-3.5 h-3.5" />
                  See all results for "{query}"
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
