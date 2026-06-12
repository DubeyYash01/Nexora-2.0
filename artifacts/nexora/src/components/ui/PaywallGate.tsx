import { useState } from "react";
import { Lock, Zap } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import type { PlanId } from "@/lib/planLimits";
import UpgradeModal from "@/components/billing/UpgradeModal";

interface PaywallGateProps {
  children: React.ReactNode;
  requiredPlan?: PlanId | "pro";
  feature?: string;
  reason?: string;
  mode?: "block" | "blur" | "lock-icon";
  className?: string;
}

export default function PaywallGate({
  children,
  requiredPlan = "pro",
  feature,
  reason,
  mode = "block",
  className = "",
}: PaywallGateProps) {
  const { plan, isPro, loading } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const hasAccess = () => {
    if (requiredPlan === "pro") return isPro;
    if (requiredPlan === "maker_pro") return plan === "maker_pro" || plan === "college_lab";
    if (requiredPlan === "student_pro") return isPro;
    return true;
  };

  if (loading) return <>{children}</>;
  if (hasAccess()) return <>{children}</>;

  if (mode === "lock-icon") {
    return (
      <>
        <div className={`relative cursor-pointer ${className}`} onClick={() => setShowUpgrade(true)}>
          {children}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg backdrop-blur-[1px]">
            <div className="p-2 rounded-full bg-background/80 border border-border">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} reason={reason} featureName={feature} />}
      </>
    );
  }

  if (mode === "blur") {
    return (
      <>
        <div className={`relative ${className}`}>
          <div className="pointer-events-none select-none opacity-40 blur-sm">{children}</div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-2xl bg-card/90 border border-border shadow-lg backdrop-blur-sm text-center px-5">
              <Zap className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{feature ?? "Pro Feature"}</p>
              {reason && <p className="text-xs text-muted-foreground mt-1">{reason}</p>}
              <button
                onClick={() => setShowUpgrade(true)}
                className="mt-3 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-colors"
              >
                Upgrade to unlock
              </button>
            </div>
          </div>
        </div>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} reason={reason} featureName={feature} />}
      </>
    );
  }

  return (
    <>
      <div className={`flex flex-col items-center justify-center gap-4 p-8 rounded-xl bg-card/50 border border-border/50 border-dashed text-center ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{feature ?? "Pro Feature"}</h3>
          {reason && <p className="text-sm text-muted-foreground mt-1">{reason}</p>}
        </div>
        <button
          onClick={() => setShowUpgrade(true)}
          className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-all flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Upgrade to unlock
        </button>
      </div>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} reason={reason} featureName={feature} />}
    </>
  );
}
