import { pgTable, varchar, jsonb, timestamp, numeric } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { projects } from "./projects";

export const projectBudget = pgTable("project_budget", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  budgetLimit: numeric("budget_limit"),
  components: jsonb("components"),
  totalEstimated: numeric("total_estimated").default("0"),
  totalActual: numeric("total_actual").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ProjectBudget = typeof projectBudget.$inferSelect;
