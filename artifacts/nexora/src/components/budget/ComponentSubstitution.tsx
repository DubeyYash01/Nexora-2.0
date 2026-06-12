import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/supabase";
import type { UserComponent } from "@/components/ui/ComponentCard";

interface Substitute {
  name: string;
  compatibility: "Drop-in replacement" | "Minor code changes" | "Significant changes";
  codeChanges: string;
  tradeoffs: string;
  available: boolean;
}

const COMPAT_STYLES = {
  "Drop-in replacement": { color: "#00C896", label: "No code changes" },
  "Minor code changes": { color: "#FFB84D", label: "Small code changes" },
  "Significant changes": { color: "#FF8C00", label: "Significant changes" },
};

export default function ComponentSubstitution({
  componentName,
  platform,
  userInventory,
  projectContext,
  onUseSubstitute,
}: {
  componentName: string;
  platform?: string;
  userInventory?: UserComponent[];
  projectContext?: string;
  onUseSubstitute?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [substitutes, setSubstitutes] = useState<Substitute[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSubstitutes = async () => {
    if (substitutes.length > 0) { setOpen((v) => !v); return; }
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/components/substitutions", {
        method: "POST",
        body: JSON.stringify({
          componentName,
          platform: platform ?? "ESP32",
          userInventory: userInventory?.map((c) => ({ name: c.name })) ?? [],
          projectContext: projectContext ?? "",
        }),
      });
      const data = await res.json() as { substitutes?: Substitute[] };
      setSubstitutes(data.substitutes ?? []);
    } catch {
      setError("Failed to load substitutions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A3E" }}>
      <button
        onClick={fetchSubstitutes}
        className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors"
        style={{ background: "#12121A" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A2E")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#12121A")}
      >
        <span className="font-medium" style={{ color: "#C0C0D0" }}>
          Don't have <span style={{ color: "#F0F0FF" }}>{componentName}</span>?
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#5A5A7A" }} />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#5A5A7A" }} />
        )}
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: "#2A2A3E" }}>
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#6C63FF" }} />
              <span className="text-xs" style={{ color: "#9090B0" }}>Finding alternatives...</span>
            </div>
          ) : error ? (
            <p className="text-xs" style={{ color: "#FF9090" }}>{error}</p>
          ) : (
            substitutes.map((s, i) => {
              const compat = COMPAT_STYLES[s.compatibility] ?? COMPAT_STYLES["Minor code changes"];
              return (
                <div
                  key={i}
                  className="rounded-xl p-3 border transition-all"
                  style={{
                    borderColor: s.available ? "#00C896" : "#2A2A3E",
                    background: s.available ? "rgba(0,200,150,0.04)" : "#0D0D14",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: "#F0F0FF" }}>{s.name}</span>
                      {s.available && (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "rgba(0,200,150,0.1)", color: "#00C896" }}>
                          <CheckCircle className="w-3 h-3" /> In your inventory!
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium flex-shrink-0" style={{ color: compat.color }}>
                      {compat.label}
                    </span>
                  </div>
                  <p className="text-xs mb-1" style={{ color: "#7090B0" }}>
                    <span style={{ color: "#9090B0", fontWeight: 500 }}>Code: </span>{s.codeChanges}
                  </p>
                  <p className="text-xs" style={{ color: "#7090B0" }}>
                    <span style={{ color: "#9090B0", fontWeight: 500 }}>Trade-offs: </span>{s.tradeoffs}
                  </p>
                  {s.available && onUseSubstitute && (
                    <button
                      onClick={() => onUseSubstitute(s.name)}
                      className="mt-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{ background: "#00C896", color: "#0A0A0F" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#00A87C")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#00C896")}
                    >
                      Use This Instead
                    </button>
                  )}
                  {!s.available && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <AlertCircle className="w-3 h-3" style={{ color: "#5A5A7A" }} />
                      <span className="text-[10px]" style={{ color: "#5A5A7A" }}>Not in your inventory</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
