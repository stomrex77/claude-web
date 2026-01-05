import { Router, Request, Response } from "express";
import { agentService } from "../services/claude-agent.js";
import { getCachedClaudeUsage } from "../services/claude-usage.js";
import { config } from "../config/index.js";
import type { AgentTaskRequest } from "../types/index.js";

export const agentRouter = Router();

// GET /api/agent/sessions - List all sessions with filtering and pagination
agentRouter.get("/sessions", (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const includeWarmup = req.query.includeWarmup === "true";
    const minMessages = parseInt(req.query.minMessages as string) || 2;

    let sessions = agentService.listSessions();

    // Filter out warmup sessions and sessions with too few messages
    if (!includeWarmup) {
      sessions = sessions.filter((s) => {
        const isWarmup = s.title.toLowerCase().includes("warmup");
        const hasFewMessages = s.messageCount < minMessages;
        return !isWarmup && !hasFewMessages;
      });
    }

    // Calculate pagination
    const total = sessions.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedSessions = sessions.slice(offset, offset + limit);

    res.json({
      sessions: paginatedSessions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error listing sessions:", error);
    res.status(500).json({
      error: "Failed to list sessions",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/agent/usage - Get total token usage
agentRouter.get("/usage", (_req: Request, res: Response) => {
  try {
    const usage = agentService.getTotalUsage();
    res.json(usage);
  } catch (error) {
    console.error("Error getting usage:", error);
    res.status(500).json({
      error: "Failed to get usage",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/agent/task - Execute a task
agentRouter.post("/task", async (req: Request, res: Response) => {
  try {
    const { task, sessionId, workingDirectory } = req.body as AgentTaskRequest;

    if (!task) {
      res.status(400).json({ error: "Task is required" });
      return;
    }

    const result = await agentService.executeTask(
      task,
      sessionId,
      workingDirectory || config.defaultWorkingDirectory
    );

    res.json(result);
  } catch (error) {
    console.error("Error executing agent task:", error);
    res.status(500).json({
      error: "Failed to execute task",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/agent/stream - Stream a task execution (SSE)
agentRouter.get("/stream", async (req: Request, res: Response) => {
  const task = req.query.task as string;
  const sessionId = req.query.sessionId as string | undefined;
  const workingDirectory = (req.query.cwd as string) || config.defaultWorkingDirectory;

  if (!task) {
    res.status(400).json({ error: "Task query parameter is required" });
    return;
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  try {
    for await (const event of agentService.streamTask(task, sessionId, workingDirectory)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    console.error("Error streaming agent task:", error);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        data: { message: error instanceof Error ? error.message : "Unknown error" },
      })}\n\n`
    );
  }

  res.end();
});

// DELETE /api/agent/session/:sessionId - Clear a session
agentRouter.delete("/session/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const deleted = agentService.clearSession(sessionId);

  if (deleted) {
    res.json({ success: true, message: "Session cleared" });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// GET /api/agent/session/:sessionId - Get session info
agentRouter.get("/session/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = agentService.getSession(sessionId);

  if (session) {
    res.json(session);
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// GET /api/agent/session/:sessionId/messages - Get session messages
agentRouter.get("/session/:sessionId/messages", (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    const messages = agentService.getSessionMessages(sessionId);
    res.json({ messages });
  } catch (error) {
    console.error("Error getting session messages:", error);
    res.status(500).json({
      error: "Failed to get session messages",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/agent/stats - Get Claude Code stats
agentRouter.get("/stats", (_req: Request, res: Response) => {
  try {
    const stats = agentService.getClaudeCodeStats();
    if (stats) {
      res.json(stats);
    } else {
      res.status(404).json({ error: "Claude Code stats not found" });
    }
  } catch (error) {
    console.error("Error getting Claude Code stats:", error);
    res.status(500).json({
      error: "Failed to get stats",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/agent/rate-limits - Get Claude Code rate limit usage (from /usage command)
agentRouter.get("/rate-limits", async (_req: Request, res: Response) => {
  try {
    const usage = await getCachedClaudeUsage();
    res.json(usage);
  } catch (error) {
    console.error("Error getting rate limits:", error);
    res.status(500).json({
      error: "Failed to get rate limits",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
