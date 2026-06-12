import { pgTable, varchar, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  professorId: varchar("professor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  college: varchar("college").notNull(),
  academicYear: varchar("academic_year"),
  joinCode: varchar("join_code").unique(),
  studentCount: integer("student_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const classMembers = pgTable("class_members", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  classId: varchar("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  professorId: varchar("professor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  objectives: jsonb("objectives"),
  allowedComponents: jsonb("allowed_components"),
  requiredPhases: jsonb("required_phases"),
  deadline: timestamp("deadline"),
  maxGroupSize: integer("max_group_size").default(4),
  allowAnyComponents: boolean("allow_any_components").default(true),
  gradingCriteria: jsonb("grading_criteria"),
  status: varchar("status", { length: 50 }).default("active"),
  submissionCount: integer("submission_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id"),
  status: varchar("status", { length: 50 }).default("draft"),
  groupMembers: jsonb("group_members"),
  videoDemoUrl: varchar("video_demo_url"),
  studentNote: text("student_note"),
  componentList: jsonb("component_list"),
  aiAssistanceLog: jsonb("ai_assistance_log"),
  grade: varchar("grade"),
  graderFeedback: text("grader_feedback"),
  gradedAt: timestamp("graded_at"),
  gradedBy: varchar("graded_by"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Class = typeof classes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
