import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { getAuthClient } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/notifications
router.get("/notifications", verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = getAuthClient(req.token!);
    const { data, error } = await db
      .from("notifications")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
      return;
    }
    const notifications = data ?? [];
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    logger.error({ err }, "Error in GET /notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/notifications/read
router.put("/notifications/read", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { notificationIds } = req.body as { notificationIds?: string[] };
    const db = getAuthClient(req.token!);
    let query = db.from("notifications").update({ is_read: true }).eq("user_id", req.userId!);
    if (notificationIds && notificationIds.length > 0) {
      query = query.in("id", notificationIds);
    }
    const { error } = await query;
    if (error) {
      res.status(500).json({ error: "Failed to mark as read" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error in PUT /notifications/read");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications (internal — create notification)
router.post("/notifications", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { user_id, type, title, message, link } = req.body as Record<string, string>;
    const db = getAuthClient(req.token!);
    const { error } = await db.from("notifications").insert({ user_id: user_id || req.userId!, type, title, message, link });
    if (error) {
      res.status(500).json({ error: "Failed to create notification" });
      return;
    }
    res.status(201).json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error in POST /notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
