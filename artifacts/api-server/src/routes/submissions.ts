import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";
import type { Response } from "express";

const router = Router();

// GET /api/submissions/:submissionId
router.get("/submissions/:submissionId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { submissionId } = req.params;

  const { data: submission, error } = await supabaseAdmin
    .from("assignment_submissions")
    .select("*, profiles(id, full_name, email, avatar_url), projects(*), assignments(title, deadline, grading_criteria, required_phases, professor_id)")
    .eq("id", submissionId)
    .single();

  if (error || !submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  if (submission.student_id !== req.userId && submission.assignments?.professor_id !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { data: aiConv } = await supabaseAdmin
    .from("ai_conversations")
    .select("messages")
    .eq("project_id", submission.project_id)
    .eq("user_id", submission.student_id)
    .single();

  const messages = (aiConv?.messages as object[]) ?? [];
  const aiCount = messages.length;

  res.json({ submission: { ...submission, aiMessageCount: aiCount, aiMessages: messages } });
});

// POST /api/submissions/submit
router.post("/submissions/submit", verifyToken, async (req: AuthRequest, res: Response) => {
  const {
    projectId, assignmentId, groupMembers,
    videoDemoUrl, studentNote,
  } = req.body;

  if (!projectId || !assignmentId) {
    res.status(400).json({ error: "projectId and assignmentId required" });
    return;
  }

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", req.userId!)
    .single();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const buildPlan = project.build_plan as { buildPlan?: { totalSteps?: number; steps?: { phase: string }[] } } | null;
  const totalSteps = buildPlan?.buildPlan?.totalSteps ?? 0;
  const completedSteps = (project.completed_steps as number[] | null) ?? [];

  const { data: aiConv } = await supabaseAdmin
    .from("ai_conversations")
    .select("messages")
    .eq("project_id", projectId)
    .eq("user_id", req.userId!)
    .single();

  const aiMessages = (aiConv?.messages as object[]) ?? [];
  const aiAssistanceLog = {
    totalMessages: aiMessages.length,
    messagesLog: aiMessages,
  };

  const { data: existing } = await supabaseAdmin
    .from("assignment_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", req.userId!)
    .single();

  let submission;
  if (existing) {
    const { data } = await supabaseAdmin
      .from("assignment_submissions")
      .update({
        project_id: projectId,
        group_members: groupMembers ?? [],
        submitted_at: new Date().toISOString(),
        status: "submitted",
        ai_assistance_log: aiAssistanceLog,
        component_list: project.components,
        build_steps_completed: completedSteps.length,
        total_build_steps: totalSteps,
        ...(videoDemoUrl ? { video_demo_url: videoDemoUrl } : {}),
        ...(studentNote ? { student_note: studentNote } : {}),
      })
      .eq("id", existing.id)
      .select()
      .single();
    submission = data;
  } else {
    const { data } = await supabaseAdmin
      .from("assignment_submissions")
      .insert({
        assignment_id: assignmentId,
        project_id: projectId,
        student_id: req.userId!,
        group_members: groupMembers ?? [],
        submitted_at: new Date().toISOString(),
        status: "submitted",
        ai_assistance_log: aiAssistanceLog,
        component_list: project.components,
        build_steps_completed: completedSteps.length,
        total_build_steps: totalSteps,
        ...(videoDemoUrl ? { video_demo_url: videoDemoUrl } : {}),
        ...(studentNote ? { student_note: studentNote } : {}),
      })
      .select()
      .single();
    submission = data;
  }

  await supabaseAdmin
    .from("projects")
    .update({ submitted_for_assignment: true })
    .eq("id", projectId);

  await supabaseAdmin
    .from("assignments")
    .update({
      submission_count: supabaseAdmin.rpc("increment", { row_id: assignmentId }) as unknown as number,
    })
    .eq("id", assignmentId);

  res.json({ submission });
});

// POST /api/submissions/draft
router.post("/submissions/draft", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, assignmentId } = req.body;

  if (!projectId || !assignmentId) {
    res.status(400).json({ error: "projectId and assignmentId required" });
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("assignment_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", req.userId!)
    .single();

  if (existing) {
    res.json({ submission: existing });
    return;
  }

  const { data } = await supabaseAdmin
    .from("assignment_submissions")
    .insert({
      assignment_id: assignmentId,
      project_id: projectId,
      student_id: req.userId!,
      status: "draft",
    })
    .select()
    .single();

  res.json({ submission: data });
});

// PUT /api/submissions/grade
router.put("/submissions/grade", verifyToken, async (req: AuthRequest, res: Response) => {
  const { submissionId, grade, feedback, rubricScores } = req.body;

  if (!submissionId) {
    res.status(400).json({ error: "submissionId required" });
    return;
  }

  const { data: submission } = await supabaseAdmin
    .from("assignment_submissions")
    .select("assignment_id")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const { data: assignment } = await supabaseAdmin
    .from("assignments")
    .select("professor_id")
    .eq("id", submission.assignment_id)
    .single();

  if (!assignment || assignment.professor_id !== req.userId) {
    res.status(403).json({ error: "Professor access only" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("assignment_submissions")
    .update({
      grade,
      professor_feedback: feedback,
      rubric_scores: rubricScores ?? null,
      status: "graded",
      graded_at: new Date().toISOString(),
      graded_by: req.userId!,
    })
    .eq("id", submissionId)
    .select("*, profiles(full_name)")
    .single();

  if (error) {
    logger.error({ err: error }, "Failed to grade submission");
    res.status(500).json({ error: "Failed to save grade" });
    return;
  }

  res.json({ submission: data });
});

// GET /api/submissions/student/:studentId
router.get("/submissions/student/:studentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  if (req.userId !== studentId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("assignment_submissions")
    .select("*, assignments(title, deadline)")
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to fetch submissions" });
    return;
  }

  res.json({ submissions: data ?? [] });
});

export default router;
