import { pgTable, varchar, jsonb, timestamp, text } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const aiConversations = pgTable("ai_conversations", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  projectId: varchar("project_id"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messages: jsonb("messages"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiFeedback = pgTable("ai_feedback", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  messageId: varchar("message_id"),
  projectId: varchar("project_id"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  feedback: varchar("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});
