import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import type { Response } from "express";
import { getAuthClient } from "../lib/supabaseAdmin";

const router = Router();

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.post("/classes/create", verifyToken, async (req: AuthRequest, res: Response) => {
  const { name, subject, college, academicYear, joinCode } = req.body;
  if (!name || !subject || !college) {
    res.status(400).json({ error: "name, subject, and college are required" });
    return;
  }

  const code = joinCode || generateJoinCode();
  const db = getAuthClient(req.token!);
  const { data, error } = await db
    .from("classes")
    .insert({ professor_id: req.userId!, name, subject, college, academic_year: academicYear, join_code: code, student_count: 0, is_active: true })
    .select()
    .single();

  if (error) { res.status(500).json({ error: "Failed to create class" }); return; }
  res.status(201).json({ class: data });
});

router.get("/classes/professor/stats", verifyToken, async (req: AuthRequest, res) => {
  const db = getAuthClient(req.token!);
  const { data: classData } = await db.from("classes").select("id,student_count").eq("professor_id", req.userId!);
  const { data: assignmentData } = await db.from("assignments").select("id,status").eq("professor_id", req.userId!);

  const assignmentIds = (assignmentData ?? []).map((a) => a.id);
  let submissionData: { status: string }[] = [];
  if (assignmentIds.length > 0) {
    const { data } = await db.from("assignment_submissions").select("status").in("assignment_id", assignmentIds);
    submissionData = data ?? [];
  }

  const totalStudents = (classData ?? []).reduce((s, c) => s + (c.student_count ?? 0), 0);
  const activeAssignments = (assignmentData ?? []).filter((a) => a.status === "active").length;
  const pendingReviews = submissionData.filter((s) => s.status === "submitted").length;
  const submitted = submissionData.filter((s) => s.status === "submitted" || s.status === "graded").length;
  const total = totalStudents * (assignmentData ?? []).length;
  const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

  res.json({ totalClasses: (classData ?? []).length, activeAssignments, totalStudents, pendingReviews, completionRate });
});

router.get("/classes/professor/:professorId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { professorId } = req.params;
  if (req.userId !== professorId) { res.status(403).json({ error: "Forbidden" }); return; }

  const db = getAuthClient(req.token!);
  const { data } = await db.from("classes").select("*").eq("professor_id", professorId).order("created_at", { ascending: false });
  res.json({ classes: data ?? [] });
});

router.post("/classes/join", verifyToken, async (req: AuthRequest, res: Response) => {
  const { joinCode } = req.body;
  if (!joinCode) { res.status(400).json({ error: "joinCode is required" }); return; }

  const db = getAuthClient(req.token!);
  const { data: cls } = await db
    .from("classes")
    .select("*")
    .eq("join_code", joinCode.toUpperCase())
    .eq("is_active", true)
    .single();

  if (!cls) { res.status(404).json({ error: "Invalid code. Check with your professor." }); return; }

  const { data: existing } = await db
    .from("class_members")
    .select("id")
    .eq("class_id", cls.id)
    .eq("student_id", req.userId!)
    .single();

  if (existing) { res.status(409).json({ error: "You are already a member of this class" }); return; }

  await db.from("class_members").insert({ class_id: cls.id, student_id: req.userId! });
  await db.from("classes").update({ student_count: (cls.student_count ?? 0) + 1 }).eq("id", cls.id);

  const { data: assignmentData } = await db.from("assignments").select("*").eq("class_id", cls.id).eq("status", "active");
  res.json({ class: cls, assignments: assignmentData ?? [] });
});

router.get("/classes/:classId/students", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const db = getAuthClient(req.token!);

  const { data: cls } = await db.from("classes").select("professor_id").eq("id", classId).single();
  if (!cls || cls.professor_id !== req.userId) { res.status(403).json({ error: "Professor access only" }); return; }

  const { data: members } = await db
    .from("class_members")
    .select("id,student_id,joined_at,profiles(full_name,email,avatar_url)")
    .eq("class_id", classId)
    .order("joined_at", { ascending: false });

  res.json({ students: members ?? [] });
});

router.get("/classes/student/my", verifyToken, async (req: AuthRequest, res: Response) => {
  const db = getAuthClient(req.token!);
  const { data } = await db
    .from("class_members")
    .select("classes(id,name,subject,college,academic_year,join_code,student_count,is_active,professor_id)")
    .eq("student_id", req.userId!);

  const myClasses = (data ?? []).map((m) => m.classes).filter(Boolean);
  res.json({ classes: myClasses });
});

router.patch("/classes/:classId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const { name, subject, college, academicYear, isActive } = req.body;
  const db = getAuthClient(req.token!);

  const { data, error } = await db
    .from("classes")
    .update({ name, subject, college, academic_year: academicYear, is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", classId)
    .eq("professor_id", req.userId!)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: "Class not found" }); return; }
  res.json({ class: data });
});

router.delete("/classes/:classId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const db = getAuthClient(req.token!);
  await db.from("classes").delete().eq("id", classId).eq("professor_id", req.userId!);
  res.status(204).send();
});

export default router;
