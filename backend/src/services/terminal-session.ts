import * as pty from "node-pty";
import os from "os";
import fs from "fs";
import { config } from "../config/index.js";

// Find a working shell
function getShell(): string {
  if (os.platform() === "win32") {
    return "powershell.exe";
  }

  // Try shells in order of preference
  const shells = [
    process.env.SHELL,
    "/bin/zsh",
    "/bin/bash",
    "/bin/sh",
  ].filter(Boolean) as string[];

  for (const shell of shells) {
    try {
      if (fs.existsSync(shell)) {
        return shell;
      }
    } catch {
      continue;
    }
  }

  return "/bin/sh"; // Fallback
}

const shell = getShell();

export interface TerminalSession {
  id: string;
  pty: pty.IPty;
  cwd: string;
  createdAt: Date;
}

class TerminalSessionManager {
  private sessions: Map<string, TerminalSession> = new Map();

  create(
    sessionId: string,
    cwd: string = config.defaultWorkingDirectory,
    onData: (data: string) => void,
    onExit: (code: number) => void
  ): TerminalSession | null {
    // Kill existing session if it exists
    if (this.sessions.has(sessionId)) {
      this.kill(sessionId);
    }

    // Validate cwd exists, fallback to home directory
    let workingDir = cwd;
    try {
      if (!fs.existsSync(workingDir)) {
        workingDir = os.homedir();
      }
    } catch {
      workingDir = os.homedir();
    }

    console.log(`Spawning terminal with shell: ${shell}, cwd: ${workingDir}`);

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: workingDir,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });
    } catch (error) {
      console.error("Failed to spawn terminal:", error);
      onData(`\x1b[31mFailed to spawn terminal: ${error instanceof Error ? error.message : "Unknown error"}\x1b[0m\r\n`);
      onExit(1);
      return null;
    }

    // Handle data output
    ptyProcess.onData((data) => {
      onData(data);
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode }) => {
      this.sessions.delete(sessionId);
      onExit(exitCode);
    });

    const session: TerminalSession = {
      id: sessionId,
      pty: ptyProcess,
      cwd,
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.pty.write(data);
    return true;
  }

  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.pty.resize(cols, rows);
    return true;
  }

  kill(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.pty.kill();
    this.sessions.delete(sessionId);
    return true;
  }

  get(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  exists(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  getAll(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  cleanup(): void {
    for (const session of this.sessions.values()) {
      session.pty.kill();
    }
    this.sessions.clear();
  }
}

// Singleton instance
export const terminalManager = new TerminalSessionManager();

// Cleanup on process exit
process.on("exit", () => terminalManager.cleanup());
process.on("SIGINT", () => {
  terminalManager.cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  terminalManager.cleanup();
  process.exit(0);
});
