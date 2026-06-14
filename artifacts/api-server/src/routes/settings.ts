import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabase, getAuthClient } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";

const router = Router();

// PUT /api/settings/profile
router.put("/settings/profile", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { full_name, username, bio, role, college_name, course, location, website } = req.body as Record<string, string>;
    const db = getAuthClient(req.token!);
    const { data, error } = await db
      .from("profiles")
      .update({ full_name, username, bio, role, college_name, course, location, website, updated_at: new Date().toISOString() })
      .eq("id", req.userId!)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        res.status(409).json({ error: "Username already taken" });
        return;
      }
      res.status(500).json({ error: "Failed to update profile" });
      return;
    }
    res.json({ profile: data });
  } catch (err) {
    logger.error({ err }, "Error in PUT /settings/profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/settings/validate-username
router.post("/settings/validate-username", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.body as { username: string };
    if (!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      res.json({ available: false, reason: "Invalid format" });
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", req.userId!)
      .single();
    res.json({ available: !data });
  } catch {
    res.json({ available: true });
  }
});

// POST /api/settings/change-password
router.post("/settings/change-password", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { newPassword } = req.body as { newPassword: string };
    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const db = getAuthClient(req.token!);
    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error in POST /settings/change-password");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/auth/delete-account
router.delete("/auth/delete-account", verifyToken, async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    const db = getAuthClient(req.token!);
    await db.from("ai_conversations").delete().eq("user_id", uid);
    await db.from("ai_feedback").delete().eq("user_id", uid);
    await db.from("blueprint_likes").delete().eq("user_id", uid);
    await db.from("blueprint_reviews").delete().eq("user_id", uid);
    await db.from("notifications").delete().eq("user_id", uid);
    await db.from("user_components").delete().eq("user_id", uid);
    await db.from("projects").delete().eq("user_id", uid);
    await db.from("profiles").delete().eq("id", uid);
    await db.auth.signOut();
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error in DELETE /auth/delete-account");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/settings/notifications
router.put("/settings/notifications", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { preferences } = req.body as { preferences: Record<string, boolean> };
    const db = getAuthClient(req.token!);
    const { error } = await db
      .from("profiles")
      .update({ notification_preferences: preferences, updated_at: new Date().toISOString() })
      .eq("id", req.userId!);
    if (error) {
      res.status(500).json({ error: "Failed to save preferences" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error in PUT /settings/notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/profile/:username — public, no auth
router.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, bio, role, location, website, created_at, profile_views, is_profile_public")
      .eq("username", username)
      .single();
    if (error || !profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!profile.is_profile_public) {
      res.status(403).json({ error: "This profile is private" });
      return;
    }
    await supabase.from("profiles").update({ profile_views: (profile.profile_views ?? 0) + 1 }).eq("id", profile.id);
    const [{ data: blueprints }, { data: projects }] = await Promise.all([
      supabase.from("blueprints").select("id, title, description, difficulty, category, fork_count, like_count, created_at").eq("author_id", profile.id).eq("is_public", true).order("created_at", { ascending: false }).limit(12),
      supabase.from("projects").select("id, title, description, status, created_at").eq("user_id", profile.id).eq("is_public", true).order("created_at", { ascending: false }).limit(12),
    ]);
    res.json({ profile, blueprints: blueprints ?? [], projects: projects ?? [] });
  } catch (err) {
    logger.error({ err }, "Error in GET /profile/:username");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
