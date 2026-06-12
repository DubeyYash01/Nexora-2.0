import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/supabase";
import type { PlanId } from "@/lib/planLimits";

export interface AIUsage {
  plan: PlanId;
  aiMessagesToday: number;
  aiLimit: number;
  aiRemaining: number;
  allowed: boolean;
  trial_used: boolean;
}

export function useAILimit() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await authFetch("/api/usage/me");
      if (res.ok) {
        const json = await res.json();
        setUsage({
          plan: json.plan as PlanId,
          aiMessagesToday: json.aiMessagesToday,
          aiLimit: json.aiLimit,
          aiRemaining: json.aiRemaining,
          allowed: json.aiRemaining === -1 || json.aiRemaining > 0,
          trial_used: json.trial_used ?? false,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { usage, loading, refresh: fetchUsage };
}
