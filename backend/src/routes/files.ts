import { Router, Request, Response } from "express";
import { config } from "../config/index.js";
import {
  buildDirectoryTree,
  validatePath,
  readFileContent,
} from "../services/file-system.js";

export const filesRouter = Router();

// GET /api/files/tree - Get directory tree
filesRouter.get("/tree", async (req: Request, res: Response) => {
  try {
    const inputPath = (req.query.path as string) || config.defaultWorkingDirectory;
    const depth = parseInt(req.query.depth as string) || config.maxTreeDepth;

    // Validate path first
    const validation = await validatePath(inputPath);
    if (!validation.valid) {
      res.status(400).json({
        error: "Invalid path",
        message: validation.error,
      });
      return;
    }

    const tree = await buildDirectoryTree(inputPath, depth);

    res.json({
      path: validation.absolutePath,
      tree,
    });
  } catch (error) {
    console.error("Error building directory tree:", error);
    res.status(500).json({
      error: "Failed to build directory tree",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/files/validate - Validate a path
filesRouter.post("/validate", async (req: Request, res: Response) => {
  try {
    const { path: inputPath } = req.body;

    if (!inputPath) {
      res.status(400).json({ error: "Path is required" });
      return;
    }

    const validation = await validatePath(inputPath);
    res.json(validation);
  } catch (error) {
    console.error("Error validating path:", error);
    res.status(500).json({
      error: "Failed to validate path",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/files/read - Read file content
filesRouter.get("/read", async (req: Request, res: Response) => {
  try {
    const inputPath = req.query.path as string;

    if (!inputPath) {
      res.status(400).json({ error: "Path is required" });
      return;
    }

    const fileData = await readFileContent(inputPath);
    res.json(fileData);
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({
      error: "Failed to read file",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
