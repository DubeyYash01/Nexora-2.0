import { useState } from "react";
import { X, Zap, Check, Loader2, Star, ArrowRight, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import { usePlan } from "@/hooks/usePlan";
import { useLocation } from "wouter";

interface UpgradeModalProps {
  onClose: () => void;
  reason?: string;
  featureName?: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

export default function UpgradeModal({ onClose, reason, featureName }: UpgradeModalProps) {
  const { user, profile } = useAuth();
  const { trialUsed, refresh } = usePlan();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<"student_pro" | "maker_pro">("student_pro");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "semester">("monthly");
  const [loading, setLoading] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  const plans = [
    {
      id: "student_pro" as const,
      name: "Student Pro",
      price: { monthly: 299, semester: 999 },
      badge: "Popular",
      features: ["50 AI messages/day", "Unlimited projects", "Publish blueprints", "Full AI assistant"],
      color: "primary",
    },
    {
      id: "maker_pro" as const,
      name: "Maker Pro",
      price: { monthly: 499, semester: 0 },
      features: ["Unlimited AI messages", "All Student Pro features", "AI code review", "Priority support"],
      color: "accent",
    },
  ];

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleStartTrial = async () => {
    setStartingTrial(true);
    try {
      const res = await authFetch("/api/payments/start-trial", { method: "POST" });
      if (res.ok) {
        await refresh();
        onClose();
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setStartingTrial(false);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const cycle = selectedPlan === "maker_pro" ? "monthly" : billingCycle;
      const res = await authFetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ plan: selectedPlan, billingCycle: cycle }),
      });

      if (!res.ok) {
        alert("Payment gateway not configured. Contact support.");
        return;
      }

      const { orderId, amount, keyId } = await res.json();
      const loaded = await loadRazorpayScript();
      if (!loaded) { alert("Failed to load payment gateway"); return; }

      const options = {
        key: keyId,
        amount,
        currency: "INR",
        name: "Nexora",
        description: `${plans.find((p) => p.id === selectedPlan)?.name} Plan`,
        order_id: orderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verifyRes = await authFetch("/api/payments/verify", {
            method: "POST",
            body: JSON.stringify({ ...response, plan: selectedPlan, billingCycle: cycle }),
          });
          if (verifyRes.ok) {
            await refresh();
            onClose();
            window.location.reload();
          }
        },
        prefill: { email: profile?.email ?? user?.email ?? "" },
        theme: { color: "#6C63FF" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-6 border-b border-border">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Upgrade Nexora</h2>
          </div>
          {reason && (
            <p className="text-sm text-muted-foreground">
              {featureName ? (
                <><span className="text-accent font-medium">{featureName}</span> — {reason}</>
              ) : reason}
            </p>
          )}
        </div>

        <div className="p-6 space-y-5">
          {!trialUsed && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
              <Gift className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-400">7-Day Free Trial Available!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Try Student Pro free for 7 days. No payment required.</p>
                <button
                  onClick={handleStartTrial}
                  disabled={startingTrial}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-400 hover:text-green-300 transition-colors"
                >
                  {startingTrial ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                  Start free trial
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${selectedPlan === plan.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-foreground text-sm">{plan.name}</span>
                  {plan.badge && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{plan.badge}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-lg font-bold text-foreground">
                    ₹{plan.price[billingCycle === "semester" && plan.id === "student_pro" ? "semester" : "monthly"]}
                  </span>
                  <span className="text-xs text-muted-foreground">/{billingCycle === "semester" && plan.id === "student_pro" ? "semester" : "month"}</span>
                </div>
                <ul className="space-y-1">
                  {plan.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {selectedPlan === "student_pro" && (
            <div className="flex rounded-lg bg-background border border-border overflow-hidden">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Monthly ₹299
              </button>
              <button
                onClick={() => setBillingCycle("semester")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${billingCycle === "semester" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Semester ₹999 <span className="text-xs text-green-400 ml-1">Save 44%</span>
              </button>
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Star className="w-4 h-4" /> Upgrade Now</>}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Secure payment via Razorpay · Cancel anytime ·{" "}
            <button onClick={() => { onClose(); setLocation("/pricing"); }} className="text-primary hover:underline">
              View all plans
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
