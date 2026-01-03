import fs from "fs/promises";
import path from "path";
import os from "os";

// Expand ~ to home directory
function expandPath(inputPath: string): string {
  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  if (inputPath === "~") {
    return os.homedir();
  }
  return inputPath;
}

interface TextEditorInput {
  command: "view" | "create" | "str_replace" | "insert";
  path: string;
  file_text?: string;
  old_str?: string;
  new_str?: string;
  insert_line?: number;
  view_range?: [number, number];
}

export async function handleTextEditorTool(input: TextEditorInput): Promise<string> {
  const filePath = path.resolve(expandPath(input.path));

  switch (input.command) {
    case "view": {
      try {
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          // List directory contents
          const entries = await fs.readdir(filePath, { withFileTypes: true });
          const list = entries.map((e) => {
            const prefix = e.isDirectory() ? "[DIR]  " : "[FILE] ";
            return prefix + e.name;
          });
          return `Directory listing for ${filePath}:\n${list.join("\n")}`;
        }

        // Read file content
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");

        // Handle view_range if specified
        if (input.view_range) {
          const [start, end] = input.view_range;
          const startIdx = Math.max(0, start - 1);
          const endIdx = Math.min(lines.length, end);
          const selectedLines = lines.slice(startIdx, endIdx);
          return selectedLines
            .map((line, i) => `${startIdx + i + 1}\t${line}`)
            .join("\n");
        }

        // Return full file with line numbers
        return lines.map((line, i) => `${i + 1}\t${line}`).join("\n");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return `Error: File or directory not found: ${filePath}`;
        }
        throw error;
      }
    }

    case "create": {
      if (!input.file_text) {
        return "Error: file_text is required for create command";
      }

      // Ensure parent directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Check if file already exists
      try {
        await fs.access(filePath);
        return `Error: File already exists: ${filePath}. Use str_replace to modify it.`;
      } catch {
        // File doesn't exist, proceed with creation
      }

      await fs.writeFile(filePath, input.file_text, "utf-8");
      return `Successfully created ${filePath}`;
    }

    case "str_replace": {
      if (input.old_str === undefined || input.new_str === undefined) {
        return "Error: old_str and new_str are required for str_replace command";
      }

      try {
        const content = await fs.readFile(filePath, "utf-8");

        // Count occurrences
        const occurrences = content.split(input.old_str).length - 1;

        if (occurrences === 0) {
          return `Error: old_str not found in file. Make sure the text matches exactly, including whitespace.`;
        }

        if (occurrences > 1) {
          return `Error: old_str appears ${occurrences} times in file. It must be unique. Add more context to make it unique.`;
        }

        // Perform replacement
        const newContent = content.replace(input.old_str, input.new_str);
        await fs.writeFile(filePath, newContent, "utf-8");

        return `Successfully replaced text in ${filePath}`;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return `Error: File not found: ${filePath}`;
        }
        throw error;
      }
    }

    case "insert": {
      if (input.insert_line === undefined || input.new_str === undefined) {
        return "Error: insert_line and new_str are required for insert command";
      }

      try {
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");

        // Insert at the specified line (1-indexed)
        const insertIdx = Math.max(0, Math.min(lines.length, input.insert_line - 1));
        lines.splice(insertIdx, 0, input.new_str);

        await fs.writeFile(filePath, lines.join("\n"), "utf-8");
        return `Successfully inserted text at line ${input.insert_line} in ${filePath}`;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return `Error: File not found: ${filePath}`;
        }
        throw error;
      }
    }

    default:
      return `Error: Unknown command: ${(input as TextEditorInput).command}`;
  }
}
