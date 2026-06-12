import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";
import { SEED_BLUEPRINTS } from "../data/seedBlueprints";
import type { Request, Response } from "express";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

async function callGeminiJSON(prompt: string): Promise<unknown> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

// GET /api/blueprints/seed
router.get("/blueprints/seed", async (_req: Request, res: Response) => {
  const { count } = await supabaseAdmin
    .from("blueprints")
    .select("*", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    res.json({ seeded: false, count });
    return;
  }

  const { error } = await supabaseAdmin.from("blueprints").insert(SEED_BLUEPRINTS);
  if (error) {
    logger.error({ err: error }, "Failed to seed blueprints");
    res.status(500).json({ error: "Failed to seed blueprints" });
    return;
  }

  res.json({ seeded: true });
});

// GET /api/blueprints
router.get("/blueprints", async (req: AuthRequest, res: Response) => {
  const { search, difficulty, category, sort = "popular", limit = 50, offset = 0 } = req.query as Record<string, string>;

  let query = supabaseAdmin
    .from("blueprints")
    .select("*, profiles(full_name, avatar_url)")
    .eq("is_public", true)
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (difficulty && difficulty !== "All") query = query.eq("difficulty", difficulty);
  if (category && category !== "All Categories") query = query.eq("category", category);

  if (sort === "newest") query = query.order("created_at", { ascending: false });
  else if (sort === "forked") query = query.order("fork_count", { ascending: false });
  else if (sort === "cost") query = query.order("estimated_cost_min", { ascending: true });
  else query = query.order("like_count", { ascending: false });

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: "Failed to fetch blueprints" }); return; }

  let results = data ?? [];

  if (search) {
    const q = search.toLowerCase();
    results = results.filter((b) => {
      const comps = (b.components?.list ?? []).map((c: { name: string }) => c.name.toLowerCase()).join(" ");
      return (
        b.title.toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q) ||
        (b.tags ?? []).join(" ").toLowerCase().includes(q) ||
        comps.includes(q)
      );
    });
  }

  // Get user liked IDs if authenticated
  let likedIds = new Set<string>();
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const { data: user } = await supabaseAdmin.auth.getUser(token);
    if (user.user) {
      const { data: likes } = await supabaseAdmin
        .from("blueprint_likes")
        .select("blueprint_id")
        .eq("user_id", user.user.id);
      likedIds = new Set((likes ?? []).map((l: { blueprint_id: string }) => l.blueprint_id));
    }
  }

  const enriched = results.map((b) => ({ ...b, userLiked: likedIds.has(b.id) }));
  res.json({ blueprints: enriched });
});

// GET /api/blueprints/:id  (must come after named routes)
router.get("/blueprints/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from("blueprints")
    .select("*, profiles(full_name, avatar_url)")
    .eq("id", id)
    .single();

  if (error || !data) { res.status(404).json({ error: "Blueprint not found" }); return; }

  // Increment view count (fire and forget)
  supabaseAdmin.from("blueprints").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", id).then(() => {});

  // Fetch reviews with user profiles
  const { data: reviews } = await supabaseAdmin
    .from("blueprint_reviews")
    .select("*, profiles(full_name, avatar_url)")
    .eq("blueprint_id", id)
    .order("created_at", { ascending: false });

  // Check user like
  let userLiked = false;
  let userForked = false;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const { data: user } = await supabaseAdmin.auth.getUser(token);
    if (user.user) {
      const { data: like } = await supabaseAdmin.from("blueprint_likes").select("id").eq("blueprint_id", id).eq("user_id", user.user.id).single();
      userLiked = !!like;
      const { data: fork } = await supabaseAdmin.from("blueprint_forks").select("id").eq("blueprint_id", id).eq("forked_by", user.user.id).single();
      userForked = !!fork;
    }
  }

  res.json({ blueprint: { ...data, reviews: reviews ?? [], userLiked, userForked } });
});

// POST /api/blueprints/fork
router.post("/blueprints/fork", verifyToken, async (req: AuthRequest, res: Response) => {
  const { blueprintId, projectName, adaptToInventory } = req.body;

  const { data: blueprint, error: bpErr } = await supabaseAdmin
    .from("blueprints")
    .select("*")
    .eq("id", blueprintId)
    .single();

  if (bpErr || !blueprint) { res.status(404).json({ error: "Blueprint not found" }); return; }

  let adaptedComponents = blueprint.components;
  let adaptationChanges: string[] = [];

  if (adaptToInventory) {
    try {
      const { data: userComps } = await supabaseAdmin
        .from("user_components")
        .select("name, category")
        .eq("user_id", req.userId!);

      const inventory = (userComps ?? []).map((c: { name: string }) => c.name);
      const originalComps = (blueprint.components?.list ?? []).map((c: { name: string }) => c.name).join(", ");
      const inventoryStr = inventory.join(", ") || "none";

      const prompt = `You are adapting an IoT blueprint for a specific user.
Blueprint: "${blueprint.title}" — ${blueprint.description}
Original components: ${originalComps}
User's inventory: ${inventoryStr}

Adapt the component list:
- Mark components the user already has as owned (set owned: true)
- Suggest substitutions for missing non-essential components
- Keep the project functional

Return ONLY valid JSON:
{
  "adaptedComponents": [
    {
      "id": "c1",
      "name": "component name",
      "type": "type",
      "purpose": "purpose",
      "estimatedCost": 0,
      "isEssential": true,
      "alternatives": [],
      "owned": true or false
    }
  ],
  "changes": ["human-readable change 1", "change 2"],
  "totalNewCost": 0
}`;

      const result = await callGeminiJSON(prompt) as { adaptedComponents: unknown[]; changes: string[]; totalNewCost: number };
      adaptedComponents = { list: result.adaptedComponents };
      adaptationChanges = result.changes ?? [];
    } catch (err) {
      logger.error({ err }, "Gemini adaptation failed, using original components");
      adaptedComponents = blueprint.components;
    }
  }

  const { data: project, error: projErr } = await supabaseAdmin
    .from("projects")
    .insert({
      user_id: req.userId!,
      title: projectName ?? blueprint.title,
      description: blueprint.description,
      idea_input: blueprint.description,
      ai_analysis: blueprint.ai_analysis,
      components: adaptedComponents,
      build_plan: blueprint.build_plan,
      status: "in_progress",
      current_step: 1,
      forked_from: blueprintId,
    })
    .select()
    .single();

  if (projErr || !project) {
    logger.error({ err: projErr }, "Failed to create forked project");
    res.status(500).json({ error: "Failed to create project" });
    return;
  }

  // Increment fork count + insert fork record (fire and forget)
  supabaseAdmin.from("blueprints").update({ fork_count: (blueprint.fork_count ?? 0) + 1 }).eq("id", blueprintId).then(() => {});
  supabaseAdmin.from("blueprint_forks").insert({ blueprint_id: blueprintId, forked_by: req.userId!, new_project_id: project.id }).then(() => {});

  res.json({ projectId: project.id, adaptationChanges });
});

// POST /api/blueprints/publish
router.post("/blueprints/publish", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, title, description, category, tags, difficulty, isPublic, showAuthor } = req.body;

  const { data: project, error: pErr } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (pErr || !project) { res.status(404).json({ error: "Project not found" }); return; }

  const compList = project.components?.list ?? [];
  const costs = compList.map((c: { estimatedCost?: number }) => c.estimatedCost ?? 0);
  const totalCost = costs.reduce((s: number, c: number) => s + c, 0);

  const { data: blueprint, error: bpErr } = await supabaseAdmin
    .from("blueprints")
    .insert({
      author_id: showAuthor ? req.userId! : null,
      title,
      description,
      category,
      tags: tags ?? [],
      difficulty,
      is_public: isPublic ?? true,
      is_featured: false,
      platform: project.ai_analysis?.platform ?? "ESP32",
      components: project.components,
      build_plan: project.build_plan,
      ai_analysis: project.ai_analysis,
      source_project_id: projectId,
      estimated_cost_min: Math.round(totalCost * 0.85),
      estimated_cost_max: Math.round(totalCost * 1.15),
      estimated_time: project.build_plan?.estimatedTotalTime ?? "1-2 days",
    })
    .select()
    .single();

  if (bpErr || !blueprint) {
    logger.error({ err: bpErr }, "Failed to publish blueprint");
    res.status(500).json({ error: "Failed to publish blueprint" });
    return;
  }

  // Link project to blueprint
  await supabaseAdmin.from("projects").update({ blueprint_id: blueprint.id }).eq("id", projectId);

  res.json({ blueprintId: blueprint.id, url: `/blueprints/${blueprint.id}` });
});

// POST /api/blueprints/like
router.post("/blueprints/like", verifyToken, async (req: AuthRequest, res: Response) => {
  const { blueprintId } = req.body;

  const { data: existing } = await supabaseAdmin
    .from("blueprint_likes")
    .select("id")
    .eq("blueprint_id", blueprintId)
    .eq("user_id", req.userId!)
    .single();

  let liked: boolean;
  if (existing) {
    await supabaseAdmin.from("blueprint_likes").delete().eq("blueprint_id", blueprintId).eq("user_id", req.userId!);
    liked = false;
  } else {
    await supabaseAdmin.from("blueprint_likes").insert({ blueprint_id: blueprintId, user_id: req.userId! });
    liked = true;
  }

  // Recount likes
  const { count } = await supabaseAdmin
    .from("blueprint_likes")
    .select("*", { count: "exact", head: true })
    .eq("blueprint_id", blueprintId);

  await supabaseAdmin.from("blueprints").update({ like_count: count ?? 0 }).eq("id", blueprintId);
  res.json({ liked, count: count ?? 0 });
});

// POST /api/blueprints/review
router.post("/blueprints/review", verifyToken, async (req: AuthRequest, res: Response) => {
  const { blueprintId, rating, reviewText } = req.body;

  const { data, error } = await supabaseAdmin
    .from("blueprint_reviews")
    .upsert({ blueprint_id: blueprintId, user_id: req.userId!, rating, review_text: reviewText }, { onConflict: "blueprint_id,user_id" })
    .select("*, profiles(full_name, avatar_url)")
    .single();

  if (error) { res.status(500).json({ error: "Failed to save review" }); return; }
  res.json({ review: data });
});

export default router;
