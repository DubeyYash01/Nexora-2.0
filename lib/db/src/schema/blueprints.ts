import { pgTable, varchar, text, jsonb, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const blueprints = pgTable("blueprints", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  authorId: varchar("author_id").references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  difficulty: varchar("difficulty"),
  category: varchar("category"),
  components: jsonb("components"),
  buildPlan: jsonb("build_plan"),
  aiAnalysis: jsonb("ai_analysis"),
  tags: jsonb("tags"),
  isFeatured: boolean("is_featured").default(false),
  isPublic: boolean("is_public").default(true),
  forkCount: integer("fork_count").default(0),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  sourceProjectId: varchar("source_project_id"),
  estimatedCostMin: integer("estimated_cost_min"),
  estimatedCostMax: integer("estimated_cost_max"),
  estimatedTime: varchar("estimated_time"),
  platform: varchar("platform"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blueprintLikes = pgTable("blueprint_likes", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  blueprintId: varchar("blueprint_id").notNull().references(() => blueprints.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blueprintReviews = pgTable("blueprint_reviews", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  blueprintId: varchar("blueprint_id").notNull().references(() => blueprints.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating"),
  reviewText: text("review_text"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Blueprint = typeof blueprints.$inferSelect;
