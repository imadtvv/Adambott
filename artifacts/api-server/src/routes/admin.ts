import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { accessCodesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { requireAdmin } from "./auth.js";

const router: IRouter = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) code += "-";
  }
  return code;
}

router.get("/codes", requireAdmin, async (_req, res) => {
  const codes = await db.select().from(accessCodesTable)
    .orderBy(accessCodesTable.createdAt);
  res.json(codes.map(c => ({
    ...c,
    usedAt: c.usedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/codes", requireAdmin, async (_req, res) => {
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
  } while (attempts < 10);

  const [newCode] = await db.insert(accessCodesTable)
    .values({ code })
    .returning();

  res.status(201).json({
    ...newCode,
    usedAt: newCode.usedAt?.toISOString() ?? null,
    createdAt: newCode.createdAt.toISOString(),
  });
});

router.delete("/codes/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const [deleted] = await db.delete(accessCodesTable)
    .where(eq(accessCodesTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ success: false, message: "Code not found" });
    return;
  }
  res.json({ success: true, message: "Code deleted" });
});

export default router;
