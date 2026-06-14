import { useState } from "react";
import { useLocation } from "wouter";
import { useGetProjects, getGetProjectsQueryKey } from "@workspace/api-client-react";
import { Plus, FolderOpen, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "./dashboard";
import ProjectCard from "@/components/ui/ProjectCard";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCards } from "@/components/ui/SkeletonCard";

type FilterStatus = "all" | "in_progress" | "completed" | "draft";
type SortOrder = "newest" | "oldest" | "updated";

export default function Projects() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortOrder>("newest");

  const { data: projects, isLoading } = useGetProjects({
    query: { queryKey: getGetProjectsQueryKey() },
  });

  type ProjItem = Parameters<typeof ProjectCard>[0]["project"];
  const filtered = (projects ?? [] as ProjItem[])
    .filter((p: ProjItem) => filter === "all" || p.status === filter)
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

        {/* Filter + Sort bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
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
          <div className="flex items-center gap-2 sm:ml-auto">
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
          </div>
        </div>

        {/* Project grid / states */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <SkeletonCards count={3} />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((p: Parameters<typeof ProjectCard>[0]["project"]) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
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
    </DashboardLayout>
  );
}
