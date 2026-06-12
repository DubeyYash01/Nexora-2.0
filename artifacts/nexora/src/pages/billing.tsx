import { useState } from "react";
import { useLocation } from "wouter";
import { CreditCard, Zap, ArrowLeft, Calendar, CheckCircle, XCircle, Clock, Gift, ExternalLink, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useAILimit } from "@/hooks/useAILimit";
import { authFetch } from "@/lib/supabase";
import { PLANS, getPlanName } from "@/lib/planLimits";
import UpgradeModal from "@/components/billing/UpgradeModal";

export default function BillingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { plan, isPro, isTrial, isActive, subscription, loading, trialUsed, refresh } = usePlan();
  const { usage } = useAILimit();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [history, setHistory] = useState<{ id: string; amount: number; plan: string; status: string; created_at: string }[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const res = await authFetch(`/api/payments/history/${user.id}`);
      if (res.ok) {
        const { history: h } = await res.json();
        setHistory(h);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel? You'll keep access until the end of the current period.")) return;
    setCancelling(true);
    try {
      await authFetch("/api/payments/cancel", { method: "POST" });
      await refresh();
    } finally {
      setCancelling(false);
    }
  };

  const planDetails = PLANS[plan];
  const periodEnd = subscription?.current_period_end ?? subscription?.trial_ends_at;

  const statusBadge = () => {
    if (subscription?.status === "active") return <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Active</span>;
    if (subscription?.status === "trial") return <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full"><Gift className="w-3 h-3" />Trial</span>;
    if (subscription?.status === "cancelled") return <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Cancelled</span>;
    if (subscription?.status === "expired") return <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-card px-2 py-0.5 rounded-full border border-border"><Clock className="w-3 h-3" />Expired</span>;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse w-8 h-8 rounded-full bg-primary/50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => setLocation("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground mt-1">Manage your plan and payment details</p>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">{getPlanName(plan)}</h2>
                  {statusBadge()}
                </div>
                {periodEnd && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {subscription?.status === "trial" ? "Trial ends" : subscription?.status === "cancelled" ? "Access until" : "Renews"}{" "}
                    {new Date(periodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!isPro && (
                  <button
                    onClick={() => setShowUpgrade(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Upgrade
                  </button>
                )}
                {(isActive || isTrial) && subscription?.status !== "cancelled" && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-card/80 text-sm text-muted-foreground transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border">
              <div className="text-center p-3 rounded-xl bg-background">
                <div className="text-2xl font-bold text-foreground">
                  {usage?.aiMessagesToday ?? 0}
                  <span className="text-sm text-muted-foreground font-normal">/{usage?.aiLimit === -1 ? "∞" : (usage?.aiLimit ?? 3)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">AI Messages Today</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-background">
                <div className="text-2xl font-bold text-foreground">
                  {planDetails.projectsAllowed === "unlimited" ? "∞" : planDetails.projectsAllowed}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Projects Allowed</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-background col-span-2 sm:col-span-1">
                <div className="text-2xl font-bold text-foreground">
                  {planDetails.aiMessagesPerDay === "unlimited" ? "∞" : planDetails.aiMessagesPerDay}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">AI Msgs/Day Limit</div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Plan Features
            </h3>
            <ul className="space-y-2">
              {planDetails.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!isPro && (
              <button
                onClick={() => setLocation("/pricing")}
                className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
              >
                See all plans <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Payment History
              </h3>
              <button
                onClick={() => { if (!history) loadHistory(); }}
                disabled={historyLoading}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} />
                {history ? "Refresh" : "Load"}
              </button>
            </div>

            {history === null ? (
              <p className="text-sm text-muted-foreground text-center py-6">Click "Load" to view payment history</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{getPlanName(h.plan)} Plan</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">₹{h.amount / 100}</p>
                      <span className={`text-xs font-medium ${h.status === "captured" ? "text-green-400" : "text-muted-foreground"}`}>
                        {h.status === "captured" ? "Paid" : h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!trialUsed && !isPro && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
              <Gift className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Free 7-Day Trial Available</h3>
              <p className="text-sm text-muted-foreground mb-4">Try Student Pro for free — no payment required</p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium text-sm transition-colors"
              >
                Activate Free Trial
              </button>
            </div>
          )}
        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
