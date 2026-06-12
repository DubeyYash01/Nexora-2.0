import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import type { Response } from "express";
import { db } from "@workspace/db";
import { classes, classMembers, assignments, assignmentSubmissions, profiles } from "@workspace/db/schema";
import { and, eq, inArray, asc, desc } from "drizzle-orm";

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

  const [cls] = await db
    .select({ professorId: classes.professorId })
    .from(classes)
    .where(eq(classes.id, classId));

  if (!cls || cls.professorId !== req.userId) {
    res.status(403).json({ error: "You do not own this class" });
    return;
  }

  const [data] = await db
    .insert(assignments)
    .values({
      id: crypto.randomUUID(),
      classId,
      professorId: req.userId!,
      title,
      description,
      objectives: objectives ?? [],
      allowedComponents: allowedComponents ?? null,
      requiredPhases: requiredPhases ?? [],
      deadline: deadline ? new Date(deadline) : null,
      maxGroupSize: maxGroupSize ?? 4,
      allowAnyComponents: allowAnyComponents ?? true,
      gradingCriteria: gradingCriteria ?? null,
      status: status ?? "active",
      submissionCount: 0,
    })
    .returning();

  if (!data) {
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

  const data = await db
    .select({
      id: assignments.id,
      classId: assignments.classId,
      title: assignments.title,
      status: assignments.status,
      deadline: assignments.deadline,
      submissionCount: assignments.submissionCount,
      createdAt: assignments.createdAt,
      className: classes.name,
      classSubject: classes.subject,
    })
    .from(assignments)
    .leftJoin(classes, eq(classes.id, assignments.classId))
    .where(eq(assignments.professorId, professorId))
    .orderBy(desc(assignments.createdAt));

  res.json({ assignments: data });
});

// GET /api/assignments/student/:studentId
router.get("/assignments/student/:studentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  if (req.userId !== studentId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const memberships = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(eq(classMembers.studentId, studentId));

  if (memberships.length === 0) {
    res.json({ assignments: [] });
    return;
  }

  const classIds = memberships.map((m) => m.classId);

  const assignmentData = await db
    .select({
      id: assignments.id,
      classId: assignments.classId,
      title: assignments.title,
      description: assignments.description,
      objectives: assignments.objectives,
      deadline: assignments.deadline,
      status: assignments.status,
      maxGroupSize: assignments.maxGroupSize,
      requiredPhases: assignments.requiredPhases,
      createdAt: assignments.createdAt,
      className: classes.name,
      classSubject: classes.subject,
    })
    .from(assignments)
    .leftJoin(classes, eq(classes.id, assignments.classId))
    .where(and(inArray(assignments.classId, classIds), inArray(assignments.status, ["active", "closed"])))
    .orderBy(asc(assignments.deadline));

  const submissionData = await db
    .select({
      id: assignmentSubmissions.id,
      assignmentId: assignmentSubmissions.assignmentId,
      status: assignmentSubmissions.status,
      grade: assignmentSubmissions.grade,
      submittedAt: assignmentSubmissions.submittedAt,
      projectId: assignmentSubmissions.projectId,
    })
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.studentId, studentId));

  const submissionMap = new Map(submissionData.map((s) => [s.assignmentId, s]));

  const enriched = assignmentData.map((a) => ({
    ...a,
    submission: submissionMap.get(a.id) ?? null,
  }));

  res.json({ assignments: enriched });
});

// GET /api/assignments/:assignmentId/submissions
router.get("/assignments/:assignmentId/submissions", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  const [assignment] = await db
    .select({
      professorId: assignments.professorId,
      title: assignments.title,
      deadline: assignments.deadline,
      status: assignments.status,
      classId: assignments.classId,
      gradingCriteria: assignments.gradingCriteria,
      requiredPhases: assignments.requiredPhases,
    })
    .from(assignments)
    .where(eq(assignments.id, assignmentId));

  if (!assignment || assignment.professorId !== req.userId) {
    res.status(403).json({ error: "Professor access only" });
    return;
  }

  const submissionsData = await db
    .select({
      id: assignmentSubmissions.id,
      assignmentId: assignmentSubmissions.assignmentId,
      studentId: assignmentSubmissions.studentId,
      projectId: assignmentSubmissions.projectId,
      status: assignmentSubmissions.status,
      grade: assignmentSubmissions.grade,
      submittedAt: assignmentSubmissions.submittedAt,
      graderFeedback: assignmentSubmissions.graderFeedback,
      fullName: profiles.fullName,
      email: profiles.email,
      avatarUrl: profiles.avatarUrl,
    })
    .from(assignmentSubmissions)
    .leftJoin(profiles, eq(profiles.id, assignmentSubmissions.studentId))
    .where(eq(assignmentSubmissions.assignmentId, assignmentId))
    .orderBy(desc(assignmentSubmissions.submittedAt));

  const members = await db
    .select({ studentId: classMembers.studentId })
    .from(classMembers)
    .where(eq(classMembers.classId, assignment.classId));

  res.json({
    assignment,
    submissions: submissionsData,
    totalStudents: members.length,
  });
});

// GET /api/assignments/:assignmentId
router.get("/assignments/:assignmentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  const [data] = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, assignmentId));

  if (!data) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json({ assignment: data });
});

// PATCH /api/assignments/:assignmentId
router.patch("/assignments/:assignmentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;
  const { title, description, deadline, status, gradingCriteria } = req.body;

  const [data] = await db
    .update(assignments)
    .set({ title, description, deadline: deadline ? new Date(deadline) : undefined, status, gradingCriteria, updatedAt: new Date() })
    .where(and(eq(assignments.id, assignmentId), eq(assignments.professorId, req.userId!)))
    .returning();

  if (!data) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json({ assignment: data });
});

// DELETE /api/assignments/:assignmentId
router.delete("/assignments/:assignmentId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;

  await db
    .delete(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.professorId, req.userId!)));

  res.status(204).send();
});

export default router;
