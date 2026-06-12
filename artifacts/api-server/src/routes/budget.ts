import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";

const router = Router();

// POST /api/budget/save
router.post("/budget/save", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, budgetLimit, components, totalEstimated } = req.body;

  if (!projectId) {
    res.status(400).json({ error: "projectId required" });
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("project_budget")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  let result;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("project_budget")
      .update({
        budget_limit: budgetLimit ?? null,
        components: components ?? [],
        total_estimated: totalEstimated ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to update budget");
      res.status(500).json({ error: "Failed to update budget" });
      return;
    }
    result = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("project_budget")
      .insert({
        project_id: projectId,
        user_id: req.userId!,
        budget_limit: budgetLimit ?? null,
        components: components ?? [],
        total_estimated: totalEstimated ?? 0,
        total_actual: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create budget");
      res.status(500).json({ error: "Failed to create budget" });
      return;
    }
    result = data;
  }

  res.json({ budget: result });
});

// GET /api/budget/:projectId
router.get("/budget/:projectId", verifyToken, async (req: AuthRequest, res) => {
  const { projectId } = req.params;

  const { data, error } = await supabaseAdmin
    .from("project_budget")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error({ err: error }, "Failed to fetch budget");
    res.status(500).json({ error: "Failed to fetch budget" });
    return;
  }

  res.json({ budget: data ?? null });
});

// PUT /api/budget/actual-cost
router.put("/budget/actual-cost", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, componentId, actualCost } = req.body;

  if (!projectId || !componentId) {
    res.status(400).json({ error: "projectId and componentId required" });
    return;
  }

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("project_budget")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (fetchErr || !existing) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }

  const comps = Array.isArray(existing.components) ? [...existing.components] : [];
  const idx = comps.findIndex((c: { componentId: string }) => c.componentId === componentId);
  if (idx >= 0) {
    comps[idx] = { ...comps[idx], actualCost: actualCost ?? null, purchased: actualCost != null };
  }

  const totalActual = comps.reduce((sum: number, c: { actualCost?: number; owned?: boolean }) => {
    if (c.owned) return sum;
    return sum + (c.actualCost ?? 0);
  }, 0);

  const { error: updateErr } = await supabaseAdmin
    .from("project_budget")
    .update({
      components: comps,
      total_actual: totalActual,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("user_id", req.userId!);

  if (updateErr) {
    logger.error({ err: updateErr }, "Failed to update actual cost");
    res.status(500).json({ error: "Failed to update actual cost" });
    return;
  }

  res.json({ success: true, totalActual });
});

export default router;
