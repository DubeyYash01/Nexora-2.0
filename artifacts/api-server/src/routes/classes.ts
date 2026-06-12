import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";
import type { Request, Response } from "express";

const router = Router();

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/classes/create
router.post("/classes/create", verifyToken, async (req: AuthRequest, res: Response) => {
  const { name, subject, college, academicYear, joinCode, maxStudents } = req.body;

  if (!name || !subject || !college) {
    res.status(400).json({ error: "name, subject, and college are required" });
    return;
  }

  const code = joinCode || generateJoinCode();

  const { data, error } = await supabaseAdmin
    .from("classes")
    .insert({
      professor_id: req.userId!,
      name,
      subject,
      college,
      academic_year: academicYear,
      join_code: code,
      student_count: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, "Failed to create class");
    res.status(500).json({ error: "Failed to create class" });
    return;
  }

  res.status(201).json({ class: data });
});

// GET /api/classes/professor/:professorId
router.get("/classes/professor/:professorId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { professorId } = req.params;

  if (req.userId !== professorId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("*, class_members(count)")
    .eq("professor_id", professorId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ err: error }, "Failed to fetch classes");
    res.status(500).json({ error: "Failed to fetch classes" });
    return;
  }

  res.json({ classes: data ?? [] });
});

// POST /api/classes/join
router.post("/classes/join", verifyToken, async (req: AuthRequest, res: Response) => {
  const { joinCode } = req.body;

  if (!joinCode) {
    res.status(400).json({ error: "joinCode is required" });
    return;
  }

  const { data: cls, error: clsErr } = await supabaseAdmin
    .from("classes")
    .select("*, profiles(full_name)")
    .eq("join_code", joinCode.toUpperCase())
    .eq("is_active", true)
    .single();

  if (clsErr || !cls) {
    res.status(404).json({ error: "Invalid code. Check with your professor." });
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("class_members")
    .select("id")
    .eq("class_id", cls.id)
    .eq("student_id", req.userId!)
    .single();

  if (existing) {
    res.status(409).json({ error: "You are already a member of this class" });
    return;
  }

  const { error: joinErr } = await supabaseAdmin
    .from("class_members")
    .insert({ class_id: cls.id, student_id: req.userId! });

  if (joinErr) {
    logger.error({ err: joinErr }, "Failed to join class");
    res.status(500).json({ error: "Failed to join class" });
    return;
  }

  await supabaseAdmin
    .from("classes")
    .update({ student_count: (cls.student_count ?? 0) + 1 })
    .eq("id", cls.id);

  const { data: assignments } = await supabaseAdmin
    .from("assignments")
    .select("*")
    .eq("class_id", cls.id)
    .eq("status", "active");

  res.json({ class: cls, assignments: assignments ?? [] });
});

// GET /api/classes/:classId/students
router.get("/classes/:classId/students", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;

  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select("professor_id")
    .eq("id", classId)
    .single();

  if (!cls || cls.professor_id !== req.userId) {
    res.status(403).json({ error: "Professor access only" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("class_members")
    .select("*, profiles(id, full_name, email, avatar_url, role)")
    .eq("class_id", classId)
    .order("joined_at", { ascending: false });

  if (error) {
    logger.error({ err: error }, "Failed to fetch students");
    res.status(500).json({ error: "Failed to fetch students" });
    return;
  }

  res.json({ students: data ?? [] });
});

// GET /api/classes/student/my
router.get("/classes/student/my", verifyToken, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("class_members")
    .select("*, classes(*, profiles(full_name))")
    .eq("student_id", req.userId!);

  if (error) {
    logger.error({ err: error }, "Failed to fetch student classes");
    res.status(500).json({ error: "Failed to fetch classes" });
    return;
  }

  res.json({ classes: (data ?? []).map((m: Record<string, unknown>) => m.classes) });
});

// PATCH /api/classes/:classId
router.patch("/classes/:classId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const { name, subject, college, academicYear, isActive } = req.body;

  const { data, error } = await supabaseAdmin
    .from("classes")
    .update({ name, subject, college, academic_year: academicYear, is_active: isActive })
    .eq("id", classId)
    .eq("professor_id", req.userId!)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  res.json({ class: data });
});

// DELETE /api/classes/:classId
router.delete("/classes/:classId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;

  const { error } = await supabaseAdmin
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("professor_id", req.userId!);

  if (error) {
    res.status(500).json({ error: "Failed to delete class" });
    return;
  }

  res.status(204).send();
});

// GET /api/classes/professor/stats
router.get("/classes/professor/stats", verifyToken, async (req: AuthRequest, res) => {
  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("id, student_count, is_active")
    .eq("professor_id", req.userId!);

  const { data: assignments } = await supabaseAdmin
    .from("assignments")
    .select("id, status")
    .eq("professor_id", req.userId!);

  const { data: submissions } = await supabaseAdmin
    .from("assignment_submissions")
    .select("id, status, assignment_id")
    .in("assignment_id", (assignments ?? []).map((a: { id: string }) => a.id));

  const totalStudents = (classes ?? []).reduce((s: number, c: { student_count: number }) => s + (c.student_count ?? 0), 0);
  const activeAssignments = (assignments ?? []).filter((a: { status: string }) => a.status === "active").length;
  const pendingReviews = (submissions ?? []).filter((s: { status: string }) => s.status === "submitted").length;

  const submitted = (submissions ?? []).filter((s: { status: string }) => s.status === "submitted" || s.status === "graded").length;
  const total = totalStudents * (assignments ?? []).length;
  const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

  res.json({
    totalClasses: (classes ?? []).length,
    activeAssignments,
    totalStudents,
    pendingReviews,
    completionRate,
  });
});

export default router;
