import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { streamsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { spawn, type ChildProcess } from "child_process";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const activeProcesses = new Map<number, { process: ChildProcess; switchTimer?: ReturnType<typeof setInterval> }>();

function buildFFmpegArgs(sourceUrl: string, rtmpUrl: string, streamKey: string): string[] {
  const destination = `${rtmpUrl}${streamKey}`;
  return [
    "-re",
    "-i", sourceUrl,
    "-c", "copy",
    "-c:a", "aac",
    "-ar", "44100",
    "-b:a", "128k",
    "-f", "flv",
    "-flvflags", "no_duration_filesize",
    "-metadata", "title=",
    "-metadata", "copyright=",
    destination,
  ];
}

async function startFFmpegProcess(streamId: number, sourceUrl: string, rtmpUrl: string, streamKey: string): Promise<ChildProcess> {
  const args = buildFFmpegArgs(sourceUrl, rtmpUrl, streamKey);
  logger.info({ streamId, args: args.join(" ") }, "Starting FFmpeg process");

  const proc = spawn("ffmpeg", args, {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  proc.stderr?.on("data", (data: Buffer) => {
    logger.debug({ streamId, stderr: data.toString() }, "FFmpeg stderr");
  });

  proc.on("exit", async (code, signal) => {
    logger.info({ streamId, code, signal }, "FFmpeg process exited");
    const entry = activeProcesses.get(streamId);
    if (entry?.switchTimer) {
      clearInterval(entry.switchTimer);
    }
    activeProcesses.delete(streamId);
    try {
      await db.update(streamsTable)
        .set({ status: "idle", pid: null, updatedAt: new Date() })
        .where(eq(streamsTable.id, streamId));
    } catch (err) {
      logger.error({ streamId, err }, "Failed to update stream status on exit");
    }
  });

  return proc;
}

router.get("/", async (_req, res) => {
  const streams = await db.select().from(streamsTable);
  res.json(streams.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const { name, sourceUrl, primaryStreamKey, backupStreamKey, rtmpUrl, switchInterval, copyrightProtection } = req.body;

  if (!name || !sourceUrl || !primaryStreamKey || !rtmpUrl) {
    res.status(400).json({ error: "name, sourceUrl, primaryStreamKey, rtmpUrl are required" });
    return;
  }

  const [stream] = await db.insert(streamsTable).values({
    name,
    sourceUrl,
    primaryStreamKey,
    backupStreamKey: backupStreamKey || null,
    rtmpUrl,
    switchInterval: switchInterval ?? 0,
    copyrightProtection: copyrightProtection ?? true,
    status: "idle",
    activeKey: "primary",
  }).returning();

  res.status(201).json({
    ...stream,
    createdAt: stream.createdAt.toISOString(),
    updatedAt: stream.updatedAt.toISOString(),
  });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [stream] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
  if (!stream) {
    res.status(404).json({ error: "Stream not found" });
    return;
  }
  res.json({ ...stream, createdAt: stream.createdAt.toISOString(), updatedAt: stream.updatedAt.toISOString() });
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, sourceUrl, primaryStreamKey, backupStreamKey, rtmpUrl, switchInterval, copyrightProtection } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (sourceUrl !== undefined) updates.sourceUrl = sourceUrl;
  if (primaryStreamKey !== undefined) updates.primaryStreamKey = primaryStreamKey;
  if (backupStreamKey !== undefined) updates.backupStreamKey = backupStreamKey;
  if (rtmpUrl !== undefined) updates.rtmpUrl = rtmpUrl;
  if (switchInterval !== undefined) updates.switchInterval = switchInterval;
  if (copyrightProtection !== undefined) updates.copyrightProtection = copyrightProtection;

  const [stream] = await db.update(streamsTable).set(updates).where(eq(streamsTable.id, id)).returning();
  if (!stream) {
    res.status(404).json({ error: "Stream not found" });
    return;
  }
  res.json({ ...stream, createdAt: stream.createdAt.toISOString(), updatedAt: stream.updatedAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const entry = activeProcesses.get(id);
  if (entry) {
    if (entry.switchTimer) clearInterval(entry.switchTimer);
    entry.process.kill("SIGKILL");
    activeProcesses.delete(id);
  }
  const [deleted] = await db.delete(streamsTable).where(eq(streamsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ success: false, message: "Stream not found" });
    return;
  }
  res.json({ success: true, message: "Stream deleted" });
});

router.post("/:id/start", async (req, res) => {
  const id = parseInt(req.params.id);
  const [stream] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
  if (!stream) {
    res.status(404).json({ id, status: "error", activeKey: "primary", message: "Stream not found" });
    return;
  }

  if (activeProcesses.has(id)) {
    res.json({ id, status: stream.status, activeKey: stream.activeKey, message: "Stream already running", pid: stream.pid });
    return;
  }

  const activeKey = stream.activeKey as "primary" | "backup";
  const streamKey = activeKey === "primary" ? stream.primaryStreamKey : (stream.backupStreamKey || stream.primaryStreamKey);

  try {
    const proc = await startFFmpegProcess(id, stream.sourceUrl, stream.rtmpUrl, streamKey);
    const entry: { process: ChildProcess; switchTimer?: ReturnType<typeof setInterval> } = { process: proc };

    if (stream.copyrightProtection && stream.backupStreamKey && stream.switchInterval > 0) {
      let currentKey: "primary" | "backup" = "primary";
      entry.switchTimer = setInterval(async () => {
        const nextKey: "primary" | "backup" = currentKey === "primary" ? "backup" : "primary";
        const existingEntry = activeProcesses.get(id);
        if (!existingEntry) return;

        const [currentStream] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
        if (!currentStream) return;

        const nextStreamKey = nextKey === "primary" ? currentStream.primaryStreamKey : (currentStream.backupStreamKey || currentStream.primaryStreamKey);
        existingEntry.process.kill("SIGTERM");

        try {
          const newProc = await startFFmpegProcess(id, currentStream.sourceUrl, currentStream.rtmpUrl, nextStreamKey);
          existingEntry.process = newProc;
          currentKey = nextKey;
          await db.update(streamsTable).set({ activeKey: nextKey, updatedAt: new Date() }).where(eq(streamsTable.id, id));
          logger.info({ streamId: id, newKey: nextKey }, "Auto-switched stream key for copyright protection");
        } catch (err) {
          logger.error({ streamId: id, err }, "Failed to switch stream key");
        }
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

router.post("/:id/stop", async (req, res) => {
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

router.get("/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const [stream] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
  if (!stream) {
    res.status(404).json({ id, status: "error", activeKey: "primary", message: "Stream not found" });
    return;
  }
  const isRunning = activeProcesses.has(id);
  if (stream.status === "streaming" && !isRunning) {
    await db.update(streamsTable).set({ status: "idle", pid: null, updatedAt: new Date() }).where(eq(streamsTable.id, id));
    res.json({ id, status: "idle", activeKey: stream.activeKey, message: "Stream not running" });
    return;
  }
  res.json({ id, status: stream.status, activeKey: stream.activeKey, message: isRunning ? "Stream is running" : "Stream is idle", pid: stream.pid });
});

router.post("/:id/switch-key", async (req, res) => {
  const id = parseInt(req.params.id);
  const [stream] = await db.select().from(streamsTable).where(eq(streamsTable.id, id));
  if (!stream) {
    res.status(404).json({ id, status: "error", activeKey: "primary", message: "Stream not found" });
    return;
  }

  const currentKey = stream.activeKey as "primary" | "backup";
  const nextKey: "primary" | "backup" = currentKey === "primary" ? "backup" : "primary";
  const nextStreamKey = nextKey === "primary" ? stream.primaryStreamKey : (stream.backupStreamKey || stream.primaryStreamKey);

  const entry = activeProcesses.get(id);
  if (entry && stream.status === "streaming") {
    entry.process.kill("SIGTERM");
    try {
      const newProc = await startFFmpegProcess(id, stream.sourceUrl, stream.rtmpUrl, nextStreamKey);
      entry.process = newProc;
      await db.update(streamsTable).set({ activeKey: nextKey, pid: newProc.pid || null, updatedAt: new Date() }).where(eq(streamsTable.id, id));
      logger.info({ streamId: id, newKey: nextKey }, "Manually switched stream key");
      res.json({ id, status: "streaming", activeKey: nextKey, message: `Switched to ${nextKey} key`, pid: newProc.pid });
      return;
    } catch (err) {
      logger.error({ streamId: id, err }, "Failed to switch stream key");
    }
  }

  await db.update(streamsTable).set({ activeKey: nextKey, updatedAt: new Date() }).where(eq(streamsTable.id, id));
  res.json({ id, status: stream.status as "idle" | "streaming" | "error", activeKey: nextKey, message: `Active key set to ${nextKey}` });
});

export default router;
