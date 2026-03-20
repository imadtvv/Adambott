import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sessionsTable, accessCodesTable } from "@workspace/db/schema";
import { eq, gt } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const ADMIN_CODE = "4455";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const [session] = await db.select().from(sessionsTable)
    .where(eq(sessionsTable.token, token));

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  (req as any).session = session;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    if ((req as any).session?.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

router.post("/login", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: "Code is required" });
    return;
  }

  let role: "admin" | "user" = "user";

  if (code === ADMIN_CODE) {
    role = "admin";
  } else {
    const [accessCode] = await db.select().from(accessCodesTable)
      .where(eq(accessCodesTable.code, code));

    if (!accessCode) {
      res.status(401).json({ error: "Invalid access code" });
      return;
    }

    if (accessCode.useCount >= accessCode.maxUses) {
      res.status(401).json({ error: "This code has reached its maximum usage limit" });
      return;
    }

    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      res.status(401).json({ error: "This access code has expired" });
      return;
    }

    const newCount = accessCode.useCount + 1;
    const fullyUsed = newCount >= accessCode.maxUses;

    await db.update(accessCodesTable)
      .set({
        useCount: newCount,
        used: fullyUsed,
        usedAt: fullyUsed ? new Date() : accessCode.usedAt,
      })
      .where(eq(accessCodesTable.id, accessCode.id));
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessionsTable).values({ token, role, expiresAt });

  res.json({ token, role, message: `Logged in as ${role}` });
});

router.get("/verify", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const [session] = await db.select().from(sessionsTable)
    .where(eq(sessionsTable.token, token));

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  res.json({ token: session.token, role: session.role as "admin" | "user", message: "Session valid" });
});

router.post("/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
