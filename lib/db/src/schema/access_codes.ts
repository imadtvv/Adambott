import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accessCodesTable = pgTable("access_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  maxUses: integer("max_uses").notNull().default(1),
  useCount: integer("use_count").notNull().default(0),
  used: boolean("used").notNull().default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAccessCodeSchema = createInsertSchema(accessCodesTable).omit({
  id: true,
  createdAt: true,
  used: true,
  usedAt: true,
  useCount: true,
});

export type InsertAccessCode = z.infer<typeof insertAccessCodeSchema>;
export type AccessCode = typeof accessCodesTable.$inferSelect;
