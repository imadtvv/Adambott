import { Router, type IRouter } from "express";
import { requireAdmin } from "./auth.js";
import { fbGetAllCodes, fbCreateCode, fbDeleteCode, type FirebaseAccessCode } from "../lib/firebase.js";

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

function serializeCode(c: FirebaseAccessCode) {
  return {
    id: c.id,
    code: c.code,
    maxUses: c.maxUses,
    useCount: c.useCount,
    used: c.used,
    expiresAt: c.expiresAt ?? null,
    usedAt: c.usedAt ?? null,
    createdAt: c.createdAt,
  };
}

router.get("/codes", requireAdmin, async (_req, res) => {
  const codes = await fbGetAllCodes();
  codes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  res.json(codes.map(serializeCode));
});

router.post("/codes", requireAdmin, async (req, res) => {
  const { maxUses, expiresAt } = req.body ?? {};

  const parsedMaxUses = maxUses && Number(maxUses) > 0 ? Number(maxUses) : 1;
  const parsedExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;

  const code = generateCode();
  const now = new Date().toISOString();

  const newCode = await fbCreateCode({
    code,
    maxUses: parsedMaxUses,
    useCount: 0,
    used: false,
    expiresAt: parsedExpiresAt,
    usedAt: null,
    createdAt: now,
  });

  res.status(201).json(serializeCode(newCode));
});

router.delete("/codes/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const deleted = await fbDeleteCode(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: "Code not found" });
    return;
  }
  res.json({ success: true, message: "Code deleted" });
});

export default router;
