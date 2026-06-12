import { pgTable, varchar, text, jsonb, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  ideaInput: text("idea_input"),
  status: varchar("status", { length: 50 }).default("draft"),
  currentStep: integer("current_step").default(0),
  aiAnalysis: jsonb("ai_analysis"),
  components: jsonb("components"),
  buildPlan: jsonb("build_plan"),
  completedSteps: jsonb("completed_steps"),
  instructionChecks: jsonb("instruction_checks"),
  ideCode: text("ide_code"),
  shareToken: varchar("share_token"),
  isPublic: boolean("is_public").default(false),
  blueprintId: varchar("blueprint_id"),
  assignmentId: varchar("assignment_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
