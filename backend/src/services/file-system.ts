import fs from "fs/promises";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import type { TreeNode, FileReadResponse, PathValidationResponse } from "../types/index.js";

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

// Validate and resolve a path
export async function validatePath(inputPath: string): Promise<PathValidationResponse> {
  try {
    const expanded = expandPath(inputPath);
    const absolutePath = path.resolve(expanded);

    const stats = await fs.stat(absolutePath);

    return {
      valid: true,
      absolutePath,
    };
  } catch (error) {
    return {
      valid: false,
      absolutePath: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Directories to skip (macOS protected, large, or system directories)
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  "__pycache__",
  ".git",
  "Library",
  "Photos Library.photoslibrary",
  "Photo Booth Library",
  ".Trash",
  "Applications",
]);

// Build directory tree recursively
export async function buildDirectoryTree(
  rootPath: string,
  maxDepth: number = 3,
  currentDepth: number = 0,
  basePath: string = ""
): Promise<TreeNode[]> {
  const expanded = expandPath(rootPath);
  const absolutePath = path.resolve(expanded);

  try {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    const nodes: TreeNode[] = [];

    // Sort: folders first, then files, alphabetically within each group
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      // Skip hidden files
      if (entry.name.startsWith(".") && entry.name !== ".env.example") {
        continue;
      }

      // Skip protected/large directories
      if (SKIP_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const entryPath = path.join(absolutePath, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : `/${entry.name}`;

      const node: TreeNode = {
        id: uuidv4(),
        name: entry.name,
        type: entry.isDirectory() ? "folder" : "file",
        path: relativePath,
      };

      // Recursively build children for directories
      if (entry.isDirectory() && currentDepth < maxDepth) {
        try {
          node.children = await buildDirectoryTree(
            entryPath,
            maxDepth,
            currentDepth + 1,
            relativePath
          );
        } catch {
          // If we can't read a directory (permissions), skip its children silently
          node.children = [];
        }
      } else if (entry.isDirectory()) {
        // At max depth, indicate there might be children
        node.children = [];
      }

      nodes.push(node);
    }

    return nodes;
  } catch (error) {
    // Only log if it's not a permission error
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EPERM" && code !== "EACCES") {
      console.error(`Error reading directory ${absolutePath}:`, error);
    }
    return [];
  }
}

// Read file content
export async function readFileContent(filePath: string): Promise<FileReadResponse> {
  const expanded = expandPath(filePath);
  const absolutePath = path.resolve(expanded);

  const stats = await fs.stat(absolutePath);

  if (stats.isDirectory()) {
    throw new Error("Path is a directory, not a file");
  }

  // Check file size (limit to 1MB for safety)
  if (stats.size > 1024 * 1024) {
    throw new Error("File too large (max 1MB)");
  }

  const content = await fs.readFile(absolutePath, "utf-8");

  return {
    content,
    size: stats.size,
    modified: stats.mtime.toISOString(),
    path: absolutePath,
  };
}

// Write file content
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  const expanded = expandPath(filePath);
  const absolutePath = path.resolve(expanded);

  // Ensure parent directory exists
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  await fs.writeFile(absolutePath, content, "utf-8");
}

// Create directory
export async function createDirectory(dirPath: string): Promise<void> {
  const expanded = expandPath(dirPath);
  const absolutePath = path.resolve(expanded);

  await fs.mkdir(absolutePath, { recursive: true });
}

// Check if path exists
export async function pathExists(inputPath: string): Promise<boolean> {
  try {
    const expanded = expandPath(inputPath);
    await fs.access(path.resolve(expanded));
    return true;
  } catch {
    return false;
  }
}

// Get file/directory stats
export async function getStats(inputPath: string) {
  const expanded = expandPath(inputPath);
  const absolutePath = path.resolve(expanded);
  return fs.stat(absolutePath);
}
