import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { streamsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { spawn, type ChildProcess } from "child_process";
import { logger } from "../lib/logger.js";
import { requireAuth } from "./auth.js";

const router: IRouter = Router();

const activeProcesses = new Map<number, { process: ChildProcess; switchTimer?: ReturnType<typeof setInterval> }>();

function buildFFmpegArgs(sourceUrl: string, rtmpsUrl: string, streamKey: string): string[] {
  const destination = `${rtmpsUrl}${streamKey}`;
  const lower = sourceUrl.toLowerCase();
  const isHls = lower.includes(".m3u8");
  const isMpegTs = lower.includes(".ts");
  const isUdp = lower.startsWith("udp://");
  const isRtp = lower.startsWith("rtp://");
  const isSrt = lower.startsWith("srt://");

  let inputArgs: string[];

  if (isHls) {
    inputArgs = [
      "-re",
      "-allowed_extensions", "ALL",
      "-protocol_whitelist", "file,http,https,tcp,tls,crypto",
      "-i", sourceUrl,
    ];
  } else if (isMpegTs || isUdp || isRtp || isSrt) {
    inputArgs = [
      "-re",
      "-fflags", "+genpts",
      "-protocol_whitelist", "file,http,https,tcp,tls,crypto,udp,rtp,srtp,srt",
      "-i", sourceUrl,
    ];
  } else {
    inputArgs = ["-re", "-i", sourceUrl];
  }

  return [
    ...inputArgs,
    "-c", "copy",
    "-f", "flv",
    destination,
  ];
}

const ffmpegLastError = new Map<number, string>();

async function startFFmpegProcess(streamId: number, sourceUrl: string, rtmpsUrl: string, streamKey: string): Promise<ChildProcess> {
  const args = buildFFmpegArgs(sourceUrl, rtmpsUrl, streamKey);
  logger.info({ streamId, cmd: `ffmpeg ${args.join(" ")}` }, "Starting FFmpeg process");

  const proc = spawn("ffmpeg", args, {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  let stderrBuf = "";
  proc.stderr?.on("data", (data: Buffer) => {
    const chunk = data.toString();
    stderrBuf += chunk;
    // Keep last 3000 chars for error reporting
    if (stderrBuf.length > 3000) stderrBuf = stderrBuf.slice(-3000);
    // Log progress lines at debug, errors at warn
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.match(/error|Error|failed|Failed|invalid|Invalid/i)) {
        logger.warn({ streamId, line }, "FFmpeg error line");
      }
    }
  });

  proc.on("exit", async (code, signal) => {
    if (code !== 0 && code !== null) {
      // Extract meaningful error from stderr
      const errorLines = stderrBuf.split("\n").filter(l => l.match(/error|Error|failed|Failed|Connection refused|No such|Invalid/i));
      const errorSummary = errorLines.slice(-5).join(" | ").trim();
      logger.error({ streamId, code, signal, error: errorSummary || stderrBuf.slice(-500) }, "FFmpeg exited with error");
      ffmpegLastError.set(streamId, errorSummary || stderrBuf.slice(-300));
    } else {
      logger.info({ streamId, code, signal }, "FFmpeg process exited");
      ffmpegLastError.delete(streamId);
    }
    const entry = activeProcesses.get(streamId);
    if (entry?.switchTimer) clearInterval(entry.switchTimer);
    activeProcesses.delete(streamId);
    const finalStatus = (code !== 0 && code !== null && signal === null) ? "error" : "idle";
    try {
      await db.update(streamsTable)
        .set({ status: finalStatus, pid: null, updatedAt: new Date() })
        .where(eq(streamsTable.id, streamId));
    } catch (err) {
      logger.error({ streamId, err }, "Failed to update stream status on exit");
    }
  });

  return proc;
}

router.get("/", requireAuth, async (_req, res) => {
  const streams = await db.select().from(streamsTable);
  res.json(streams.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    lastError: ffmpegLastError.get(s.id) ?? null,
  })));
});

router.post("/", requireAuth, async (req, res) => {
  const { name, sourceUrl, primaryStreamKey, backupStreamKey, rtmpsUrl, switchInterval, copyrightProtection } = req.body;
  if (!name || !sourceUrl || !primaryStreamKey || !rtmpsUrl) {
    res.status(400).json({ error: "name, sourceUrl, primaryStreamKey, rtmpsUrl are required" });
    return;
  }
  const [stream] = await db.insert(streamsTable).values({
    name, sourceUrl, primaryStreamKey,
    backupStreamKey: backupStreamKey || null,
    rtmpsUrl,
    switchInterval: switchInterval ?? 0,
    copyrightProtection: copyrightProtection ?? true,
    status: "idle",
    activeKey: "primary",
  }).returning();
  res.status(201).json({ ...stream, createdAt: stream.createdAt.toISOString(), updatedAt: stream.updatedAt.toISOString() });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [stream] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
  if (!stream) { res.status(404).json({ error: "Stream not found" }); return; }
  res.json({ ...stream, createdAt: stream.createdAt.toISOString(), updatedAt: stream.updatedAt.toISOString() });
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, sourceUrl, primaryStreamKey, backupStreamKey, rtmpsUrl, switchInterval, copyrightProtection } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (sourceUrl !== undefined) updates.sourceUrl = sourceUrl;
  if (primaryStreamKey !== undefined) updates.primaryStreamKey = primaryStreamKey;
  if (backupStreamKey !== undefined) updates.backupStreamKey = backupStreamKey;
  if (rtmpsUrl !== undefined) updates.rtmpsUrl = rtmpsUrl;
  if (switchInterval !== undefined) updates.switchInterval = switchInterval;
  if (copyrightProtection !== undefined) updates.copyrightProtection = copyrightProtection;
  const [stream] = await db.update(streamsTable).set(updates).where(eq(streamsTable.id, id)).returning();
  if (!stream) { res.status(404).json({ error: "Stream not found" }); return; }
  res.json({ ...stream, createdAt: stream.createdAt.toISOString(), updatedAt: stream.updatedAt.toISOString() });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const entry = activeProcesses.get(id);
  if (entry) {
    if (entry.switchTimer) clearInterval(entry.switchTimer);
    entry.process.kill("SIGKILL");
    activeProcesses.delete(id);
  }
  const [deleted] = await db.delete(streamsTable).where(eq(streamsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ success: false, message: "Stream not found" }); return; }
  res.json({ success: true, message: "Stream deleted" });
});

router.post("/:id/start", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [stream] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
  if (!stream) { res.status(404).json({ id, status: "error", activeKey: "primary", message: "Stream not found" }); return; }
  if (activeProcesses.has(id)) {
    res.json({ id, status: stream.status, activeKey: stream.activeKey, message: "Already running", pid: stream.pid });
    return;
  }
  const activeKey = stream.activeKey as "primary" | "backup";
  const streamKey = activeKey === "primary" ? stream.primaryStreamKey : (stream.backupStreamKey || stream.primaryStreamKey);
  try {
    const proc = await startFFmpegProcess(id, stream.sourceUrl, stream.rtmpsUrl, streamKey);
    const entry: { process: ChildProcess; switchTimer?: ReturnType<typeof setInterval> } = { process: proc };
    if (stream.copyrightProtection && stream.backupStreamKey && stream.switchInterval > 0) {
      let currentKey: "primary" | "backup" = "primary";
      entry.switchTimer = setInterval(async () => {
        const nextKey: "primary" | "backup" = currentKey === "primary" ? "backup" : "primary";
        const existingEntry = activeProcesses.get(id);
        if (!existingEntry) return;
        const [cur] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
        if (!cur) return;
        const nextKey2 = nextKey === "primary" ? cur.primaryStreamKey : (cur.backupStreamKey || cur.primaryStreamKey);
        existingEntry.process.kill("SIGTERM");
        try {
          const newProc = await startFFmpegProcess(id, cur.sourceUrl, cur.rtmpsUrl, nextKey2);
          existingEntry.process = newProc;
          currentKey = nextKey;
          await db.update(streamsTable).set({ activeKey: nextKey, updatedAt: new Date() }).where(eq(streamsTable.id, id));
          logger.info({ streamId: id, newKey: nextKey }, "Auto-switched key");
        } catch (err) { logger.error({ streamId: id, err }, "Failed to switch key"); }
      }, stream.switchInterval * 1000);
    }
    activeProcesses.set(id, entry);
    await db.update(streamsTable).set({ status: "streaming", pid: proc.pid || null, updatedAt: new Date() }).where(eq(streamsTable.id, id));
    res.json({ id, status: "streaming", activeKey, message: "Stream started", pid: proc.pid });
  } catch (err) {
    logger.error({ streamId: id, err }, "Failed to start stream");
    await db.update(streamsTable).set({ status: "error", updatedAt: new Date() }).where(eq(streamsTable.id, id));
    res.status(500).json({ id, status: "error", activeKey, message: "Failed to start stream" });
  }
});

router.post("/:id/stop", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const entry = activeProcesses.get(id);
  if (entry) {
    if (entry.switchTimer) clearInterval(entry.switchTimer);
    entry.process.kill("SIGTERM");
    setTimeout(() => { entry.process.kill("SIGKILL"); }, 3000);
    activeProcesses.delete(id);
  }
  await db.update(streamsTable).set({ status: "idle", pid: null, updatedAt: new Date() }).where(eq(streamsTable.id, id));
  res.json({ id, status: "idle", activeKey: "primary", message: "Stream stopped" });
});

router.get("/:id/status", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [stream] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
  if (!stream) { res.status(404).json({ id, status: "error", activeKey: "primary", message: "Not found" }); return; }
  const isRunning = activeProcesses.has(id);
  if (stream.status === "streaming" && !isRunning) {
    await db.update(streamsTable).set({ status: "idle", pid: null, updatedAt: new Date() }).where(eq(streamsTable.id, id));
    res.json({ id, status: "idle", activeKey: stream.activeKey, message: "Stream not running" });
    return;
  }
  const lastError = ffmpegLastError.get(id) ?? null;
  res.json({ id, status: stream.status, activeKey: stream.activeKey, message: isRunning ? "Running" : (lastError ? "Error" : "Idle"), pid: stream.pid, lastError });
});

router.post("/:id/switch-key", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [stream] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
  if (!stream) { res.status(404).json({ id, status: "error", activeKey: "primary", message: "Not found" }); return; }
  const currentKey = stream.activeKey as "primary" | "backup";
  const nextKey: "primary" | "backup" = currentKey === "primary" ? "backup" : "primary";
  const nextStreamKey = nextKey === "primary" ? stream.primaryStreamKey : (stream.backupStreamKey || stream.primaryStreamKey);
  const entry = activeProcesses.get(id);
  if (entry && stream.status === "streaming") {
    entry.process.kill("SIGTERM");
    try {
      const newProc = await startFFmpegProcess(id, stream.sourceUrl, stream.rtmpsUrl, nextStreamKey);
      entry.process = newProc;
      await db.update(streamsTable).set({ activeKey: nextKey, pid: newProc.pid || null, updatedAt: new Date() }).where(eq(streamsTable.id, id));
      res.json({ id, status: "streaming", activeKey: nextKey, message: `Switched to ${nextKey}`, pid: newProc.pid });
      return;
    } catch (err) { logger.error({ streamId: id, err }, "Key switch failed"); }
  }
  await db.update(streamsTable).set({ activeKey: nextKey, updatedAt: new Date() }).where(eq(streamsTable.id, id));
  res.json({ id, status: stream.status as "idle" | "streaming" | "error", activeKey: nextKey, message: `Active key set to ${nextKey}` });
});

export default router;
