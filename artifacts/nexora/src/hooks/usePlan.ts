import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import type { PlanId } from "@/lib/planLimits";
import { isProPlan } from "@/lib/planLimits";

export interface SubscriptionData {
  plan: PlanId;
  status?: "active" | "trial" | "cancelled" | "expired";
  trial_ends_at?: string;
  current_period_end?: string;
  subscription: {
    id?: string;
    plan?: string;
    status?: string;
    billing_cycle?: string;
    current_period_end?: string;
    trial_ends_at?: string;
  } | null;
  trial_used: boolean;
}

export function usePlan() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const res = await authFetch(`/api/payments/subscription/${user.id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const plan: PlanId = (data?.plan ?? profile?.plan ?? "free") as PlanId;
  const isPro = isProPlan(plan);
  const isTrial = data?.subscription?.status === "trial";
  const isActive = data?.subscription?.status === "active";
  const trialUsed = data?.trial_used ?? false;

  return {
    plan,
    isPro,
    isTrial,
    isActive,
    trialUsed,
    loading,
    subscription: data?.subscription ?? null,
    refresh: fetchPlan,
  };
}
