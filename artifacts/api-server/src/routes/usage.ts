import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import { getAuthClient } from "../lib/supabaseAdmin";

const router = Router();

router.post("/usage/increment-ai", verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = getAuthClient(req.token!);

    const { data: usageRow } = await db
      .from("usage_tracking")
      .select("ai_messages_today,ai_messages_reset_at")
      .eq("user_id", req.userId!)
      .single();

    const { data: profileRow } = await db
      .from("profiles")
      .select("plan")
      .eq("id", req.userId!)
      .single();

    const plan = profileRow?.plan ?? "free";
    const planLimits: Record<string, number> = { free: 3, student_pro: 50, maker_pro: -1, college_lab: -1 };
    const limit = planLimits[plan] ?? 3;

    const now = new Date();
    let todayCount = usageRow?.ai_messages_today ?? 0;
    const resetAt = usageRow?.ai_messages_reset_at ? new Date(usageRow.ai_messages_reset_at) : new Date(0);

    const isNewDay =
      now.getFullYear() !== resetAt.getFullYear() ||
      now.getMonth() !== resetAt.getMonth() ||
      now.getDate() !== resetAt.getDate();

    if (isNewDay) {
      todayCount = 0;
    }

    if (limit !== -1 && todayCount >= limit) {
      res.json({ allowed: false, remaining: 0, limit, used: todayCount });
      return;
    }

    const newCount = todayCount + 1;
    if (usageRow) {
      await db
        .from("usage_tracking")
        .update({ ai_messages_today: newCount, ai_messages_reset_at: isNewDay ? now.toISOString() : usageRow.ai_messages_reset_at, last_updated: now.toISOString() })
        .eq("user_id", req.userId!);
    } else {
      await db.from("usage_tracking").insert({ user_id: req.userId!, ai_messages_today: newCount, ai_messages_reset_at: now.toISOString() });
    }

    const remaining = limit === -1 ? -1 : Math.max(0, limit - newCount);
    res.json({ allowed: true, remaining, limit, used: newCount });
  } catch (err) {
    logger.error({ err }, "Failed to increment AI usage");
    res.status(500).json({ error: "Failed to track usage" });
  }
});

router.get("/usage/me", verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = getAuthClient(req.token!);

    let { data: usageRow } = await db.from("usage_tracking").select("*").eq("user_id", req.userId!).single();

    if (!usageRow) {
      const { data: inserted } = await db
        .from("usage_tracking")
        .insert({ user_id: req.userId! })
        .select()
        .single();
      usageRow = inserted;
    }

    const { data: profileRow } = await db.from("profiles").select("plan,trial_used").eq("id", req.userId!).single();
    const plan = profileRow?.plan ?? "free";
    const planLimits: Record<string, number> = { free: 3, student_pro: 50, maker_pro: -1, college_lab: -1 };
    const limit = planLimits[plan] ?? 3;

    const now = new Date();
    let todayCount = usageRow?.ai_messages_today ?? 0;
    const resetAt = usageRow?.ai_messages_reset_at ? new Date(usageRow.ai_messages_reset_at) : new Date(0);
    const isNewDay =
      now.getFullYear() !== resetAt.getFullYear() ||
      now.getMonth() !== resetAt.getMonth() ||
      now.getDate() !== resetAt.getDate();
    if (isNewDay) todayCount = 0;

    res.json({
      usage: usageRow,
      plan,
      aiMessagesToday: todayCount,
      aiLimit: limit,
      aiRemaining: limit === -1 ? -1 : Math.max(0, limit - todayCount),
      trial_used: profileRow?.trial_used ?? false,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get usage");
    res.status(500).json({ error: "Failed to get usage" });
  }
});

export default router;
