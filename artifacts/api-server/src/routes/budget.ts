import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { projectBudget } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

const router = Router();

// POST /api/budget/save
router.post("/budget/save", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, budgetLimit, components, totalEstimated } = req.body;

  if (!projectId) {
    res.status(400).json({ error: "projectId required" });
    return;
  }

  const [existing] = await db
    .select({ id: projectBudget.id })
    .from(projectBudget)
    .where(and(eq(projectBudget.projectId, projectId), eq(projectBudget.userId, req.userId!)));

  let result;
  if (existing) {
    const [updated] = await db
      .update(projectBudget)
      .set({ budgetLimit: budgetLimit ?? null, components: components ?? [], totalEstimated: totalEstimated ?? 0, updatedAt: new Date() })
      .where(eq(projectBudget.id, existing.id))
      .returning();
    result = updated;
  } else {
    const [inserted] = await db
      .insert(projectBudget)
      .values({ id: crypto.randomUUID(), projectId, userId: req.userId!, budgetLimit: budgetLimit ?? null, components: components ?? [], totalEstimated: totalEstimated ?? 0, totalActual: "0" })
      .returning();
    result = inserted;
  }

  res.json({ budget: result });
});

// GET /api/budget/:projectId
router.get("/budget/:projectId", verifyToken, async (req: AuthRequest, res) => {
  const { projectId } = req.params;

  const [data] = await db
    .select()
    .from(projectBudget)
    .where(and(eq(projectBudget.projectId, projectId), eq(projectBudget.userId, req.userId!)));

  res.json({ budget: data ?? null });
});

// PUT /api/budget/actual-cost
router.put("/budget/actual-cost", verifyToken, async (req: AuthRequest, res) => {
  const { projectId, componentId, actualCost } = req.body;

  if (!projectId || !componentId) {
    res.status(400).json({ error: "projectId and componentId required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectBudget)
    .where(and(eq(projectBudget.projectId, projectId), eq(projectBudget.userId, req.userId!)));

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
    .update(projectBudget)
    .set({ components: comps, totalActual: String(totalActual), updatedAt: new Date() })
    .where(and(eq(projectBudget.projectId, projectId), eq(projectBudget.userId, req.userId!)));

  res.json({ success: true, totalActual });
});

export default router;
