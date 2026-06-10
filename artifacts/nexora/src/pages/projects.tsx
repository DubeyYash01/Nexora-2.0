import { useState } from "react";
import { useLocation } from "wouter";
import { useGetProjects, getGetProjectsQueryKey } from "@workspace/api-client-react";
import { Plus, Loader2, Sparkles, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "./dashboard";
import ProjectCard from "@/components/ui/ProjectCard";

type FilterStatus = "all" | "in_progress" | "completed" | "draft";
type SortOrder = "newest" | "oldest" | "updated";

export default function Projects() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortOrder>("newest");

  const { data: projects, isLoading } = useGetProjects({
    query: { queryKey: getGetProjectsQueryKey() },
  });

  const filtered = (projects ?? [])
    .filter((p) => filter === "all" || p.status === filter)
    .sort((a, b) => {
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
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p as Parameters<typeof ProjectCard>[0]["project"]} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-12 flex flex-col items-center text-center"
            style={{ borderColor: "#2A2A3E", background: "#12121A" }}>
            <Sparkles className="w-12 h-12 mb-4" style={{ color: "#6C63FF" }} />
            <h4 className="text-lg font-semibold text-foreground mb-2">
              {filter === "all" ? "No projects yet" : `No ${filter.replace("_", " ")} projects`}
            </h4>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              {filter === "all"
                ? "Start by describing your IoT idea and let Nexora do the rest."
                : "Try changing the filter above."}
            </p>
            {filter === "all" && (
              <Button data-testid="btn-create-first-project" onClick={() => setLocation("/projects/new")}>
                Create your first project
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
