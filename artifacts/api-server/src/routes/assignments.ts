import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";
import type { Response } from "express";

const router = Router();

// POST /api/assignments/create
router.post("/assignments/create", verifyToken, async (req: AuthRequest, res: Response) => {
  const {
    classId, title, description, objectives, allowedComponents,
    requiredPhases, deadline, maxGroupSize, allowAnyComponents,
    gradingCriteria, status,
  } = req.body;

  if (!classId || !title || !description) {
    res.status(400).json({ error: "classId, title, and description are required" });
    return;
  }

  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select("professor_id")
    .eq("id", classId)
    .single();

  if (!cls || cls.professor_id !== req.userId) {
    res.status(403).json({ error: "You do not own this class" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .insert({
      class_id: classId,
      professor_id: req.userId!,
      title,
      description,
      objectives: objectives ?? [],
      allowed_components: allowedComponents ?? null,
      required_phases: requiredPhases ?? [],
      deadline: deadline ?? null,
      max_group_size: maxGroupSize ?? 4,
      allow_any_components: allowAnyComponents ?? true,
      grading_criteria: gradingCriteria ?? null,
      status: status ?? "active",
      submission_count: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, "Failed to create assignment");
    res.status(500).json({ error: "Failed to create assignment" });
    return;
  }

  res.status(201).json({ assignment: data });
});

// GET /api/assignments/professor/:professorId
router.get("/assignments/professor/:professorId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { professorId } = req.params;

  if (req.userId !== professorId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("*, classes(name, subject)")
    .eq("professor_id", professorId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to fetch assignments" });
    return;
  }

  res.json({ assignments: data ?? [] });
});

// GET /api/assignments/student/:studentId
router.get("/assignments/student/:studentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  if (req.userId !== studentId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { data: memberships } = await supabaseAdmin
    .from("class_members")
    .select("class_id")
    .eq("student_id", studentId);

  if (!memberships || memberships.length === 0) {
    res.json({ assignments: [] });
    return;
  }

  const classIds = memberships.map((m: { class_id: string }) => m.class_id);

  const { data: assignments, error } = await supabaseAdmin
    .from("assignments")
    .select("*, classes(name, subject, profiles(full_name))")
    .in("class_id", classIds)
    .in("status", ["active", "closed"])
    .order("deadline", { ascending: true });

  if (error) {
    res.status(500).json({ error: "Failed to fetch assignments" });
    return;
  }

  const { data: submissions } = await supabaseAdmin
    .from("assignment_submissions")
    .select("id, assignment_id, status, grade, submitted_at, project_id")
    .eq("student_id", studentId);

  const submissionMap = new Map(
    (submissions ?? []).map((s: { assignment_id: string }) => [s.assignment_id, s])
  );

  const enriched = (assignments ?? []).map((a: { id: string }) => ({
    ...a,
    submission: submissionMap.get(a.id) ?? null,
  }));

  res.json({ assignments: enriched });
});

// GET /api/assignments/:assignmentId/submissions
router.get("/assignments/:assignmentId/submissions", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  const { data: assignment } = await supabaseAdmin
    .from("assignments")
    .select("professor_id, title, deadline, status, class_id, grading_criteria, required_phases, classes(name, student_count)")
    .eq("id", assignmentId)
    .single();

  if (!assignment || assignment.professor_id !== req.userId) {
    res.status(403).json({ error: "Professor access only" });
    return;
  }

  const { data: submissions, error } = await supabaseAdmin
    .from("assignment_submissions")
    .select("*, profiles(id, full_name, email, avatar_url)")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to fetch submissions" });
    return;
  }

  const { data: members } = await supabaseAdmin
    .from("class_members")
    .select("*, profiles(id, full_name, email, avatar_url)")
    .eq("class_id", assignment.class_id);

  res.json({
    assignment,
    submissions: submissions ?? [],
    totalStudents: (members ?? []).length,
  });
});

// GET /api/assignments/:assignmentId
router.get("/assignments/:assignmentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("*, classes(name, subject, professor_id, profiles(full_name))")
    .eq("id", assignmentId)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json({ assignment: data });
});

// PATCH /api/assignments/:assignmentId
router.patch("/assignments/:assignmentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .eq("professor_id", req.userId!)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json({ assignment: data });
});

// DELETE /api/assignments/:assignmentId
router.delete("/assignments/:assignmentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  const { error } = await supabaseAdmin
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("professor_id", req.userId!);

  if (error) {
    res.status(500).json({ error: "Failed to delete assignment" });
    return;
  }

  res.status(204).send();
});

export default router;
