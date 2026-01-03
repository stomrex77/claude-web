import { spawn } from "child_process";
import os from "os";
import path from "path";

const shell = os.platform() === "win32" ? "powershell.exe" : "/bin/bash";
const shellArgs = os.platform() === "win32" ? [] : ["-c"];

interface BashInput {
  command: string;
  restart?: boolean;
}

// Timeout for command execution (30 seconds)
const COMMAND_TIMEOUT = 30000;

// Maximum output size (100KB)
const MAX_OUTPUT_SIZE = 100 * 1024;

export async function handleBashTool(
  input: BashInput,
  workingDirectory: string
): Promise<string> {
  if (input.restart) {
    return "Bash session restarted.";
  }

  if (!input.command) {
    return "Error: command is required";
  }

  // Expand ~ in working directory
  const cwd = workingDirectory.startsWith("~/")
    ? path.join(os.homedir(), workingDirectory.slice(2))
    : workingDirectory;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let killed = false;

    const args = os.platform() === "win32"
      ? ["-Command", input.command]
      : ["-c", input.command];

    const proc = spawn(shell, args, {
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
      },
      timeout: COMMAND_TIMEOUT,
    });

    // Handle stdout
    proc.stdout.on("data", (data: Buffer) => {
      const chunk = data.toString();
      if (stdout.length + chunk.length <= MAX_OUTPUT_SIZE) {
        stdout += chunk;
      } else if (!killed) {
        killed = true;
        proc.kill();
        stdout += "\n[Output truncated - exceeded maximum size]";
      }
    });

    // Handle stderr
    proc.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
      if (stderr.length + chunk.length <= MAX_OUTPUT_SIZE) {
        stderr += chunk;
      }
    });

    // Handle completion
    proc.on("close", (code) => {
      let output = "";

      if (stdout.trim()) {
        output += stdout;
      }

      if (stderr.trim()) {
        if (output) output += "\n";
        output += `STDERR:\n${stderr}`;
      }

      if (code !== 0 && code !== null) {
        if (output) output += "\n";
        output += `Exit code: ${code}`;
      }

      resolve(output || "(no output)");
    });

    // Handle errors
    proc.on("error", (error) => {
      resolve(`Error executing command: ${error.message}`);
    });

    // Timeout handler
    setTimeout(() => {
      if (!killed) {
        killed = true;
        proc.kill();
        resolve(`Command timed out after ${COMMAND_TIMEOUT / 1000} seconds`);
      }
    }, COMMAND_TIMEOUT);
  });
}
