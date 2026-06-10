import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/projects/stats — must be before /:id
router.get("/projects/stats", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("status")
      .eq("user_id", req.userId!);

    if (error) {
      logger.error({ err: error }, "Failed to fetch project stats");
      res.status(500).json({ error: "Failed to fetch project stats" });
      return;
    }

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
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ err: error }, "Failed to fetch projects");
      res.status(500).json({ error: "Failed to fetch projects" });
      return;
    }

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

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        ...parsed.data,
        user_id: req.userId!,
        status: parsed.data.status ?? "draft",
        current_step: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create project");
      res.status(500).json({ error: "Failed to create project" });
      return;
    }

    res.status(201).json(data);
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

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", params.data.id)
      .eq("user_id", req.userId!)
      .single();

    if (error || !data) {
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

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", params.data.id)
      .eq("user_id", req.userId!)
      .select()
      .single();

    if (error || !data) {
      logger.error({ err: error }, "Failed to update project");
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

    const { error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", params.data.id)
      .eq("user_id", req.userId!);

    if (error) {
      logger.error({ err: error }, "Failed to delete project");
      res.status(500).json({ error: "Failed to delete project" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Unexpected error in DELETE /projects/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
