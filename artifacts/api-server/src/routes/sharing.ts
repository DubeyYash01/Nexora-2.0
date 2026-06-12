import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import type { Request, Response } from "express";
import { supabase, getAuthClient } from "../lib/supabaseAdmin";

const router = Router();

function generateToken(length = 8): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

router.post("/projects/share", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, makePublic } = req.body;
  const db = getAuthClient(req.token!);

  const { data: project } = await db
    .from("projects")
    .select("id,share_token,is_public")
    .eq("id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  let shareToken = project.share_token;
  if (!shareToken) shareToken = generateToken(8);

  await db.from("projects").update({ is_public: makePublic, share_token: shareToken }).eq("id", projectId);

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://nexora.app";
  const shareUrl = `${baseUrl}/p/${shareToken}`;
  res.json({ shareUrl, shareToken, isPublic: makePublic });
});

router.get("/projects/public/:shareToken", async (req: Request, res: Response) => {
  const { shareToken } = req.params;

  const { data } = await supabase
    .from("projects")
    .select("id,title,description,components,build_plan,ai_analysis,created_at,user_id")
    .eq("share_token", shareToken)
    .eq("is_public", true)
    .single();

  if (!data) {
    res.status(404).json({ error: "Project not found or not public" });
    return;
  }

  const { data: author } = await supabase
    .from("profiles")
    .select("full_name,avatar_url")
    .eq("id", data.user_id)
    .single();

  res.json({
    project: {
      id: data.id,
      title: data.title,
      description: data.description,
      components: data.components,
      build_plan: data.build_plan,
      ai_analysis: data.ai_analysis,
      created_at: data.created_at,
      author: author ?? null,
    },
  });
});

export default router;
