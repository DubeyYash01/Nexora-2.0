import { pgTable, varchar, text, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const userComponents = pgTable("user_components", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(),
  quantity: integer("quantity").default(1),
  condition: varchar("condition"),
  purchasePrice: numeric("purchase_price"),
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow(),
});

export type UserComponent = typeof userComponents.$inferSelect;
export type InsertUserComponent = typeof userComponents.$inferInsert;
