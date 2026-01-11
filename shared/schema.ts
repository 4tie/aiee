import { pgTable, text, serial, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";
export * from "./models/settings";
export * from "./models/memory";
export * from "./models/preferences";
export * from "./models/user_id";
export * from "./models/auth";

export const freqtradeConnections = pgTable("freqtrade_connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apiUrl: text("api_url").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isActive: boolean("is_active").default(true),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  files: jsonb("files").notNull().default([]), // List of objects { name: string, content: string, path: string, type: 'file' | 'folder' }
  messages: jsonb("messages").notNull().default([]), // Project-specific chat history
  memory: jsonb("memory").notNull().default({}), // Project-specific memory/data
  activeTask: jsonb("active_task").default(null), // { type: string, progress: number, status: string }
  downloads: jsonb("downloads").notNull().default([]), // List of objects { id: string, title: string, status: string, progress: number }
  musicPreferences: jsonb("music_preferences").notNull().default({
    genres: [],
    artists: [],
    analysis: "",
    lastUpdated: null
  }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  rating: text("rating").notNull(), // 'up' or 'down'
  comment: text("comment"),
  messageIndex: serial("message_index").notNull(),
  projectId: serial("project_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const youtubeVideos = pgTable("youtube_videos", {
  id: serial("id").primaryKey(),
  youtubeId: text("youtube_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  channelTitle: text("channel_title"),
  lastPlayedAt: timestamp("last_played_at"),
  playCount: integer("play_count").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const youtubeAuth = pgTable("youtube_auth", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(), // Links to Replit user or local user
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiryDate: timestamp("expiry_date"),
  scopes: text("scopes").array(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playlistItems = pgTable("playlist_items", {
  id: serial("id").primaryKey(),
  playlistId: serial("playlist_id").references(() => playlists.id),
  videoId: serial("video_id").references(() => youtubeVideos.id),
  position: serial("position").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertYoutubeVideoSchema = createInsertSchema(youtubeVideos).omit({ id: true, createdAt: true });
export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true, createdAt: true });
export const insertPlaylistItemSchema = createInsertSchema(playlistItems).omit({ id: true, createdAt: true });

export type YoutubeVideo = typeof youtubeVideos.$inferSelect;
export type InsertYoutubeVideo = z.infer<typeof insertYoutubeVideoSchema>;

export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;

export type PlaylistItem = typeof playlistItems.$inferSelect;
export type InsertPlaylistItem = z.infer<typeof insertPlaylistItemSchema>;

export interface FreqtradeTrade {
  trade_id: number;
  pair: string;
  is_open: boolean;
  exchange: string;
  amount: number;
  amount_requested: number;
  stake_amount: number;
  strategy: string;
  timeframe: number;
  fee_open: number;
  fee_open_cost: number;
  fee_open_currency: string;
  fee_close?: number;
  fee_close_cost?: number;
  fee_close_currency?: string;
  open_date: string;
  open_timestamp: number;
  open_rate: number;
  open_rate_requested: number;
  open_trade_value: number;
  close_date?: string;
  close_timestamp?: number;
  close_rate?: number;
  close_rate_requested?: number;
  close_profit?: number;
  close_profit_pct?: number;
  close_profit_abs?: number;
  profit_ratio?: number;
  profit_pct?: number;
  profit_abs?: number;
  sell_reason?: string;
  exit_reason?: string;
  exit_order_status?: string;
  stop_loss_abs?: number;
  stop_loss_pct?: number;
  stop_loss_ratio?: number;
  initial_stop_loss_abs?: number;
  initial_stop_loss_pct?: number;
  initial_stop_loss_ratio?: number;
  min_rate?: number;
  max_rate?: number;
  is_short: boolean;
  leverage: number;
  interest_rate?: number;
  buy_tag?: string;
  enter_tag?: string;
}

export interface FreqtradeState {
  status: string;
  state: string;
}

export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export const insertFreqtradeConnectionSchema = createInsertSchema(freqtradeConnections).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, updatedAt: true });

export type FreqtradeConnection = typeof freqtradeConnections.$inferSelect;
export type InsertFreqtradeConnection = z.infer<typeof insertFreqtradeConnectionSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export interface BacktestRequest {
  projectName: string;
  timerange?: string;
  timeframe?: string;
}

export interface ChatRequest {
  message: string;
  model?: string;
  contextFiles?: string[]; // IDs of projects to include in context
}

export interface ChatResponse {
  message: string;
}
