import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Zap, Star, Building2, ArrowRight, Loader2, Gift, X, Cpu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { authFetch } from "@/lib/supabase";
import { PLANS } from "@/lib/planLimits";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { user, profile } = useAuth();
  const { plan: currentPlan, trialUsed, refresh } = usePlan();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "semester">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ institutionName: "", contactName: "", email: "", phone: "", studentCount: "", message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

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
    if (!user) { setLocation("/signup"); return; }
    setStartingTrial(true);
    try {
      const res = await authFetch("/api/payments/start-trial", { method: "POST" });
      if (res.ok) { await refresh(); window.location.reload(); }
    } finally {
      setStartingTrial(false);
    }
  };

  const handlePurchase = async (planId: "student_pro" | "maker_pro") => {
    if (!user) { setLocation("/signup"); return; }
    setLoading(planId);
    try {
      const cycle = planId === "maker_pro" ? "monthly" : billingCycle;
      const res = await authFetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ plan: planId, billingCycle: cycle }),
      });
      if (!res.ok) { alert("Payment gateway not configured. Please contact support."); return; }
      const { orderId, amount, keyId } = await res.json();

      const loaded = await loadRazorpayScript();
      if (!loaded) { alert("Failed to load payment gateway"); return; }

      const options = {
        key: keyId,
        amount,
        currency: "INR",
        name: "Nexora",
        description: `${PLANS[planId].name} Plan`,
        order_id: orderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verifyRes = await authFetch("/api/payments/verify", {
            method: "POST",
            body: JSON.stringify({ ...response, plan: planId, billingCycle: cycle }),
          });
          if (verifyRes.ok) { await refresh(); window.location.reload(); }
        },
        prefill: { email: profile?.email ?? user?.email ?? "" },
        theme: { color: "#6C63FF" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } finally {
      setLoading(null);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      await authFetch("/api/contact/college-inquiry", { method: "POST", body: JSON.stringify(contactForm) });
      setContactSent(true);
    } finally {
      setContactLoading(false);
    }
  };

  const isCurrent = (planId: string) => currentPlan === planId;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">Nexora</span>
          </button>
          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={() => setLocation("/dashboard")} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors">
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => setLocation("/login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</button>
                <button onClick={() => setLocation("/signup")} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors">Get Started</button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Build smarter IoT projects
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>

          {!trialUsed && user && (
            <div className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
              <Gift className="w-4 h-4" />
              Start with a 7-day free trial of Student Pro — no card required
              <button
                onClick={handleStartTrial}
                disabled={startingTrial}
                className="ml-2 flex items-center gap-1 text-green-300 hover:text-green-200 underline transition-colors"
              >
                {startingTrial ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Activate trial
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center mb-8">
          <div className="flex rounded-lg bg-card border border-border overflow-hidden">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2.5 text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("semester")}
              className={`px-6 py-2.5 text-sm font-medium transition-colors ${billingCycle === "semester" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Semester <span className="ml-1.5 text-xs text-green-400 font-semibold">Save 44%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {(["free", "student_pro", "maker_pro"] as const).map((planId) => {
            const plan = PLANS[planId];
            const isPopular = planId === "student_pro";
            const price = planId === "student_pro" && billingCycle === "semester" ? 999 : plan.price.monthly;

            return (
              <div
                key={planId}
                className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all ${
                  isPopular
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card"
                } ${isCurrent(planId) ? "ring-2 ring-primary/50" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </div>
                )}
                {isCurrent(planId) && (
                  <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold">
                    Current Plan
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.highlight ?? ""}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  {price === 0 ? (
                    <span className="text-3xl font-bold text-foreground">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-foreground">₹{price}</span>
                      <span className="text-muted-foreground text-sm">/{billingCycle === "semester" && planId === "student_pro" ? "semester" : "month"}</span>
                    </>
                  )}
                </div>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {planId === "free" ? (
                  isCurrent(planId) ? (
                    <button className="w-full py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium cursor-default">
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => user ? setLocation("/dashboard") : setLocation("/signup")}
                      className="w-full py-2.5 rounded-xl border border-border hover:bg-card/80 text-foreground text-sm font-medium transition-colors"
                    >
                      {user ? "Stay on Free" : "Get Started Free"}
                    </button>
                  )
                ) : isCurrent(planId) ? (
                  <button className="w-full py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium cursor-default">
                    Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(planId)}
                    disabled={loading === planId}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                      isPopular
                        ? "bg-primary hover:bg-primary/90 text-white"
                        : "bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30"
                    }`}
                  >
                    {loading === planId ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> Upgrade Now</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{PLANS.college_lab.name}</h3>
              <p className="text-muted-foreground text-sm mt-1">For universities & engineering colleges — complete IoT lab management</p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {PLANS.college_lab.features.slice(0, 4).map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            onClick={() => setContactOpen(true)}
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-colors whitespace-nowrap"
          >
            Contact Us <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setContactOpen(false)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6">
            <button onClick={() => setContactOpen(false)} className="absolute top-4 right-4 p-1.5 hover:bg-card/80 rounded-lg text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-foreground mb-1">College Lab License</h2>
            <p className="text-sm text-muted-foreground mb-5">We'll reach out within 24 hours with pricing for your institution.</p>

            {contactSent ? (
              <div className="text-center py-8">
                <Check className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Request received!</p>
                <p className="text-sm text-muted-foreground mt-1">We'll contact you at {contactForm.email} within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Institution Name *</label>
                    <input value={contactForm.institutionName} onChange={(e) => setContactForm((p) => ({ ...p, institutionName: e.target.value }))} required className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Contact Name *</label>
                    <input value={contactForm.contactName} onChange={(e) => setContactForm((p) => ({ ...p, contactName: e.target.value }))} required className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email *</label>
                  <input type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} required className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone</label>
                    <input value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Approx. Students</label>
                    <input type="number" value={contactForm.studentCount} onChange={(e) => setContactForm((p) => ({ ...p, studentCount: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Message</label>
                  <textarea value={contactForm.message} onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))} rows={3} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="Tell us about your use case..." />
                </div>
                <button type="submit" disabled={contactLoading} className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {contactLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Inquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
