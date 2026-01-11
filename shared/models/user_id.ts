import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userIds = pgTable("user_ids", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserIdSchema = createInsertSchema(userIds).omit({ id: true, createdAt: true });
export type UserId = typeof userIds.$inferSelect;
export type InsertUserId = z.infer<typeof insertUserIdSchema>;
