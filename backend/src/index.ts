import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { config, validateConfig } from "./config/index.js";
import { filesRouter } from "./routes/files.js";
import { agentRouter } from "./routes/agent.js";
import { setupTerminalWebSocket } from "./routes/terminal.js";
import { claudeTerminal } from "./services/claude-terminal.js";

// Validate configuration
validateConfig();

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      fileSystem: true,
      terminal: true,
      agent: !!config.anthropicApiKey,
      claudeTerminal: claudeTerminal.ready,
    },
  });
});

// API Routes
app.use("/api/files", filesRouter);
app.use("/api/agent", agentRouter);

// WebSocket server for terminal
const wss = new WebSocketServer({ server, path: "/terminal" });
setupTerminalWebSocket(wss);

// Start server
server.listen(config.port, async () => {
  console.log(`Backend server running at http://localhost:${config.port}`);
  console.log(`WebSocket terminal available at ws://localhost:${config.port}/terminal`);
  console.log(`CORS enabled for: ${config.corsOrigins.join(", ")}`);

  // Start persistent Claude Code terminal
  try {
    await claudeTerminal.start();
    console.log("Claude Code terminal started and ready for commands");
  } catch (error) {
    console.error("Failed to start Claude terminal:", error);
    console.log("Rate limits API will not be available until terminal is ready");
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  claudeTerminal.stop();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\nShutting down...");
  claudeTerminal.stop();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
