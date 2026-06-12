import { Router } from "express";
import { verifyToken, type AuthRequest } from "../middlewares/verifyToken";
import { logger } from "../lib/logger";
import type { Response } from "express";
import { db } from "@workspace/db";
import { classes, classMembers, assignments, assignmentSubmissions, profiles } from "@workspace/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";

const router = Router();

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/classes/create
router.post("/classes/create", verifyToken, async (req: AuthRequest, res: Response) => {
  const { name, subject, college, academicYear, joinCode } = req.body;

  if (!name || !subject || !college) {
    res.status(400).json({ error: "name, subject, and college are required" });
    return;
  }

  const code = joinCode || generateJoinCode();

  const [data] = await db
    .insert(classes)
    .values({
      id: crypto.randomUUID(),
      professorId: req.userId!,
      name,
      subject,
      college,
      academicYear,
      joinCode: code,
      studentCount: 0,
      isActive: true,
    })
    .returning();

  if (!data) {
    res.status(500).json({ error: "Failed to create class" });
    return;
  }

  res.status(201).json({ class: data });
});

// GET /api/classes/professor/stats
router.get("/classes/professor/stats", verifyToken, async (req: AuthRequest, res) => {
  const classData = await db
    .select({ id: classes.id, studentCount: classes.studentCount })
    .from(classes)
    .where(eq(classes.professorId, req.userId!));

  const assignmentData = await db
    .select({ id: assignments.id, status: assignments.status })
    .from(assignments)
    .where(eq(assignments.professorId, req.userId!));

  const assignmentIds = assignmentData.map((a) => a.id);
  let submissionData: { status: string }[] = [];
  if (assignmentIds.length > 0) {
    submissionData = await db
      .select({ status: assignmentSubmissions.status })
      .from(assignmentSubmissions)
      .where(inArray(assignmentSubmissions.assignmentId, assignmentIds));
  }

  const totalStudents = classData.reduce((s, c) => s + (c.studentCount ?? 0), 0);
  const activeAssignments = assignmentData.filter((a) => a.status === "active").length;
  const pendingReviews = submissionData.filter((s) => s.status === "submitted").length;
  const submitted = submissionData.filter((s) => s.status === "submitted" || s.status === "graded").length;
  const total = totalStudents * assignmentData.length;
  const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

  res.json({
    totalClasses: classData.length,
    activeAssignments,
    totalStudents,
    pendingReviews,
    completionRate,
  });
});

// GET /api/classes/professor/:professorId
router.get("/classes/professor/:professorId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { professorId } = req.params;

  if (req.userId !== professorId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const data = await db
    .select()
    .from(classes)
    .where(eq(classes.professorId, professorId))
    .orderBy(desc(classes.createdAt));

  res.json({ classes: data });
});

// POST /api/classes/join
router.post("/classes/join", verifyToken, async (req: AuthRequest, res: Response) => {
  const { joinCode } = req.body;

  if (!joinCode) {
    res.status(400).json({ error: "joinCode is required" });
    return;
  }

  const [cls] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.joinCode, joinCode.toUpperCase()), eq(classes.isActive, true)));

  if (!cls) {
    res.status(404).json({ error: "Invalid code. Check with your professor." });
    return;
  }

  const [existing] = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .where(and(eq(classMembers.classId, cls.id), eq(classMembers.studentId, req.userId!)));

  if (existing) {
    res.status(409).json({ error: "You are already a member of this class" });
    return;
  }

  await db.insert(classMembers).values({
    id: crypto.randomUUID(),
    classId: cls.id,
    studentId: req.userId!,
  });

  await db
    .update(classes)
    .set({ studentCount: (cls.studentCount ?? 0) + 1 })
    .where(eq(classes.id, cls.id));

  const assignmentData = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.classId, cls.id), eq(assignments.status, "active")));

  res.json({ class: cls, assignments: assignmentData });
});

// GET /api/classes/:classId/students
router.get("/classes/:classId/students", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;

  const [cls] = await db
    .select({ professorId: classes.professorId })
    .from(classes)
    .where(eq(classes.id, classId));

  if (!cls || cls.professorId !== req.userId) {
    res.status(403).json({ error: "Professor access only" });
    return;
  }

  const members = await db
    .select({
      id: classMembers.id,
      studentId: classMembers.studentId,
      joinedAt: classMembers.joinedAt,
      fullName: profiles.fullName,
      email: profiles.email,
      avatarUrl: profiles.avatarUrl,
    })
    .from(classMembers)
    .leftJoin(profiles, eq(profiles.id, classMembers.studentId))
    .where(eq(classMembers.classId, classId))
    .orderBy(desc(classMembers.joinedAt));

  res.json({ students: members });
});

// GET /api/classes/student/my
router.get("/classes/student/my", verifyToken, async (req: AuthRequest, res: Response) => {
  const myClasses = await db
    .select({
      id: classes.id,
      name: classes.name,
      subject: classes.subject,
      college: classes.college,
      academicYear: classes.academicYear,
      joinCode: classes.joinCode,
      studentCount: classes.studentCount,
      isActive: classes.isActive,
      professorId: classes.professorId,
    })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(eq(classMembers.studentId, req.userId!));

  res.json({ classes: myClasses });
});

// PATCH /api/classes/:classId
router.patch("/classes/:classId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const { name, subject, college, academicYear, isActive } = req.body;

  const [data] = await db
    .update(classes)
    .set({ name, subject, college, academicYear, isActive, updatedAt: new Date() })
    .where(and(eq(classes.id, classId), eq(classes.professorId, req.userId!)))
    .returning();

  if (!data) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  res.json({ class: data });
});

// DELETE /api/classes/:classId
router.delete("/classes/:classId", verifyToken, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;

  await db
    .delete(classes)
    .where(and(eq(classes.id, classId), eq(classes.professorId, req.userId!)));

  res.status(204).send();
});

export default router;
