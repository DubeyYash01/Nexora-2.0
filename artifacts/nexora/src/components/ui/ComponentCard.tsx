import { useState } from "react";
import {
  Cpu, Activity, Zap, Monitor, Wifi, Battery,
  Package, Radio, Power, MoreVertical, Edit, Copy, Trash2,
} from "lucide-react";

export interface UserComponent {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  condition: "new" | "working" | "untested" | "faulty";
  purchase_price: number | null;
  notes: string | null;
  added_at: string;
  last_used_at: string | null;
  usedInProjects?: number;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  microcontroller: Cpu,
  sensor: Activity,
  actuator: Zap,
  display: Monitor,
  communication: Wifi,
  power: Battery,
  passive: Radio,
  module: Package,
  other: Power,
};

const CONDITION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "rgba(0,212,255,0.1)", text: "#00D4FF", label: "New" },
  working: { bg: "rgba(0,200,150,0.1)", text: "#00C896", label: "Working" },
  untested: { bg: "rgba(255,184,77,0.1)", text: "#FFB84D", label: "Untested" },
  faulty: { bg: "rgba(255,90,90,0.1)", text: "#FF5A5A", label: "Faulty" },
};

export default function ComponentCard({
  component,
  onEdit,
  onDuplicate,
  onDelete,
  onFindProjects,
}: {
  component: UserComponent;
  onEdit: (c: UserComponent) => void;
  onDuplicate: (c: UserComponent) => void;
  onDelete: (c: UserComponent) => void;
  onFindProjects: (c: UserComponent) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const Icon = CATEGORY_ICONS[component.category] ?? Package;
  const condition = CONDITION_STYLES[component.condition] ?? CONDITION_STYLES.working;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      className="relative rounded-xl p-5 border transition-all duration-200"
      style={{
        background: "#12121A",
        borderColor: hovered ? "#6C63FF" : "#2A2A3E",
        boxShadow: hovered ? "0 0 0 1px rgba(108,99,255,0.15), 0 4px 20px rgba(108,99,255,0.08)" : "none",
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(108,99,255,0.12)" }}>
            <Icon className="w-4.5 h-4.5" style={{ color: "#6C63FF" }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate" style={{ color: "#F0F0FF" }}>
              {component.name}
            </p>
            <span className="text-xs capitalize" style={{ color: "#5A5A7A" }}>
              {component.category}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: condition.bg, color: condition.text }}
          >
            {condition.label}
          </span>
          {hovered && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "rgba(90,90,122,0.15)", color: "#9090B0" }}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-8 z-20 rounded-xl border py-1.5 min-w-[130px]"
                  style={{ background: "#1A1A2E", borderColor: "#2A2A3E" }}
                >
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(component); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                    style={{ color: "#C0C0D0" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onDuplicate(component); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                    style={{ color: "#C0C0D0" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,99,255,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(component); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                    style={{ color: "#FF5A5A" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,90,90,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span
          className="text-[11px] px-2 py-0.5 rounded-full border"
          style={{ color: "#9090B0", borderColor: "#2A2A3E", background: "#1A1A2E" }}
        >
          ×{component.quantity}
        </span>
        {component.purchase_price != null && (
          <span className="text-[11px] font-medium" style={{ color: "#9090B0" }}>
            ₹{component.purchase_price.toLocaleString("en-IN")}
          </span>
        )}
      </div>

      {component.notes && (
        <p
          className="text-xs italic mb-3 line-clamp-2 leading-relaxed"
          style={{ color: "#5A5A7A" }}
        >
          {component.notes}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#2A2A3E" }}>
        <span className="text-[11px]" style={{ color: (component.usedInProjects ?? 0) > 0 ? "#00D4FF" : "#3A3A5A" }}>
          {(component.usedInProjects ?? 0) > 0
            ? `Used in ${component.usedInProjects} project(s)`
            : "Not used in any project yet"}
        </span>
        <button
          onClick={() => onFindProjects(component)}
          className="text-[11px] px-2.5 py-1 rounded-lg border transition-all duration-150"
          style={{ color: "#9090B0", borderColor: "#2A2A3E", background: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#6C63FF";
            e.currentTarget.style.borderColor = "#6C63FF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#9090B0";
            e.currentTarget.style.borderColor = "#2A2A3E";
          }}
        >
          Find Projects
        </button>
      </div>
    </div>
  );
}
