import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { SEED_BLUEPRINTS } from "../data/seedBlueprints";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { blueprints, blueprintLikes, blueprintReviews, projects, userComponents, profiles } from "@workspace/db/schema";
import { and, eq, desc, asc, count, inArray } from "drizzle-orm";

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
  const [{ total }] = await db.select({ total: count() }).from(blueprints);

  if ((total ?? 0) > 0) {
    res.json({ seeded: false, count: total });
    return;
  }

  for (const bp of SEED_BLUEPRINTS) {
    await db.insert(blueprints).values({
      id: crypto.randomUUID(),
      title: bp.title,
      description: bp.description,
      difficulty: bp.difficulty,
      category: bp.category,
      components: bp.components,
      buildPlan: bp.build_plan,
      aiAnalysis: bp.ai_analysis,
      tags: bp.tags,
      isFeatured: bp.is_featured ?? false,
      isPublic: true,
      platform: bp.platform,
      estimatedCostMin: bp.estimated_cost_min,
      estimatedCostMax: bp.estimated_cost_max,
      estimatedTime: bp.estimated_time,
    });
  }

  res.json({ seeded: true });
});

// GET /api/blueprints
router.get("/blueprints", async (req: AuthRequest, res: Response) => {
  const { search, difficulty, category, sort = "popular", limit = 50, offset = 0 } = req.query as Record<string, string>;

  let query = db.select({
    id: blueprints.id,
    title: blueprints.title,
    description: blueprints.description,
    difficulty: blueprints.difficulty,
    category: blueprints.category,
    tags: blueprints.tags,
    platform: blueprints.platform,
    forkCount: blueprints.forkCount,
    viewCount: blueprints.viewCount,
    likeCount: blueprints.likeCount,
    estimatedCostMin: blueprints.estimatedCostMin,
    estimatedCostMax: blueprints.estimatedCostMax,
    estimatedTime: blueprints.estimatedTime,
    components: blueprints.components,
    authorId: blueprints.authorId,
    createdAt: blueprints.createdAt,
  }).from(blueprints).where(eq(blueprints.isPublic, true)).$dynamic();

  let results = await query;

  if (difficulty && difficulty !== "All") {
    results = results.filter((b) => b.difficulty === difficulty);
  }
  if (category && category !== "All Categories") {
    results = results.filter((b) => b.category === category);
  }
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

  if (sort === "newest") results.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  else if (sort === "forked") results.sort((a, b) => (b.forkCount ?? 0) - (a.forkCount ?? 0));
  else if (sort === "cost") results.sort((a, b) => (a.estimatedCostMin ?? 0) - (b.estimatedCostMin ?? 0));
  else results.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0));

  const paginated = results.slice(Number(offset), Number(offset) + Number(limit));

  const enriched = paginated.map((b) => ({ ...b, userLiked: false }));
  res.json({ blueprints: enriched });
});

// GET /api/blueprints/:id
router.get("/blueprints/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const [data] = await db.select().from(blueprints).where(eq(blueprints.id, id));
  if (!data) { res.status(404).json({ error: "Blueprint not found" }); return; }

  db.update(blueprints).set({ viewCount: (data.viewCount ?? 0) + 1 }).where(eq(blueprints.id, id)).then(() => {});

  const reviews = await db.select({
    id: blueprintReviews.id,
    rating: blueprintReviews.rating,
    reviewText: blueprintReviews.reviewText,
    createdAt: blueprintReviews.createdAt,
    fullName: profiles.fullName,
    avatarUrl: profiles.avatarUrl,
  }).from(blueprintReviews).leftJoin(profiles, eq(profiles.id, blueprintReviews.userId)).where(eq(blueprintReviews.blueprintId, id)).orderBy(desc(blueprintReviews.createdAt));

  res.json({ blueprint: { ...data, reviews, userLiked: false, userForked: false } });
});

// POST /api/blueprints/fork
router.post("/blueprints/fork", verifyToken, async (req: AuthRequest, res: Response) => {
  const { blueprintId, projectName, adaptToInventory } = req.body;

  const [blueprint] = await db.select().from(blueprints).where(eq(blueprints.id, blueprintId));
  if (!blueprint) { res.status(404).json({ error: "Blueprint not found" }); return; }

  let adaptedComponents = blueprint.components;
  let adaptationChanges: string[] = [];

  if (adaptToInventory) {
    try {
      const userComps = await db.select({ name: userComponents.name, category: userComponents.category }).from(userComponents).where(eq(userComponents.userId, req.userId!));
      const inventory = userComps.map((c) => c.name);
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

  const [project] = await db
    .insert(projects)
    .values({
      id: crypto.randomUUID(),
      userId: req.userId!,
      title: projectName ?? blueprint.title,
      description: blueprint.description ?? "",
      ideaInput: blueprint.description ?? "",
      aiAnalysis: blueprint.aiAnalysis,
      components: adaptedComponents,
      buildPlan: blueprint.buildPlan,
      status: "in_progress",
      currentStep: 1,
    })
    .returning();

  if (!project) {
    res.status(500).json({ error: "Failed to create project" });
    return;
  }

  db.update(blueprints).set({ forkCount: (blueprint.forkCount ?? 0) + 1 }).where(eq(blueprints.id, blueprintId)).then(() => {});

  res.json({ projectId: project.id, adaptationChanges });
});

// POST /api/blueprints/publish
router.post("/blueprints/publish", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, title, description, category, tags, difficulty, isPublic, showAuthor } = req.body;

  const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, req.userId!)));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const compList = (project.components as { list?: { estimatedCost?: number }[] })?.list ?? [];
  const totalCost = compList.reduce((s, c) => s + (c.estimatedCost ?? 0), 0);

  const [blueprint] = await db
    .insert(blueprints)
    .values({
      id: crypto.randomUUID(),
      authorId: showAuthor ? req.userId! : null,
      title,
      description,
      category,
      tags: tags ?? [],
      difficulty,
      isPublic: isPublic ?? true,
      isFeatured: false,
      platform: (project.aiAnalysis as { platform?: string })?.platform ?? "ESP32",
      components: project.components,
      buildPlan: project.buildPlan,
      aiAnalysis: project.aiAnalysis,
      sourceProjectId: projectId,
      estimatedCostMin: Math.round(totalCost * 0.85),
      estimatedCostMax: Math.round(totalCost * 1.15),
      estimatedTime: (project.buildPlan as { estimatedTotalTime?: string })?.estimatedTotalTime ?? "1-2 days",
    })
    .returning();

  if (!blueprint) {
    res.status(500).json({ error: "Failed to publish blueprint" });
    return;
  }

  await db.update(projects).set({ blueprintId: blueprint.id }).where(eq(projects.id, projectId));
  res.json({ blueprintId: blueprint.id, url: `/blueprints/${blueprint.id}` });
});

// POST /api/blueprints/like
router.post("/blueprints/like", verifyToken, async (req: AuthRequest, res: Response) => {
  const { blueprintId } = req.body;

  const [existing] = await db.select({ id: blueprintLikes.id }).from(blueprintLikes).where(and(eq(blueprintLikes.blueprintId, blueprintId), eq(blueprintLikes.userId, req.userId!)));

  let liked: boolean;
  if (existing) {
    await db.delete(blueprintLikes).where(and(eq(blueprintLikes.blueprintId, blueprintId), eq(blueprintLikes.userId, req.userId!)));
    liked = false;
  } else {
    await db.insert(blueprintLikes).values({ id: crypto.randomUUID(), blueprintId, userId: req.userId! });
    liked = true;
  }

  const [{ total }] = await db.select({ total: count() }).from(blueprintLikes).where(eq(blueprintLikes.blueprintId, blueprintId));
  await db.update(blueprints).set({ likeCount: total }).where(eq(blueprints.id, blueprintId));
  res.json({ liked, count: total });
});

// POST /api/blueprints/review
router.post("/blueprints/review", verifyToken, async (req: AuthRequest, res: Response) => {
  const { blueprintId, rating, reviewText } = req.body;

  const [existing] = await db.select({ id: blueprintReviews.id }).from(blueprintReviews).where(and(eq(blueprintReviews.blueprintId, blueprintId), eq(blueprintReviews.userId, req.userId!)));

  let review;
  if (existing) {
    const [updated] = await db.update(blueprintReviews).set({ rating, reviewText, updatedAt: new Date() }).where(eq(blueprintReviews.id, existing.id)).returning();
    review = updated;
  } else {
    const [inserted] = await db.insert(blueprintReviews).values({ id: crypto.randomUUID(), blueprintId, userId: req.userId!, rating, reviewText }).returning();
    review = inserted;
  }

  res.json({ review });
});

export default router;
