import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import type { Response } from "express";
import { getAuthClient } from "../lib/supabaseAdmin";

const router = Router();

router.post("/assignments/create", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId, title, description, objectives, allowedComponents, requiredPhases, deadline, maxGroupSize, allowAnyComponents, gradingCriteria, status } = req.body;

  if (!classId || !title || !description) {
    res.status(400).json({ error: "classId, title, and description are required" });
    return;
  }

  const db = getAuthClient(req.token!);
  const { data: cls } = await db.from("classes").select("professor_id").eq("id", classId).single();
  if (!cls || cls.professor_id !== req.userId) { res.status(403).json({ error: "You do not own this class" }); return; }

  const { data, error } = await db
    .from("assignments")
    .insert({
      class_id: classId,
      professor_id: req.userId!,
      title,
      description,
      objectives: objectives ?? [],
      allowed_components: allowedComponents ?? null,
      required_phases: requiredPhases ?? [],
      deadline: deadline ? new Date(deadline).toISOString() : null,
      max_group_size: maxGroupSize ?? 4,
      allow_any_components: allowAnyComponents ?? true,
      grading_criteria: gradingCriteria ?? null,
      status: status ?? "active",
      submission_count: 0,
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: "Failed to create assignment" }); return; }
  res.status(201).json({ assignment: data });
});

router.get("/assignments/professor/:professorId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { professorId } = req.params;
  if (req.userId !== professorId) { res.status(403).json({ error: "Forbidden" }); return; }

  const db = getAuthClient(req.token!);
  const { data } = await db
    .from("assignments")
    .select("id,class_id,title,status,deadline,submission_count,created_at,classes(name,subject)")
    .eq("professor_id", professorId)
    .order("created_at", { ascending: false });

  res.json({ assignments: data ?? [] });
});

router.get("/assignments/student/:studentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  if (req.userId !== studentId) { res.status(403).json({ error: "Forbidden" }); return; }

  const db = getAuthClient(req.token!);
  const { data: memberships } = await db.from("class_members").select("class_id").eq("student_id", studentId);
  if (!memberships || memberships.length === 0) { res.json({ assignments: [] }); return; }

  const classIds = memberships.map((m) => m.class_id);
  const { data: assignmentData } = await db
    .from("assignments")
    .select("id,class_id,title,description,objectives,deadline,status,max_group_size,required_phases,created_at,classes(name,subject)")
    .in("class_id", classIds)
    .in("status", ["active", "closed"])
    .order("deadline", { ascending: true });

  const { data: submissionData } = await db
    .from("assignment_submissions")
    .select("id,assignment_id,status,grade,submitted_at,project_id")
    .eq("student_id", studentId);

  const submissionMap = new Map((submissionData ?? []).map((s) => [s.assignment_id, s]));
  const enriched = (assignmentData ?? []).map((a) => ({ ...a, submission: submissionMap.get(a.id) ?? null }));

  res.json({ assignments: enriched });
});

router.get("/assignments/:assignmentId/submissions", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;
  const db = getAuthClient(req.token!);

  const { data: assignment } = await db
    .from("assignments")
    .select("professor_id,title,deadline,status,class_id,grading_criteria,required_phases")
    .eq("id", assignmentId)
    .single();

  if (!assignment || assignment.professor_id !== req.userId) { res.status(403).json({ error: "Professor access only" }); return; }

  const { data: submissionsData } = await db
    .from("assignment_submissions")
    .select("id,assignment_id,student_id,project_id,status,grade,submitted_at,grader_feedback,profiles(full_name,email,avatar_url)")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });

  const { count: memberCount } = await db
    .from("class_members")
    .select("*", { count: "exact", head: true })
    .eq("class_id", assignment.class_id);

  res.json({ assignment, submissions: submissionsData ?? [], totalStudents: memberCount ?? 0 });
});

router.get("/assignments/:assignmentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;
  const db = getAuthClient(req.token!);
  const { data, error } = await db.from("assignments").select("*").eq("id", assignmentId).single();
  if (error || !data) { res.status(404).json({ error: "Assignment not found" }); return; }
  res.json({ assignment: data });
});

router.patch("/assignments/:assignmentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;
  const { title, description, deadline, status, gradingCriteria } = req.body;
  const db = getAuthClient(req.token!);

  const { data, error } = await db
    .from("assignments")
    .update({ title, description, deadline: deadline ? new Date(deadline).toISOString() : undefined, status, grading_criteria: gradingCriteria, updated_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .eq("professor_id", req.userId!)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: "Assignment not found" }); return; }
  res.json({ assignment: data });
});

router.delete("/assignments/:assignmentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;
  const db = getAuthClient(req.token!);
  await db.from("assignments").delete().eq("id", assignmentId).eq("professor_id", req.userId!);
  res.status(204).send();
});

export default router;
