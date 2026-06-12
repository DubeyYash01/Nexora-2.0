import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { UpdateMyProfileBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { getAuthClient } from "../lib/supabaseAdmin";

const router = Router();

router.get("/profiles/me", verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = getAuthClient(req.token!);
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", req.userId!)
      .single();

    if (error || !data) {
      const { data: inserted, error: insertErr } = await db
        .from("profiles")
        .insert({ id: req.userId!, email: req.userEmail! })
        .select()
        .single();
      if (insertErr) {
        res.status(500).json({ error: "Failed to create profile" });
        return;
      }
      res.json(inserted);
      return;
    }

    res.json(data);
  } catch (err) {
    logger.error({ err }, "Unexpected error in GET /profiles/me");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/profiles/me", verifyToken, async (req: AuthRequest, res) => {
  try {
    const parsed = UpdateMyProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }

    const db = getAuthClient(req.token!);
    const { data, error } = await db
      .from("profiles")
      .upsert({ id: req.userId!, email: req.userEmail!, ...parsed.data, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to update profile" });
      return;
    }

    res.json(data);
  } catch (err) {
    logger.error({ err }, "Unexpected error in PATCH /profiles/me");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
