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
import { getAuthClient } from "../lib/supabaseAdmin";

const router = Router();

router.get("/projects/stats", verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = getAuthClient(req.token!);
    const { data, error } = await db
      .from("projects")
      .select("status")
      .eq("user_id", req.userId!);

    if (error) throw error;

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

router.get("/projects", verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = getAuthClient(req.token!);
    const { data, error } = await db
      .from("projects")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Unexpected error in GET /projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects", verifyToken, async (req: AuthRequest, res) => {
  try {
    const parsed = CreateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }

    const db = getAuthClient(req.token!);
    const assignmentId = (req.body as Record<string, unknown>).assignment_id as string | undefined;

    const { data, error } = await db
      .from("projects")
      .insert({
        user_id: req.userId!,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        status: parsed.data.status ?? "draft",
        current_step: 0,
        ...(assignmentId ? { assignment_id: assignmentId } : {}),
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ project: data });
  } catch (err) {
    logger.error({ err }, "Unexpected error in POST /projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/projects/:id", verifyToken, async (req: AuthRequest, res) => {
  try {
    const params = GetProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const db = getAuthClient(req.token!);
    const { data, error } = await db
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

    const db = getAuthClient(req.token!);
    const { data, error } = await db
      .from("projects")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", params.data.id)
      .eq("user_id", req.userId!)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Project not found or update failed" });
      return;
    }

    res.json(data);
  } catch (err) {
    logger.error({ err }, "Unexpected error in PATCH /projects/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/projects/:id", verifyToken, async (req: AuthRequest, res) => {
  try {
    const params = DeleteProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const db = getAuthClient(req.token!);
    const { error } = await db
      .from("projects")
      .delete()
      .eq("id", params.data.id)
      .eq("user_id", req.userId!);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Unexpected error in DELETE /projects/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects/archive", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      res.status(400).json({ error: "projectId required" });
      return;
    }

    const db = getAuthClient(req.token!);
    const { error } = await db
      .from("projects")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("user_id", req.userId!);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Unexpected error in POST /projects/archive");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
