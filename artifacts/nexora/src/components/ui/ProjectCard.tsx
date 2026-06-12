import { useLocation } from "wouter";
import { ArrowRight, Cpu, Activity, Zap, Monitor, Wifi, Battery, Package } from "lucide-react";

interface Component {
  id: string;
  name: string;
  type: string;
  purpose?: string;
  estimatedCost?: number;
  isEssential?: boolean;
}

interface AiAnalysis {
  components?: Component[];
  estimatedComplexity?: string;
}

interface Project {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  current_step: number;
  created_at?: string | null;
  updated_at?: string | null;
  ai_analysis?: AiAnalysis | null;
  components?: { list?: Component[] } | null;
}

const TOTAL_STEPS = 6;

const typeIcon: Record<string, React.ElementType> = {
  microcontroller: Cpu,
  sensor: Activity,
  actuator: Zap,
  display: Monitor,
  communication: Wifi,
  power: Battery,
  other: Package,
};

function StatusBadge({ status }: { status: string }) {
  if (status === "in_progress") {
    return (
      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
        style={{ background: "rgba(0,212,255,0.1)", color: "#00D4FF" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
        In Progress
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
        style={{ background: "rgba(0,200,150,0.1)", color: "#00C896" }}>
        Completed
      </span>
    );
  }
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: "#2A2A3E", color: "#9090B0" }}>
      Draft
    </span>
  );
}

export default function ProjectCard({ project }: { project: Project }) {
  const [, setLocation] = useLocation();
  const components: Component[] =
    (project.ai_analysis?.components ?? project.components?.list ?? []);

  const displayComponents = components.slice(0, 3);
  const extraCount = components.length - 3;

  const formattedDate = project.created_at
    ? new Date(project.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "";

  const progress = Math.min((project.current_step / TOTAL_STEPS) * 100, 100);

  return (
    <div
      data-testid={`project-card-${project.id}`}
      onClick={() => setLocation(`/projects/${project.id}`)}
      className="group cursor-pointer rounded-xl p-5 border transition-all duration-200"
      style={{
        background: "#12121A",
        borderColor: "#2A2A3E",
        boxShadow: "0 2px 12px rgba(108,99,255,0.04)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#6C63FF";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(108,99,255,0.12)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#2A2A3E";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(108,99,255,0.04)";
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-bold text-[#F0F0FF] truncate flex-1 leading-snug" style={{ fontSize: "15px" }}>
          {project.title}
        </h3>
        <StatusBadge status={project.status} />
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm mb-4 line-clamp-2" style={{ color: "#9090B0" }}>
          {project.description}
        </p>
      )}

      {/* Component pills */}
      {components.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {displayComponents.map((c, i) => {
            const Icon = typeIcon[c.type] ?? Package;
            return (
              <span key={c.id ?? i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border"
                style={{ background: "#1A1A2E", color: "#9090B0", borderColor: "#2A2A3E" }}>
                <Icon className="w-3 h-3" />
                {c.name}
              </span>
            );
          })}
          {extraCount > 0 && (
            <span className="text-xs px-2 py-1 rounded-full border"
              style={{ background: "#1A1A2E", color: "#9090B0", borderColor: "#2A2A3E" }}>
              +{extraCount} more
            </span>
          )}
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-end justify-between gap-4 pt-3 border-t" style={{ borderColor: "#2A2A3E" }}>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: "#5A5A7A" }}>
              Step {project.current_step} of {TOTAL_STEPS}
            </span>
          </div>
          <div className="w-full rounded-full h-[3px]" style={{ background: "#2A2A3E" }}>
            <div className="h-[3px] rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: "#6C63FF" }} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {formattedDate && (
            <span className="text-xs" style={{ color: "#5A5A7A" }}>{formattedDate}</span>
          )}
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
            style={{ color: "#6C63FF" }} />
        </div>
      </div>
    </div>
  );
}
