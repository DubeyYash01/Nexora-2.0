import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";
import type { Request, Response } from "express";

const router = Router();

function generateToken(length = 8): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// POST /api/projects/share
router.post("/projects/share", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, makePublic } = req.body;

  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id, share_token, is_public, user_id")
    .eq("id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (error || !project) { res.status(404).json({ error: "Project not found" }); return; }

  let shareToken = project.share_token;
  if (!shareToken) shareToken = generateToken(8);

  await supabaseAdmin
    .from("projects")
    .update({ is_public: makePublic, share_token: shareToken })
    .eq("id", projectId);

  const shareUrl = `${process.env.VITE_APP_URL ?? "https://nexora.app"}/p/${shareToken}`;
  res.json({ shareUrl, shareToken, isPublic: makePublic });
});

// GET /api/projects/public/:shareToken  — NO AUTH REQUIRED
router.get("/projects/public/:shareToken", async (req: Request, res: Response) => {
  const { shareToken } = req.params;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, title, description, idea_input, components, build_plan, ai_analysis, share_token, is_public, created_at, profiles(full_name, avatar_url)")
    .eq("share_token", shareToken)
    .eq("is_public", true)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Project not found or not public" });
    return;
  }

  // Return only public-safe fields (no budget, no IDE code, no AI conversations)
  res.json({
    project: {
      id: data.id,
      title: data.title,
      description: data.description,
      components: data.components,
      build_plan: data.build_plan,
      ai_analysis: data.ai_analysis,
      created_at: data.created_at,
      author: data.profiles,
    },
  });
});

export default router;
