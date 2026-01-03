import * as pty from "node-pty";
import { EventEmitter } from "events";

// Persistent Claude Code terminal service
class ClaudeTerminalService extends EventEmitter {
  private pty: pty.IPty | null = null;
  private isReady = false;
  private outputBuffer = "";
  private commandQueue: Array<{
    command: string;
    resolve: (output: string) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private currentCommand: typeof this.commandQueue[0] | null = null;

  constructor() {
    super();
  }

  // Initialize the persistent terminal
  async start(): Promise<void> {
    if (this.pty) {
      console.log("Claude terminal already running");
      return;
    }

    return new Promise((resolve, reject) => {
      console.log("Starting persistent Claude Code terminal...");

      this.pty = pty.spawn("claude", [], {
        name: "xterm-color",
        cols: 120,
        rows: 50,
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
      });

      const startupTimeout = setTimeout(() => {
        if (!this.isReady) {
          reject(new Error("Claude terminal startup timeout"));
        }
      }, 30000);

      this.pty.onData((data) => {
        this.outputBuffer += data;
        this.emit("data", data);

        // Check if terminal is ready (look for prompt indicators)
        if (!this.isReady && this.outputBuffer.includes("for shortcuts")) {
          this.isReady = true;
          clearTimeout(startupTimeout);
          console.log("Claude terminal ready");
          resolve();
          this.emit("ready");
        }

        // Check if current command completed
        this.checkCommandCompletion();
      });

      this.pty.onExit(({ exitCode }) => {
        console.log(`Claude terminal exited with code ${exitCode}`);
        this.isReady = false;
        this.pty = null;
        this.emit("exit", exitCode);

        // Reject any pending commands
        if (this.currentCommand) {
          this.currentCommand.reject(new Error("Terminal exited"));
          clearTimeout(this.currentCommand.timeout);
          this.currentCommand = null;
        }
        this.commandQueue.forEach((cmd) => {
          cmd.reject(new Error("Terminal exited"));
          clearTimeout(cmd.timeout);
        });
        this.commandQueue = [];

        // Auto-restart after 5 seconds
        setTimeout(() => {
          console.log("Auto-restarting Claude terminal...");
          this.start().catch(console.error);
        }, 5000);
      });
    });
  }

  // Check if the current command has completed
  private checkCommandCompletion() {
    if (!this.currentCommand) return;

    const { command, resolve, timeout } = this.currentCommand;

    // For /usage command, look for the usage output
    if (command === "/usage") {
      if (this.outputBuffer.includes("% used") && this.outputBuffer.includes("Resets")) {
        // Wait a bit more for complete output
        setTimeout(() => {
          clearTimeout(timeout);
          const output = this.outputBuffer;
          this.outputBuffer = "";
          this.currentCommand = null;
          resolve(output);

          // Send Escape to close the usage modal
          this.pty?.write("\x1b");

          // Process next command in queue
          this.processQueue();
        }, 1000);
      }
    }
  }

  // Process the next command in the queue
  private processQueue() {
    if (this.currentCommand || this.commandQueue.length === 0) return;

    this.currentCommand = this.commandQueue.shift()!;
    this.outputBuffer = "";
    this.executeCommand(this.currentCommand.command);
  }

  // Execute a command in the terminal
  private executeCommand(command: string) {
    if (!this.pty || !this.isReady) return;

    if (command.startsWith("/")) {
      // Slash command - need to type, wait for autocomplete, then Tab+Enter
      this.pty.write(command);
      setTimeout(() => {
        this.pty?.write("\t"); // Tab to select
        setTimeout(() => {
          this.pty?.write("\r"); // Enter to execute
        }, 200);
      }, 300);
    } else {
      // Regular text
      this.pty.write(command + "\r");
    }
  }

  // Run a command and get the output
  async runCommand(command: string, timeoutMs = 15000): Promise<string> {
    if (!this.pty || !this.isReady) {
      throw new Error("Claude terminal not ready");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove from queue or clear current command
        const idx = this.commandQueue.findIndex((c) => c.command === command);
        if (idx !== -1) {
          this.commandQueue.splice(idx, 1);
        }
        if (this.currentCommand?.command === command) {
          this.currentCommand = null;
          this.processQueue();
        }
        reject(new Error(`Command timeout: ${command}`));
      }, timeoutMs);

      this.commandQueue.push({ command, resolve, reject, timeout });
      this.processQueue();
    });
  }

  // Get /usage output
  async getUsage(): Promise<string> {
    return this.runCommand("/usage", 10000);
  }

  // Check if terminal is ready
  get ready(): boolean {
    return this.isReady;
  }

  // Stop the terminal
  stop() {
    if (this.pty) {
      this.pty.write("\x03\x03"); // Ctrl+C twice
      this.pty.write("/exit\r");
      setTimeout(() => {
        this.pty?.kill();
        this.pty = null;
        this.isReady = false;
      }, 500);
    }
  }

  // Write raw data to terminal
  write(data: string) {
    this.pty?.write(data);
  }

  // Resize terminal
  resize(cols: number, rows: number) {
    this.pty?.resize(cols, rows);
  }
}

// Singleton instance
export const claudeTerminal = new ClaudeTerminalService();
