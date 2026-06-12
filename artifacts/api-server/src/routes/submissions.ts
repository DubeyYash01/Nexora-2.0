import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import type { Response } from "express";
import { db } from "@workspace/db";
import { assignmentSubmissions, assignments, projects, aiConversations, profiles } from "@workspace/db/schema";
import { and, eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/submissions/:submissionId
router.get("/submissions/:submissionId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { submissionId } = req.params;

  const [submission] = await db
    .select()
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.id, submissionId));

  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const [assignment] = await db
    .select({ professorId: assignments.professorId, title: assignments.title, deadline: assignments.deadline, gradingCriteria: assignments.gradingCriteria, requiredPhases: assignments.requiredPhases })
    .from(assignments)
    .where(eq(assignments.id, submission.assignmentId));

  if (submission.studentId !== req.userId && assignment?.professorId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [aiConv] = await db
    .select({ messages: aiConversations.messages })
    .from(aiConversations)
    .where(and(eq(aiConversations.projectId, submission.projectId!), eq(aiConversations.userId, submission.studentId)));

  const messages = (aiConv?.messages as object[]) ?? [];

  res.json({ submission: { ...submission, assignment, aiMessageCount: messages.length, aiMessages: messages } });
});

// POST /api/submissions/submit
router.post("/submissions/submit", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, assignmentId, groupMembers, videoDemoUrl, studentNote } = req.body;

  if (!projectId || !assignmentId) {
    res.status(400).json({ error: "projectId and assignmentId required" });
    return;
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, req.userId!)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const buildPlan = project.buildPlan as { buildPlan?: { totalSteps?: number } } | null;
  const totalSteps = buildPlan?.buildPlan?.totalSteps ?? 0;
  const completedSteps = (project.completedSteps as number[] | null) ?? [];

  const [aiConv] = await db
    .select({ messages: aiConversations.messages })
    .from(aiConversations)
    .where(and(eq(aiConversations.projectId, projectId), eq(aiConversations.userId, req.userId!)));

  const aiMessages = (aiConv?.messages as object[]) ?? [];
  const aiAssistanceLog = { totalMessages: aiMessages.length, messagesLog: aiMessages };

  const [existing] = await db
    .select({ id: assignmentSubmissions.id })
    .from(assignmentSubmissions)
    .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, req.userId!)));

  let submission;
  if (existing) {
    const [updated] = await db
      .update(assignmentSubmissions)
      .set({
        projectId,
        groupMembers: groupMembers ?? [],
        submittedAt: new Date(),
        status: "submitted",
        aiAssistanceLog,
        componentList: project.components,
        videoDemoUrl: videoDemoUrl ?? null,
        studentNote: studentNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(assignmentSubmissions.id, existing.id))
      .returning();
    submission = updated;
  } else {
    const [inserted] = await db
      .insert(assignmentSubmissions)
      .values({
        id: crypto.randomUUID(),
        assignmentId,
        projectId,
        studentId: req.userId!,
        groupMembers: groupMembers ?? [],
        submittedAt: new Date(),
        status: "submitted",
        aiAssistanceLog,
        componentList: project.components,
        videoDemoUrl: videoDemoUrl ?? null,
        studentNote: studentNote ?? null,
      })
      .returning();
    submission = inserted;
  }

  res.json({ submission });
});

// POST /api/submissions/draft
router.post("/submissions/draft", verifyToken, async (req: AuthRequest, res: Response) => {
  const { projectId, assignmentId } = req.body;

  if (!projectId || !assignmentId) {
    res.status(400).json({ error: "projectId and assignmentId required" });
    return;
  }

  const [existing] = await db
    .select({ id: assignmentSubmissions.id })
    .from(assignmentSubmissions)
    .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, req.userId!)));

  if (existing) {
    res.json({ submission: existing });
    return;
  }

  const [data] = await db
    .insert(assignmentSubmissions)
    .values({
      id: crypto.randomUUID(),
      assignmentId,
      projectId,
      studentId: req.userId!,
      status: "draft",
    })
    .returning();

  res.json({ submission: data });
});

// PUT /api/submissions/grade
router.put("/submissions/grade", verifyToken, async (req: AuthRequest, res: Response) => {
  const { submissionId, grade, feedback } = req.body;

  if (!submissionId) {
    res.status(400).json({ error: "submissionId required" });
    return;
  }

  const [submission] = await db
    .select({ assignmentId: assignmentSubmissions.assignmentId })
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.id, submissionId));

  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const [assignment] = await db
    .select({ professorId: assignments.professorId })
    .from(assignments)
    .where(eq(assignments.id, submission.assignmentId));

  if (!assignment || assignment.professorId !== req.userId) {
    res.status(403).json({ error: "Professor access only" });
    return;
  }

  const [data] = await db
    .update(assignmentSubmissions)
    .set({
      grade,
      graderFeedback: feedback,
      status: "graded",
      gradedAt: new Date(),
      gradedBy: req.userId!,
      updatedAt: new Date(),
    })
    .where(eq(assignmentSubmissions.id, submissionId))
    .returning();

  if (!data) {
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

  const data = await db
    .select({
      id: assignmentSubmissions.id,
      assignmentId: assignmentSubmissions.assignmentId,
      status: assignmentSubmissions.status,
      grade: assignmentSubmissions.grade,
      submittedAt: assignmentSubmissions.submittedAt,
      assignmentTitle: assignments.title,
      assignmentDeadline: assignments.deadline,
    })
    .from(assignmentSubmissions)
    .leftJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .where(eq(assignmentSubmissions.studentId, studentId))
    .orderBy(desc(assignmentSubmissions.submittedAt));

  res.json({ submissions: data });
});

export default router;
