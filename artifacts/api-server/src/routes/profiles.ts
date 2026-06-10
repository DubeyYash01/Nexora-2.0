import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { UpdateMyProfileBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/profiles/me
router.get("/profiles/me", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", req.userId!)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Profile doesn't exist yet — create it
        const { data: newProfile, error: insertError } = await supabaseAdmin
          .from("profiles")
          .insert({ id: req.userId!, email: req.userEmail! })
          .select()
          .single();

        if (insertError) {
          logger.error({ err: insertError }, "Failed to create profile");
          res.status(500).json({ error: "Failed to create profile" });
          return;
        }
        res.json(newProfile);
        return;
      }
      logger.error({ err: error }, "Failed to fetch profile");
      res.status(500).json({ error: "Failed to fetch profile" });
      return;
    }

    res.json(data);
  } catch (err) {
    logger.error({ err }, "Unexpected error in GET /profiles/me");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/profiles/me
router.patch("/profiles/me", verifyToken, async (req: AuthRequest, res) => {
  try {
    const parsed = UpdateMyProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }

    const updateData = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: req.userId!, email: req.userEmail!, ...updateData })
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to update profile");
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
