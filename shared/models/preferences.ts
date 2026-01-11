import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projects } from "../schema";

export const preferences = pgTable("preferences", {
  id: serial("id").primaryKey(),
  projectId: serial("project_id").references(() => projects.id),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPreferencesSchema = createInsertSchema(preferences).omit({ id: true, updatedAt: true });
export type Preferences = typeof preferences.$inferSelect;
export type InsertPreferences = z.infer<typeof insertPreferencesSchema>;
