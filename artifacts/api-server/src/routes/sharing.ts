import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { projects, profiles } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

const router = Router();

function generateToken(length = 8): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// POST /api/projects/share
router.post("/projects/share", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, makePublic } = req.body;

  const [project] = await db
    .select({ id: projects.id, shareToken: projects.shareToken, isPublic: projects.isPublic })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, req.userId!)));

  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  let shareToken = project.shareToken;
  if (!shareToken) shareToken = generateToken(8);

  await db
    .update(projects)
    .set({ isPublic: makePublic, shareToken })
    .where(eq(projects.id, projectId));

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://nexora.app";
  const shareUrl = `${baseUrl}/p/${shareToken}`;
  res.json({ shareUrl, shareToken, isPublic: makePublic });
});

// GET /api/projects/public/:shareToken  — NO AUTH REQUIRED
router.get("/projects/public/:shareToken", async (req: Request, res: Response) => {
  const { shareToken } = req.params;

  const [data] = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      components: projects.components,
      buildPlan: projects.buildPlan,
      aiAnalysis: projects.aiAnalysis,
      createdAt: projects.createdAt,
      userId: projects.userId,
    })
    .from(projects)
    .where(and(eq(projects.shareToken, shareToken), eq(projects.isPublic, true)));

  if (!data) {
    res.status(404).json({ error: "Project not found or not public" });
    return;
  }

  const [author] = await db
    .select({ fullName: profiles.fullName, avatarUrl: profiles.avatarUrl })
    .from(profiles)
    .where(eq(profiles.id, data.userId));

  res.json({
    project: {
      id: data.id,
      title: data.title,
      description: data.description,
      components: data.components,
      build_plan: data.buildPlan,
      ai_analysis: data.aiAnalysis,
      created_at: data.createdAt,
      author: author ?? null,
    },
  });
});

export default router;
