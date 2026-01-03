import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
  defaultWorkingDirectory: process.env.DEFAULT_WORKING_DIR || process.cwd(),
  maxTreeDepth: parseInt(process.env.MAX_TREE_DEPTH || "5", 10),
};

// Validate required config
export function validateConfig(): void {
  if (!config.anthropicApiKey) {
    console.warn("Warning: ANTHROPIC_API_KEY is not set. Agent features will not work.");
  }
}
