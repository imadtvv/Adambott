import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const streamsTable = pgTable("streams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sourceUrl: text("source_url").notNull(),
  primaryStreamKey: text("primary_stream_key").notNull(),
  backupStreamKey: text("backup_stream_key"),
  rtmpsUrl: text("rtmps_url").notNull().default("rtmps://live-api-s.facebook.com:443/rtmp/"),
  status: text("status").notNull().default("idle"),
  activeKey: text("active_key").notNull().default("primary"),
  switchInterval: integer("switch_interval").notNull().default(0),
  copyrightProtection: boolean("copyright_protection").notNull().default(true),
  pid: integer("pid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStreamSchema = createInsertSchema(streamsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  activeKey: true,
  pid: true,
});

export type InsertStream = z.infer<typeof insertStreamSchema>;
export type Stream = typeof streamsTable.$inferSelect;
