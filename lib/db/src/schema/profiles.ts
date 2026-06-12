import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email"),
  fullName: varchar("full_name"),
  avatarUrl: varchar("avatar_url"),
  role: varchar("role", { length: 50 }),
  collegeName: varchar("college_name"),
  course: varchar("course"),
  year: varchar("year"),
  skillLevel: varchar("skill_level"),
  bio: text("bio"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;
