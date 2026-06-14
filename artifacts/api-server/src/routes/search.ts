import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabase } from "../lib/supabaseAdmin";
import type { Response } from "express";

const router = Router();

router.post("/search/global", verifyToken, async (req: AuthRequest, res: Response) => {
  const { query, types = ["blueprints", "projects", "components"], limit = 10 } = req.body;
  const userId = req.userId!;

  if (!query || query.length < 2) {
    res.json({ results: [], totalCount: 0 });
    return;
  }

  const results: unknown[] = [];

  if (types.includes("blueprints")) {
    const { data: blueprints } = await supabase
      .from("blueprints")
      .select("id,title,description,difficulty,category,platform,fork_count,like_count,estimated_cost_min,estimated_cost_max,components,tags")
      .eq("is_public", true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("fork_count", { ascending: false })
      .limit(Math.min(Number(limit), 8));

    for (const b of blueprints ?? []) {
      results.push({
        id: b.id,
        type: "blueprint",
        title: b.title,
        description: b.description ?? "",
        difficulty: b.difficulty,
        category: b.category,
        platform: b.platform,
        fork_count: b.fork_count ?? 0,
        like_count: b.like_count ?? 0,
        estimated_cost_min: b.estimated_cost_min ?? 0,
        estimated_cost_max: b.estimated_cost_max ?? 0,
        tags: b.tags ?? [],
      });
    }
  }

  if (types.includes("projects")) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id,title,description,status,current_step,build_plan,created_at,updated_at")
      .eq("user_id", userId)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("updated_at", { ascending: false })
      .limit(Math.min(Number(limit), 5));

    for (const p of projects ?? []) {
      const totalSteps = ((p.build_plan as { steps?: unknown[] })?.steps ?? []).length;
      results.push({
        id: p.id,
        type: "project",
        title: p.title,
        description: p.description ?? "",
        status: p.status,
        current_step: p.current_step ?? 1,
        total_steps: totalSteps,
        updated_at: p.updated_at,
      });
    }
  }

  if (types.includes("components")) {
    const { data: components } = await supabase
      .from("user_components")
      .select("id,name,category,quantity,condition,notes")
      .eq("user_id", userId)
      .or(`name.ilike.%${query}%,notes.ilike.%${query}%`)
      .order("name")
      .limit(Math.min(Number(limit), 5));

    for (const c of components ?? []) {
      results.push({
        id: c.id,
        type: "component",
        title: c.name,
        description: c.notes ?? "",
        category: c.category ?? "General",
        quantity: c.quantity ?? 1,
        condition: c.condition ?? "New",
      });
    }
  }

  res.json({ results, totalCount: results.length });
});

router.post("/search/history", verifyToken, async (req: AuthRequest, res: Response) => {
  const { query, clickedId, clickedType, resultsCount } = req.body;
  const userId = req.userId!;

  if (!query) { res.json({ success: false }); return; }

  await supabase.from("search_history").insert({
    user_id: userId,
    query,
    clicked_result_id: clickedId ?? null,
    clicked_result_type: clickedType ?? null,
    results_count: resultsCount ?? 0,
  });

  res.json({ success: true });
});

router.get("/search/history", verifyToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const { data } = await supabase
    .from("search_history")
    .select("id,query,search_type,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const seen = new Set<string>();
  const history = (data ?? []).filter((h) => {
    if (seen.has(h.query)) return false;
    seen.add(h.query);
    return true;
  }).slice(0, 10);

  res.json({ history });
});

router.delete("/search/history", verifyToken, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  await supabase.from("search_history").delete().eq("user_id", userId);
  res.json({ success: true });
});

export default router;
