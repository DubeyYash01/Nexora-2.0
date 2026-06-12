import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { projects } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// GET /api/projects/stats — must be before /:id
router.get("/projects/stats", verifyToken, async (req: AuthRequest, res) => {
  try {
    const data = await db
      .select({ status: projects.status })
      .from(projects)
      .where(eq(projects.userId, req.userId!));

    const stats = {
      total: data.length,
      draft: data.filter((p) => p.status === "draft").length,
      in_progress: data.filter((p) => p.status === "in_progress").length,
      completed: data.filter((p) => p.status === "completed").length,
    };

    res.json(stats);
  } catch (err) {
    logger.error({ err }, "Unexpected error in GET /projects/stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/projects
router.get("/projects", verifyToken, async (req: AuthRequest, res) => {
  try {
    const data = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, req.userId!))
      .orderBy(desc(projects.createdAt));

    res.json(data);
  } catch (err) {
    logger.error({ err }, "Unexpected error in GET /projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/projects
router.post("/projects", verifyToken, async (req: AuthRequest, res) => {
  try {
    const parsed = CreateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }

    const assignmentId = (req.body as Record<string, unknown>).assignment_id as string | undefined;

    const [data] = await db
      .insert(projects)
      .values({
        id: crypto.randomUUID(),
        userId: req.userId!,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        status: parsed.data.status ?? "draft",
        currentStep: 0,
        ...(assignmentId ? { assignmentId } : {}),
      })
      .returning();

    if (!data) {
      res.status(500).json({ error: "Failed to create project" });
      return;
    }

    res.status(201).json({ project: data });
  } catch (err) {
    logger.error({ err }, "Unexpected error in POST /projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/projects/:id
router.get("/projects/:id", verifyToken, async (req: AuthRequest, res) => {
  try {
    const params = GetProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const [data] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.data.id), eq(projects.userId, req.userId!)));

    if (!data) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(data);
  } catch (err) {
    logger.error({ err }, "Unexpected error in GET /projects/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/projects/:id
router.patch("/projects/:id", verifyToken, async (req: AuthRequest, res) => {
  try {
    const params = UpdateProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const parsed = UpdateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }

    const [data] = await db
      .update(projects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(projects.id, params.data.id), eq(projects.userId, req.userId!)))
      .returning();

    if (!data) {
      res.status(404).json({ error: "Project not found or update failed" });
      return;
    }

    res.json(data);
  } catch (err) {
    logger.error({ err }, "Unexpected error in PATCH /projects/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/projects/:id
router.delete("/projects/:id", verifyToken, async (req: AuthRequest, res) => {
  try {
    const params = DeleteProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    await db
      .delete(projects)
      .where(and(eq(projects.id, params.data.id), eq(projects.userId, req.userId!)));

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Unexpected error in DELETE /projects/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
