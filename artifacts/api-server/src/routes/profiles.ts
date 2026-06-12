import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { UpdateMyProfileBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { profiles } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/profiles/me
router.get("/profiles/me", verifyToken, async (req: AuthRequest, res) => {
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, req.userId!));

    if (!profile) {
      const [newProfile] = await db
        .insert(profiles)
        .values({ id: req.userId!, email: req.userEmail! })
        .returning();

      if (!newProfile) {
        res.status(500).json({ error: "Failed to create profile" });
        return;
      }
      res.json(newProfile);
      return;
    }

    res.json(profile);
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

    const [updated] = await db
      .insert(profiles)
      .values({
        id: req.userId!,
        email: req.userEmail!,
        ...parsed.data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          ...parsed.data,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!updated) {
      res.status(500).json({ error: "Failed to update profile" });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Unexpected error in PATCH /profiles/me");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
