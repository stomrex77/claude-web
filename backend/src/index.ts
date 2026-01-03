import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { config, validateConfig } from "./config/index.js";
import { filesRouter } from "./routes/files.js";
import { agentRouter } from "./routes/agent.js";
import { setupTerminalWebSocket } from "./routes/terminal.js";

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
server.listen(config.port, () => {
  console.log(`Backend server running at http://localhost:${config.port}`);
  console.log(`WebSocket terminal available at ws://localhost:${config.port}/terminal`);
  console.log(`CORS enabled for: ${config.corsOrigins.join(", ")}`);
});
