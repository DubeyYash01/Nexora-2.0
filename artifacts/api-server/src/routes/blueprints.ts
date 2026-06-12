import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { SEED_BLUEPRINTS } from "../data/seedBlueprints";
import type { Request, Response } from "express";
import { supabase, getAuthClient } from "../lib/supabaseAdmin";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

async function callGeminiJSON(prompt: string): Promise<unknown> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

router.get("/blueprints/seed", async (_req: Request, res: Response) => {
  const { count } = await supabase.from("blueprints").select("*", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    res.json({ seeded: false, count });
    return;
  }

  for (const bp of SEED_BLUEPRINTS) {
    await supabase.from("blueprints").insert({
      title: bp.title,
      description: bp.description,
      difficulty: bp.difficulty,
      category: bp.category,
      components: bp.components,
      build_plan: bp.build_plan,
      ai_analysis: bp.ai_analysis,
      tags: bp.tags,
      is_featured: bp.is_featured ?? false,
      is_public: true,
      platform: bp.platform,
      estimated_cost_min: bp.estimated_cost_min,
      estimated_cost_max: bp.estimated_cost_max,
      estimated_time: bp.estimated_time,
    });
  }

  res.json({ seeded: true });
});

router.get("/blueprints", async (req: AuthRequest, res: Response) => {
  const { search, difficulty, category, sort = "popular", limit = 50, offset = 0 } = req.query as Record<string, string>;

  let query = supabase
    .from("blueprints")
    .select("id,title,description,difficulty,category,tags,platform,fork_count,view_count,like_count,estimated_cost_min,estimated_cost_max,estimated_time,components,author_id,created_at")
    .eq("is_public", true);

  if (difficulty && difficulty !== "All") query = query.eq("difficulty", difficulty);
  if (category && category !== "All Categories") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: "Failed to fetch blueprints" }); return; }

  let results = data ?? [];

  if (search) {
    const q = search.toLowerCase();
    results = results.filter((b) => {
      const comps = ((b.components as { list?: { name: string }[] })?.list ?? []).map((c) => c.name.toLowerCase()).join(" ");
      return (
        b.title.toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q) ||
        ((b.tags as string[]) ?? []).join(" ").toLowerCase().includes(q) ||
        comps.includes(q)
      );
    });
  }

  if (sort === "newest") results.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
  else if (sort === "forked") results.sort((a, b) => (b.fork_count ?? 0) - (a.fork_count ?? 0));
  else if (sort === "cost") results.sort((a, b) => (a.estimated_cost_min ?? 0) - (b.estimated_cost_min ?? 0));
  else results.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));

  const paginated = results.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ blueprints: paginated.map((b) => ({ ...b, userLiked: false })) });
});

router.get("/blueprints/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase.from("blueprints").select("*").eq("id", id).single();
  if (error || !data) { res.status(404).json({ error: "Blueprint not found" }); return; }

  supabase.from("blueprints").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", id).then(() => {});

  const { data: reviews } = await supabase
    .from("blueprint_reviews")
    .select("id,rating,review_text,created_at,profiles(full_name,avatar_url)")
    .eq("blueprint_id", id)
    .order("created_at", { ascending: false });

  res.json({ blueprint: { ...data, reviews: reviews ?? [], userLiked: false, userForked: false } });
});

router.post("/blueprints/fork", verifyToken, async (req: AuthRequest, res: Response) => {
  const { blueprintId, projectName, adaptToInventory } = req.body;
  const db = getAuthClient(req.token!);

  const { data: blueprint } = await supabase.from("blueprints").select("*").eq("id", blueprintId).single();
  if (!blueprint) { res.status(404).json({ error: "Blueprint not found" }); return; }

  let adaptedComponents = blueprint.components;
  let adaptationChanges: string[] = [];

  if (adaptToInventory) {
    try {
      const { data: userComps } = await db.from("user_components").select("name,category").eq("user_id", req.userId!);
      const inventory = (userComps ?? []).map((c) => c.name);
      const originalComps = ((blueprint.components as { list?: { name: string }[] })?.list ?? []).map((c) => c.name).join(", ");

      const prompt = `You are adapting an IoT blueprint for a user.
Blueprint: "${blueprint.title}"
Original components: ${originalComps}
User's inventory: ${inventory.join(", ") || "none"}

Return ONLY valid JSON:
{
  "adaptedComponents": [{ "id": "c1", "name": "name", "type": "type", "purpose": "purpose", "estimatedCost": 0, "isEssential": true, "alternatives": [], "owned": true }],
  "changes": ["change 1"],
  "totalNewCost": 0
}`;
      const result = await callGeminiJSON(prompt) as { adaptedComponents: unknown[]; changes: string[] };
      adaptedComponents = { list: result.adaptedComponents };
      adaptationChanges = result.changes ?? [];
    } catch (err) {
      logger.error({ err }, "Gemini adaptation failed");
    }
  }

  const { data: project, error } = await db
    .from("projects")
    .insert({
      user_id: req.userId!,
      title: projectName ?? blueprint.title,
      description: blueprint.description ?? "",
      idea_input: blueprint.description ?? "",
      ai_analysis: blueprint.ai_analysis,
      components: adaptedComponents,
      build_plan: blueprint.build_plan,
      status: "in_progress",
      current_step: 1,
      forked_from: blueprintId,
    })
    .select()
    .single();

  if (error || !project) { res.status(500).json({ error: "Failed to create project" }); return; }

  supabase.from("blueprints").update({ fork_count: (blueprint.fork_count ?? 0) + 1 }).eq("id", blueprintId).then(() => {});

  res.json({ projectId: project.id, adaptationChanges });
});

router.post("/blueprints/publish", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, title, description, category, tags, difficulty, isPublic, showAuthor } = req.body;
  const db = getAuthClient(req.token!);

  const { data: project } = await db.from("projects").select("*").eq("id", projectId).eq("user_id", req.userId!).single();
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const compList = (project.components as { list?: { estimatedCost?: number }[] })?.list ?? [];
  const totalCost = compList.reduce((s, c) => s + (c.estimatedCost ?? 0), 0);

  const { data: blueprint, error } = await db
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
      platform: (project.ai_analysis as { platform?: string })?.platform ?? "ESP32",
      components: project.components,
      build_plan: project.build_plan,
      ai_analysis: project.ai_analysis,
      source_project_id: projectId,
      estimated_cost_min: Math.round(totalCost * 0.85),
      estimated_cost_max: Math.round(totalCost * 1.15),
      estimated_time: (project.build_plan as { estimatedTotalTime?: string })?.estimatedTotalTime ?? "1-2 days",
    })
    .select()
    .single();

  if (error || !blueprint) { res.status(500).json({ error: "Failed to publish blueprint" }); return; }

  await db.from("projects").update({ blueprint_id: blueprint.id }).eq("id", projectId);
  res.json({ blueprintId: blueprint.id, url: `/blueprints/${blueprint.id}` });
});

router.post("/blueprints/like", verifyToken, async (req: AuthRequest, res: Response) => {
  const { blueprintId } = req.body;
  const db = getAuthClient(req.token!);

  const { data: existing } = await db
    .from("blueprint_likes")
    .select("id")
    .eq("blueprint_id", blueprintId)
    .eq("user_id", req.userId!)
    .single();

  let liked: boolean;
  if (existing) {
    await db.from("blueprint_likes").delete().eq("blueprint_id", blueprintId).eq("user_id", req.userId!);
    liked = false;
  } else {
    await db.from("blueprint_likes").insert({ blueprint_id: blueprintId, user_id: req.userId! });
    liked = true;
  }

  const { count } = await supabase.from("blueprint_likes").select("*", { count: "exact", head: true }).eq("blueprint_id", blueprintId);
  await supabase.from("blueprints").update({ like_count: count ?? 0 }).eq("id", blueprintId);
  res.json({ liked, count: count ?? 0 });
});

router.post("/blueprints/review", verifyToken, async (req: AuthRequest, res: Response) => {
  const { blueprintId, rating, reviewText } = req.body;
  const db = getAuthClient(req.token!);

  const { data: existing } = await db
    .from("blueprint_reviews")
    .select("id")
    .eq("blueprint_id", blueprintId)
    .eq("user_id", req.userId!)
    .single();

  let review;
  if (existing) {
    const { data } = await db.from("blueprint_reviews").update({ rating, review_text: reviewText, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
    review = data;
  } else {
    const { data } = await db.from("blueprint_reviews").insert({ blueprint_id: blueprintId, user_id: req.userId!, rating, review_text: reviewText }).select().single();
    review = data;
  }

  res.json({ review });
});

export default router;
