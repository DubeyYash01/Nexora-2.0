import { Router } from "express";
import { supabase } from "../lib/supabaseAdmin.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = (req as { userId?: string }).userId;
    const { mood, message, feature, pageUrl } = req.body as {
      mood?: number;
      message?: string;
      feature?: string;
      pageUrl?: string;
    };

    const { error } = await supabase.from("user_feedback").insert({
      user_id: userId || null,
      mood: mood ?? null,
      message: message?.trim() || null,
      feature: feature || "General Experience",
      page_url: pageUrl || null,
    });

    if (error) {
      if (error.code === "42P01") {
        return res.json({ success: true, note: "table_not_yet_created" });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save feedback" });
  }
});

export default router;
