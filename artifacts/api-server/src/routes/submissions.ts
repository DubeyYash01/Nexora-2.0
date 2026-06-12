import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import type { Response } from "express";
import { getAuthClient } from "../lib/supabaseAdmin";

const router = Router();

router.get("/submissions/:submissionId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { submissionId } = req.params;
  const db = getAuthClient(req.token!);

  const { data: submission } = await db.from("assignment_submissions").select("*").eq("id", submissionId).single();
  if (!submission) { res.status(404).json({ error: "Submission not found" }); return; }

  const { data: assignment } = await db
    .from("assignments")
    .select("professor_id,title,deadline,grading_criteria,required_phases")
    .eq("id", submission.assignment_id)
    .single();

  if (submission.student_id !== req.userId && assignment?.professor_id !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { data: aiConv } = await db
    .from("ai_conversations")
    .select("messages")
    .eq("project_id", submission.project_id)
    .eq("user_id", submission.student_id)
    .single();

  const messages = (aiConv?.messages as object[]) ?? [];
  res.json({ submission: { ...submission, assignment, aiMessageCount: messages.length, aiMessages: messages } });
});

router.post("/submissions/submit", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, assignmentId, groupMembers, videoDemoUrl, studentNote } = req.body;

  if (!projectId || !assignmentId) { res.status(400).json({ error: "projectId and assignmentId required" }); return; }

  const db = getAuthClient(req.token!);
  const { data: project } = await db.from("projects").select("*").eq("id", projectId).eq("user_id", req.userId!).single();
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const { data: aiConv } = await db
    .from("ai_conversations")
    .select("messages")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  const aiMessages = (aiConv?.messages as object[]) ?? [];
  const aiAssistanceLog = { totalMessages: aiMessages.length, messagesLog: aiMessages };

  const { data: existing } = await db
    .from("assignment_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", req.userId!)
    .single();

  let submission;
  if (existing) {
    const { data } = await db
      .from("assignment_submissions")
      .update({ project_id: projectId, group_members: groupMembers ?? [], submitted_at: new Date().toISOString(), status: "submitted", ai_assistance_log: aiAssistanceLog, component_list: project.components, video_demo_url: videoDemoUrl ?? null, student_note: studentNote ?? null, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    submission = data;
  } else {
    const { data } = await db
      .from("assignment_submissions")
      .insert({ assignment_id: assignmentId, project_id: projectId, student_id: req.userId!, group_members: groupMembers ?? [], submitted_at: new Date().toISOString(), status: "submitted", ai_assistance_log: aiAssistanceLog, component_list: project.components, video_demo_url: videoDemoUrl ?? null, student_note: studentNote ?? null })
      .select()
      .single();
    submission = data;
  }

  res.json({ submission });
});

router.post("/submissions/draft", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, assignmentId } = req.body;
  if (!projectId || !assignmentId) { res.status(400).json({ error: "projectId and assignmentId required" }); return; }

  const db = getAuthClient(req.token!);
  const { data: existing } = await db
    .from("assignment_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", req.userId!)
    .single();

  if (existing) { res.json({ submission: existing }); return; }

  const { data } = await db
    .from("assignment_submissions")
    .insert({ assignment_id: assignmentId, project_id: projectId, student_id: req.userId!, status: "draft" })
    .select()
    .single();

  res.json({ submission: data });
});

router.put("/submissions/grade", verifyToken, async (req: AuthRequest, res: Response) => {
  const { submissionId, grade, feedback } = req.body;
  if (!submissionId) { res.status(400).json({ error: "submissionId required" }); return; }

  const db = getAuthClient(req.token!);
  const { data: submission } = await db.from("assignment_submissions").select("assignment_id").eq("id", submissionId).single();
  if (!submission) { res.status(404).json({ error: "Submission not found" }); return; }

  const { data: assignment } = await db.from("assignments").select("professor_id").eq("id", submission.assignment_id).single();
  if (!assignment || assignment.professor_id !== req.userId) { res.status(403).json({ error: "Professor access only" }); return; }

  const { data, error } = await db
    .from("assignment_submissions")
    .update({ grade, grader_feedback: feedback, status: "graded", graded_at: new Date().toISOString(), graded_by: req.userId!, updated_at: new Date().toISOString() })
    .eq("id", submissionId)
    .select()
    .single();

  if (error) { res.status(500).json({ error: "Failed to save grade" }); return; }
  res.json({ submission: data });
});

router.get("/submissions/student/:studentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  if (req.userId !== studentId) { res.status(403).json({ error: "Forbidden" }); return; }

  const db = getAuthClient(req.token!);
  const { data } = await db
    .from("assignment_submissions")
    .select("id,assignment_id,status,grade,submitted_at,assignments(title,deadline)")
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false });

  res.json({ submissions: data ?? [] });
});

export default router;
