import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { getAuthClient } from "../lib/supabaseAdmin";

const router = Router();

router.post("/budget/save", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, budgetLimit, components, totalEstimated } = req.body;

  if (!projectId) {
    res.status(400).json({ error: "projectId required" });
    return;
  }

  const db = getAuthClient(req.token!);
  const { data: existing } = await db
    .from("project_budget")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  let result;
  if (existing) {
    const { data } = await db
      .from("project_budget")
      .update({ budget_limit: budgetLimit ?? null, components: components ?? [], total_estimated: totalEstimated ?? 0, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    result = data;
  } else {
    const { data } = await db
      .from("project_budget")
      .insert({ project_id: projectId, user_id: req.userId!, budget_limit: budgetLimit ?? null, components: components ?? [], total_estimated: totalEstimated ?? 0, total_actual: 0 })
      .select()
      .single();
    result = data;
  }

  res.json({ budget: result });
});

router.get("/budget/:projectId", verifyToken, async (req: AuthRequest, res) => {
  const { projectId } = req.params;
  const db = getAuthClient(req.token!);

  const { data } = await db
    .from("project_budget")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  res.json({ budget: data ?? null });
});

router.put("/budget/actual-cost", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, componentId, actualCost } = req.body;

  if (!projectId || !componentId) {
    res.status(400).json({ error: "projectId and componentId required" });
    return;
  }

  const db = getAuthClient(req.token!);
  const { data: existing } = await db
    .from("project_budget")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (!existing) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }

  const comps = Array.isArray(existing.components) ? [...existing.components as object[]] : [];
  const idx = (comps as { componentId: string }[]).findIndex((c) => c.componentId === componentId);
  if (idx >= 0) {
    (comps as Record<string, unknown>[])[idx] = { ...(comps[idx] as object), actualCost: actualCost ?? null, purchased: actualCost != null };
  }

  const totalActual = (comps as { owned?: boolean; actualCost?: number }[]).reduce((sum, c) => {
    if (c.owned) return sum;
    return sum + (c.actualCost ?? 0);
  }, 0);

  await db
    .from("project_budget")
    .update({ components: comps, total_actual: totalActual, updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("user_id", req.userId!);

  res.json({ success: true, totalActual });
});

export default router;
