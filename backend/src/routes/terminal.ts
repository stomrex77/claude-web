import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { terminalManager } from "../services/terminal-session.js";
import { config } from "../config/index.js";
import type { TerminalClientMessage } from "../types/index.js";

export function setupTerminalWebSocket(wss: WebSocketServer): void {
  wss.on("connection", (ws: WebSocket, req) => {
    // Parse query params for initial config
    const url = new URL(req.url || "", `http://localhost:${config.port}`);
    const cwd = url.searchParams.get("cwd") || config.defaultWorkingDirectory;
    const sessionId = url.searchParams.get("sessionId") || uuidv4();

    console.log(`Terminal WebSocket connected: ${sessionId}`);

    // Create terminal session
    const session = terminalManager.create(
      sessionId,
      cwd,
      // onData - send output to client
      (data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "output",
            data,
          }));
        }
      },
      // onExit - notify client and close
      (code: number) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "exit",
            code,
          }));
          ws.close();
        }
      }
    );

    // Handle failed session creation
    if (!session) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Failed to create terminal session",
      }));
      ws.close();
      return;
    }

    // Send session info to client
    ws.send(JSON.stringify({
      type: "connected",
      sessionId: session.id,
      cwd: session.cwd,
    }));

    // Handle messages from client
    ws.on("message", (rawData) => {
      try {
        const message: TerminalClientMessage = JSON.parse(rawData.toString());

        switch (message.type) {
          case "input":
            terminalManager.write(sessionId, message.data);
            break;

          case "resize":
            terminalManager.resize(sessionId, message.cols, message.rows);
            break;

          default:
            console.warn("Unknown terminal message type:", message);
        }
      } catch (error) {
        console.error("Error parsing terminal message:", error);
      }
    });

    // Handle disconnect
    ws.on("close", () => {
      console.log(`Terminal WebSocket disconnected: ${sessionId}`);
      terminalManager.kill(sessionId);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`Terminal WebSocket error for ${sessionId}:`, error);
      terminalManager.kill(sessionId);
    });
  });

  console.log("Terminal WebSocket server initialized");
}
