import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const memory = pgTable("memory", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'fact', 'alarm', 'temp', 'long'
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memory).omit({ id: true, createdAt: true });
export type Memory = typeof memory.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
