import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { accessCodesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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

function serializeCode(c: typeof accessCodesTable.$inferSelect) {
  return {
    ...c,
    usedAt: c.usedAt?.toISOString() ?? null,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/codes", requireAdmin, async (_req, res) => {
  const codes = await db.select().from(accessCodesTable)
    .orderBy(accessCodesTable.createdAt);
  res.json(codes.map(serializeCode));
});

router.post("/codes", requireAdmin, async (req, res) => {
  const { maxUses, expiresAt } = req.body ?? {};

  const parsedMaxUses = maxUses && Number(maxUses) > 0 ? Number(maxUses) : 1;
  const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;

  const code = generateCode();

  const [newCode] = await db.insert(accessCodesTable)
    .values({
      code,
      maxUses: parsedMaxUses,
      expiresAt: parsedExpiresAt ?? undefined,
    })
    .returning();

  res.status(201).json(serializeCode(newCode));
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
