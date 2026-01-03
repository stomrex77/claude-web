import { Router, Request, Response } from "express";
import { agentService } from "../services/claude-agent.js";
import { config } from "../config/index.js";
import type { AgentTaskRequest } from "../types/index.js";

export const agentRouter = Router();

// POST /api/agent/task - Execute a task
agentRouter.post("/task", async (req: Request, res: Response) => {
  try {
    const { task, sessionId, workingDirectory } = req.body as AgentTaskRequest;

    if (!task) {
      res.status(400).json({ error: "Task is required" });
      return;
    }

    if (!config.anthropicApiKey) {
      res.status(503).json({
        error: "Claude API not configured",
        message: "ANTHROPIC_API_KEY is not set",
      });
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

  if (!config.anthropicApiKey) {
    res.status(503).json({
      error: "Claude API not configured",
      message: "ANTHROPIC_API_KEY is not set",
    });
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
    res.json({
      id: session.id,
      workingDirectory: session.workingDirectory,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});
