import { useState, useEffect, useCallback } from "react";
import { Pencil, Check, ShoppingCart, Eye, EyeOff } from "lucide-react";
import { authFetch } from "@/lib/supabase";
import ShoppingListModal from "./ShoppingList";

interface BudgetComponent {
  componentId: string;
  name: string;
  estimatedCost: number;
  actualCost: number | null;
  owned: boolean;
  quantity: number;
  purchased: boolean;
}

interface Budget {
  id: string;
  project_id: string;
  budget_limit: number | null;
  components: BudgetComponent[];
  total_estimated: number;
  total_actual: number;
}

export default function BudgetTracker({
  projectId,
  projectComponents,
}: {
  projectId: string;
  projectComponents?: Array<{ name: string; purpose: string; estimatedCost?: number; owned?: boolean }>;
}) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [showOwned, setShowOwned] = useState(false);
  const [editingActual, setEditingActual] = useState<string | null>(null);
  const [actualInput, setActualInput] = useState("");
  const [showShopping, setShowShopping] = useState(false);

  const loadBudget = useCallback(async () => {
    try {
      const res = await authFetch(`/api/budget/${projectId}`);
      if (!res.ok) return;
      const data = await res.json() as { budget: Budget | null };
      if (data.budget) {
        setBudget(data.budget);
      } else if (projectComponents && projectComponents.length > 0) {
        // Auto-create budget from project components
        const comps: BudgetComponent[] = projectComponents.map((c, i) => ({
          componentId: `comp-${i}`,
          name: c.name,
          estimatedCost: c.estimatedCost ?? 0,
          actualCost: null,
          owned: c.owned ?? false,
          quantity: 1,
          purchased: false,
        }));
        const totalEst = comps.reduce((s, c) => s + (c.owned ? 0 : c.estimatedCost), 0);
        const saveRes = await authFetch("/api/budget/save", {
          method: "POST",
          body: JSON.stringify({ projectId, components: comps, totalEstimated: totalEst }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json() as { budget: Budget };
          setBudget(saved.budget);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId, projectComponents]);

  useEffect(() => { loadBudget(); }, [loadBudget]);

  const saveBudgetLimit = async () => {
    const limit = limitInput ? Number(limitInput) : null;
    const res = await authFetch("/api/budget/save", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        budgetLimit: limit,
        components: budget?.components ?? [],
        totalEstimated: budget?.total_estimated ?? 0,
      }),
    });
    if (res.ok) {
      const data = await res.json() as { budget: Budget };
      setBudget(data.budget);
    }
    setEditingLimit(false);
  };

  const saveActualCost = async (componentId: string) => {
    const actualCost = actualInput ? Number(actualInput) : null;
    const res = await authFetch("/api/budget/actual-cost", {
      method: "PUT",
      body: JSON.stringify({ projectId, componentId, actualCost }),
    });
    if (res.ok) {
      setBudget((prev) => {
        if (!prev) return prev;
        const comps = prev.components.map((c) =>
          c.componentId === componentId
            ? { ...c, actualCost, purchased: actualCost != null }
            : c
        );
        const totalActual = comps.reduce((s, c) => s + (c.owned ? 0 : (c.actualCost ?? 0)), 0);
        return { ...prev, components: comps, total_actual: totalActual };
      });
    }
    setEditingActual(null);
    setActualInput("");
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin mx-auto"
          style={{ borderColor: "#6C63FF", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const comps = budget?.components ?? [];
  const displayComps = showOwned ? comps : comps.filter((c) => !c.owned);
  const needToBuy = comps.filter((c) => !c.owned);
  const totalEst = needToBuy.reduce((s, c) => s + c.estimatedCost, 0);
  const totalActual = budget?.total_actual ?? 0;
  const diff = totalActual - totalEst;
  const limit = budget?.budget_limit ?? null;
  const spentPct = limit ? Math.min(100, Math.round((totalActual / limit) * 100)) : 0;
  const barColor = spentPct > 90 ? "#FF5A5A" : spentPct > 70 ? "#FFB84D" : "#00C896";

  const shoppingItems = needToBuy
    .filter((c) => !c.purchased)
    .map((c) => ({ name: c.name, quantity: c.quantity }));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: "#F0F0FF" }}>Project Budget</h3>
        <button
          onClick={() => { setEditingLimit(true); setLimitInput(String(limit ?? "")); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "#9090B0" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(90,90,122,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Budget limit */}
      {editingLimit ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center border rounded-lg overflow-hidden"
            style={{ borderColor: "#6C63FF", background: "#0A0A0F" }}>
            <span className="px-2 text-xs" style={{ color: "#5A5A7A" }}>₹</span>
            <input
              autoFocus
              type="number"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="Set budget limit"
              className="flex-1 py-2 pr-3 text-xs outline-none"
              style={{ background: "transparent", color: "#F0F0FF" }}
              onKeyDown={(e) => e.key === "Enter" && saveBudgetLimit()}
            />
          </div>
          <button onClick={saveBudgetLimit}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#6C63FF", color: "#fff" }}>
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : limit ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span style={{ color: "#9090B0" }}>₹{totalActual.toLocaleString("en-IN")}</span>
            <span style={{ color: "#9090B0" }}>of ₹{limit.toLocaleString("en-IN")}</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ background: "#1A1A2E", height: 6 }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${spentPct}%`, background: barColor }}
            />
          </div>
          <p className="text-[11px]" style={{ color: "#5A5A7A" }}>{spentPct}% of budget used</p>
        </div>
      ) : (
        <button
          onClick={() => setEditingLimit(true)}
          className="text-xs transition-colors"
          style={{ color: "#6C63FF" }}
        >
          + Set a budget limit
        </button>
      )}

      {/* Show/hide owned toggle */}
      {comps.some((c) => c.owned) && (
        <button
          onClick={() => setShowOwned((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] transition-colors"
          style={{ color: "#9090B0" }}
        >
          {showOwned ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showOwned ? "Hide owned components" : "Show owned components"}
        </button>
      )}

      {/* Components table */}
      <div className="space-y-1">
        {displayComps.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "#3A3A5A" }}>
            No components to purchase
          </p>
        ) : (
          displayComps.map((c) => (
            <div
              key={c.componentId}
              className="flex items-center gap-2 py-2 px-2 rounded-lg"
              style={{ background: c.owned ? "rgba(0,200,150,0.04)" : "transparent" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "#C0C0D0" }}>{c.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px]" style={{ color: "#5A5A7A" }}>×{c.quantity}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium`}
                    style={{
                      background: c.owned ? "rgba(0,200,150,0.1)" : "rgba(255,184,77,0.1)",
                      color: c.owned ? "#00C896" : "#FFB84D",
                    }}>
                    {c.owned ? "Own" : "Buy"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span className="text-[11px]" style={{ color: "#9090B0" }}>₹{c.estimatedCost}</span>
                {!c.owned && (
                  editingActual === c.componentId ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="number"
                        value={actualInput}
                        onChange={(e) => setActualInput(e.target.value)}
                        className="w-16 text-[11px] px-1.5 py-0.5 rounded border outline-none text-right"
                        style={{ background: "#0A0A0F", borderColor: "#6C63FF", color: "#F0F0FF" }}
                        onKeyDown={(e) => e.key === "Enter" && saveActualCost(c.componentId)}
                      />
                      <button onClick={() => saveActualCost(c.componentId)}
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ background: "#6C63FF", color: "#fff" }}>
                        <Check className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingActual(c.componentId); setActualInput(c.actualCost != null ? String(c.actualCost) : ""); }}
                      className="text-[10px] flex items-center gap-0.5 transition-colors"
                      style={{ color: c.actualCost != null ? "#00C896" : "#3A3A5A" }}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      {c.actualCost != null ? `₹${c.actualCost}` : "actual"}
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="space-y-1 pt-3 border-t" style={{ borderColor: "#2A2A3E" }}>
        <div className="flex justify-between text-xs">
          <span style={{ color: "#9090B0" }}>Estimated total:</span>
          <span style={{ color: "#C0C0D0" }}>₹{totalEst.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: "#9090B0" }}>Actual total:</span>
          <span style={{ color: "#C0C0D0" }}>₹{totalActual.toLocaleString("en-IN")}</span>
        </div>
        {totalActual > 0 && (
          <div className="flex justify-between text-xs font-semibold">
            <span style={{ color: "#9090B0" }}>Difference:</span>
            <span style={{ color: diff > 0 ? "#FF5A5A" : "#00C896" }}>
              {diff > 0 ? "+" : ""}₹{diff.toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>

      {/* Shopping list button */}
      {shoppingItems.length > 0 && (
        <button
          onClick={() => setShowShopping(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all"
          style={{ borderColor: "#2A2A3E", color: "#9090B0" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#6C63FF";
            e.currentTarget.style.color = "#6C63FF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#2A2A3E";
            e.currentTarget.style.color = "#9090B0";
          }}
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Generate Shopping List
        </button>
      )}

      {showShopping && (
        <ShoppingListModal
          open={showShopping}
          components={shoppingItems}
          budgetLimit={limit ?? undefined}
          totalEstimated={totalEst}
          onClose={() => setShowShopping(false)}
        />
      )}
    </div>
  );
}
