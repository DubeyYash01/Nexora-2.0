import { useState, useEffect } from "react";
import { X, Copy, Lightbulb, AlertCircle, ChevronDown, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import { authFetch } from "@/lib/supabase";

interface Alternative {
  name: string;
  price: number;
  tradeoff: string;
}

interface ShoppingItem {
  componentName: string;
  quantity: number;
  estimatedPrice: number;
  priceRange: { min: number; max: number };
  recommendedStore: string;
  searchTerm: string;
  buyingTip: string;
  commonMistake: string;
  alternatives: Alternative[];
}

interface ShoppingListData {
  shoppingList: ShoppingItem[];
  totalEstimate: number;
  bulkTip: string;
  priorityOrder: string[];
}

const STORE_STYLES: Record<string, { bg: string; color: string }> = {
  "Robu.in": { bg: "rgba(255,140,0,0.12)", color: "#FF8C00" },
  "Amazon.in": { bg: "rgba(255,184,0,0.12)", color: "#FFB800" },
  "Electronicscomp.com": { bg: "rgba(0,150,255,0.12)", color: "#0096FF" },
  Electronicscomp: { bg: "rgba(0,150,255,0.12)", color: "#0096FF" },
  Robocraze: { bg: "rgba(0,200,100,0.12)", color: "#00C864" },
  Fabtolab: { bg: "rgba(180,0,255,0.12)", color: "#B400FF" },
  Flipkart: { bg: "rgba(40,116,240,0.12)", color: "#2874F0" },
};

function storeSearchUrl(store: string, searchTerm: string): string {
  const q = encodeURIComponent(searchTerm);
  if (store.toLowerCase().includes("robu")) return `https://robu.in/search/?s=${q}`;
  if (store.toLowerCase().includes("amazon")) return `https://www.amazon.in/s?k=${q}`;
  if (store.toLowerCase().includes("robocraze")) return `https://robocraze.com/search?q=${q}`;
  if (store.toLowerCase().includes("electronics")) return `https://www.electronicscomp.com/search?q=${q}`;
  if (store.toLowerCase().includes("fabtolab")) return `https://fabtolab.com/search?q=${q}`;
  if (store.toLowerCase().includes("flipkart")) return `https://www.flipkart.com/search?q=${q}`;
  return `https://www.google.com/search?q=${q}+buy+India`;
}

export default function ShoppingListModal({
  open,
  components,
  budgetLimit,
  totalEstimated,
  onClose,
}: {
  open: boolean;
  components: Array<{ name: string; quantity: number }>;
  budgetLimit?: number;
  totalEstimated?: number;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ShoppingListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || components.length === 0) return;
    setLoading(true);
    setError(null);
    setData(null);

    authFetch("/api/components/shopping-list", {
      method: "POST",
      body: JSON.stringify({ components }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.shoppingList) setData(d as ShoppingListData);
        else setError("Failed to generate shopping list");
      })
      .catch(() => setError("Failed to generate shopping list. Please try again."))
      .finally(() => setLoading(false));
  }, [open, components]);

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const copyList = () => {
    if (!data) return;
    const text = data.shoppingList
      .map((item) => `• ${item.componentName} (×${item.quantity}) — ₹${item.estimatedPrice} — ${item.recommendedStore}`)
      .join("\n");
    navigator.clipboard.writeText(`Shopping List\nTotal: ₹${data.totalEstimate.toLocaleString("en-IN")}\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border overflow-hidden"
        style={{ background: "#0D0D14", borderColor: "#2A2A3E" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: "#2A2A3E" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#F0F0FF" }}>Shopping List</h2>
            {data && (
              <p className="text-xl font-bold mt-0.5" style={{ color: "#6C63FF" }}>
                Estimated Total: ₹{data.totalEstimate.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <button
                onClick={copyList}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all"
                style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#6C63FF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#9090B0"; }}
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy List"}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ color: "#9090B0" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(90,90,122,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#6C63FF" }} />
              <p className="text-sm" style={{ color: "#9090B0" }}>Generating shopping guide...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="w-10 h-10" style={{ color: "#FF5A5A" }} />
              <p style={{ color: "#FF9090" }}>{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Priority note */}
              {data.priorityOrder.length > 0 && (
                <div className="p-4 rounded-xl border flex gap-3"
                  style={{ background: "rgba(0,212,255,0.05)", borderColor: "rgba(0,212,255,0.2)" }}>
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00D4FF" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "#7090B0" }}>
                    <span style={{ color: "#00D4FF", fontWeight: 600 }}>On a tight budget?</span>{" "}
                    Buy these first: {data.priorityOrder.slice(0, 3).join(", ")}
                  </p>
                </div>
              )}

              {/* Items */}
              {data.shoppingList.map((item, i) => {
                const storeStyle = STORE_STYLES[item.recommendedStore] ?? { bg: "rgba(108,99,255,0.1)", color: "#6C63FF" };
                const isExpanded = expanded.has(i);
                return (
                  <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A2A3E" }}>
                    {/* Row header */}
                    <div className="p-4 flex items-start justify-between gap-3" style={{ background: "#12121A" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: "#F0F0FF" }}>{item.componentName}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full border"
                            style={{ background: "#1A1A2E", borderColor: "#2A2A3E", color: "#9090B0" }}>
                            ×{item.quantity}
                          </span>
                          <span className="text-[11px] font-medium" style={{ color: "#00C896" }}>
                            ₹{item.priceRange.min}–₹{item.priceRange.max}
                          </span>
                        </div>
                        {/* Store row */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: storeStyle.bg, color: storeStyle.color }}>
                            {item.recommendedStore}
                          </span>
                          <code className="text-[11px] px-2 py-0.5 rounded"
                            style={{ background: "rgba(108,99,255,0.1)", color: "#6C63FF", fontFamily: "JetBrains Mono, monospace" }}>
                            {item.searchTerm}
                          </code>
                          <a
                            href={storeSearchUrl(item.recommendedStore, item.searchTerm)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border transition-all"
                            style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#6C63FF"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.color = "#9090B0"; }}
                          >
                            Search Now <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                      <span className="font-bold text-sm flex-shrink-0" style={{ color: "#F0F0FF" }}>
                        ₹{item.estimatedPrice}
                      </span>
                    </div>

                    {/* Tips */}
                    <div className="px-4 py-3 space-y-2 border-t" style={{ borderColor: "#2A2A3E" }}>
                      <div className="flex gap-2">
                        <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#00C896" }} />
                        <p className="text-[11px] leading-relaxed" style={{ color: "#7090B0" }}>{item.buyingTip}</p>
                      </div>
                      <div className="flex gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#FF5A5A" }} />
                        <p className="text-[11px] leading-relaxed" style={{ color: "#7090B0" }}>{item.commonMistake}</p>
                      </div>
                    </div>

                    {/* Alternatives */}
                    {item.alternatives?.length > 0 && (
                      <div className="border-t" style={{ borderColor: "#2A2A3E" }}>
                        <button
                          onClick={() => toggleExpand(i)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] transition-colors"
                          style={{ color: "#5A5A7A" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#9090B0")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#5A5A7A")}
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          Cheaper alternatives ({item.alternatives.length})
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-2">
                            {item.alternatives.map((alt, j) => (
                              <div key={j} className="flex items-start justify-between gap-2 text-[11px]">
                                <span style={{ color: "#C0C0D0" }}>{alt.name}</span>
                                <div className="text-right flex-shrink-0">
                                  <span style={{ color: "#00C896" }}>₹{alt.price}</span>
                                  <p style={{ color: "#5A5A7A" }}>{alt.tradeoff}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bulk tip */}
              {data.bulkTip && (
                <div className="p-4 rounded-xl border flex gap-3"
                  style={{ background: "rgba(108,99,255,0.05)", borderColor: "rgba(108,99,255,0.2)" }}>
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#6C63FF" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "#9090B0" }}>
                    <span style={{ color: "#6C63FF", fontWeight: 600 }}>Bulk tip:</span> {data.bulkTip}
                  </p>
                </div>
              )}

              {/* Summary */}
              <div className="p-4 rounded-xl border space-y-1.5" style={{ background: "#12121A", borderColor: "#2A2A3E" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#9090B0" }}>Total estimate:</span>
                  <span className="font-bold" style={{ color: "#F0F0FF" }}>₹{data.totalEstimate.toLocaleString("en-IN")}</span>
                </div>
                {budgetLimit && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "#9090B0" }}>Your budget:</span>
                    <span style={{ color: data.totalEstimate > budgetLimit ? "#FF5A5A" : "#00C896" }}>
                      ₹{budgetLimit.toLocaleString("en-IN")} {data.totalEstimate > budgetLimit ? "⚠ over budget" : "✓ within budget"}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
