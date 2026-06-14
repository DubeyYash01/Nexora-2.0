import { useState } from "react";
import { useLocation } from "wouter";
import { useGetProjects, getGetProjectsQueryKey } from "@workspace/api-client-react";
import { Plus, FolderOpen, SlidersHorizontal, Search, LayoutGrid, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "./dashboard";
import ProjectCard from "@/components/ui/ProjectCard";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCards } from "@/components/ui/SkeletonCard";

type FilterStatus = "all" | "in_progress" | "completed" | "draft";
type SortOrder = "newest" | "oldest" | "updated";
type ViewMode = "grid" | "list";

function ProjectListItem({ project, onClick }: { project: Parameters<typeof ProjectCard>[0]["project"]; onClick: () => void }) {
  const statusColors: Record<string, { dot: string; label: string }> = {
    in_progress: { dot: "#FFB84D", label: "In Progress" },
    completed: { dot: "#00C896", label: "Completed" },
    draft: { dot: "#5A5A7A", label: "Draft" },
  };
  const s = statusColors[project.status ?? "draft"] ?? statusColors.draft;
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all"
      style={{ background: "#12121A", borderColor: "#2A2A3E" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3E")}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(108,99,255,0.15)" }}>
        <FolderOpen className="w-5 h-5" style={{ color: "#6C63FF" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{project.title}</p>
        <p className="text-xs text-muted-foreground truncate">{project.description ?? "No description"}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: s.dot }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
          {s.label}
        </span>
      </div>
    </div>
  );
}

export default function Projects() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { data: projects, isLoading } = useGetProjects({
    query: { queryKey: getGetProjectsQueryKey() },
  });

  type ProjItem = Parameters<typeof ProjectCard>[0]["project"];
  const filtered = (projects ?? [] as ProjItem[])
    .filter((p: ProjItem) => filter === "all" || p.status === filter)
    .filter((p: ProjItem) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return p.title?.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
    })
    .sort((a: ProjItem, b: ProjItem) => {
      if (sort === "newest") return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      if (sort === "oldest") return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime();
    });

  const filterPills: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
    { label: "Draft", value: "draft" },
  ];

  return (
    <DashboardLayout title="My Projects">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">My Projects</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {(projects ?? []).length} project{(projects ?? []).length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Button data-testid="btn-new-project" onClick={() => setLocation("/projects/new")}>
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5A5A7A" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your projects..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-all"
            style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#F0F0FF" }}
            onFocus={(e) => (e.target.style.borderColor = "#6C63FF")}
            onBlur={(e) => (e.target.style.borderColor = "#2A2A3E")}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: "#5A5A7A" }} />
            </button>
          )}
        </div>

        {/* Filter + Sort + View toggle bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {filterPills.map((pill) => (
              <button
                key={pill.value}
                data-testid={`filter-${pill.value}`}
                onClick={() => setFilter(pill.value)}
                className="text-sm px-3 py-1.5 rounded-lg border transition-all duration-200 font-medium"
                style={{
                  background: filter === pill.value ? "#6C63FF" : "#12121A",
                  borderColor: filter === pill.value ? "#6C63FF" : "#2A2A3E",
                  color: filter === pill.value ? "#fff" : "#9090B0",
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <select
              data-testid="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
              className="text-sm border rounded-lg px-2 py-1.5 outline-none focus:border-primary transition-colors"
              style={{ background: "#12121A", borderColor: "#2A2A3E", color: "#F0F0FF" }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="updated">Last Updated</option>
            </select>
            {/* View toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: "#2A2A3E" }}>
              <button
                onClick={() => setViewMode("grid")}
                className="px-2 py-1.5 transition-all"
                style={{ background: viewMode === "grid" ? "#6C63FF" : "#12121A" }}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" style={{ color: viewMode === "grid" ? "#fff" : "#9090B0" }} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="px-2 py-1.5 transition-all"
                style={{ background: viewMode === "list" ? "#6C63FF" : "#12121A" }}
                title="List view"
              >
                <List className="w-4 h-4" style={{ color: viewMode === "list" ? "#fff" : "#9090B0" }} />
              </button>
            </div>
          </div>
        </div>

        {/* Project grid/list / states */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <SkeletonCards count={3} />
          </div>
        ) : filtered.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((p: ProjItem) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p: ProjItem) => (
                <ProjectListItem key={p.id} project={p} onClick={() => setLocation(`/workspace/${p.id}`)} />
              ))}
            </div>
          )
        ) : search ? (
          <EmptyState
            icon={Search}
            title={`No results for "${search}"`}
            description="Try different keywords or clear the search."
            actionLabel="Clear Search"
            onAction={() => setSearch("")}
          />
        ) : filter !== "all" ? (
          <EmptyState
            icon={FolderOpen}
            title={`No ${filter.replace("_", " ")} projects`}
            description="Try changing the filter above to see all projects."
            actionLabel="Show All"
            onAction={() => setFilter("all")}
          />
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Start by describing your IoT idea and let Nexora AI plan and guide your build."
            actionLabel="Create First Project"
            onAction={() => setLocation("/projects/new")}
          />
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setLocation("/projects/new")}
        className="lg:hidden fixed z-40 flex items-center justify-center rounded-full shadow-lg"
        style={{
          bottom: 80,
          right: 16,
          width: 56,
          height: 56,
          background: "#6C63FF",
          boxShadow: "0 4px 20px rgba(108,99,255,0.5)",
        }}
        aria-label="New Project"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
    </DashboardLayout>
  );
}
