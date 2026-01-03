import { claudeTerminal } from "./claude-terminal.js";

// Usage data from /usage command
export interface UsageLimit {
  name: string;
  percentUsed: number;
  resetTime: string;
  resetTimezone?: string;
}

export interface ClaudeUsageData {
  currentSession: UsageLimit | null;
  currentWeekAllModels: UsageLimit | null;
  currentWeekSonnetOnly: UsageLimit | null;
  rawOutput?: string;
  timestamp: string;
}

// Parse percentage from progress bar like "███████████████░░░░░░░░░░░░  30% used"
function parsePercentage(line: string): number {
  const match = line.match(/(\d+)%\s*used/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

// Parse reset time like "Resets 7:59am (America/New_York)" or "Resets Jan 9 at 9:59pm (America/New_York)"
function parseResetTime(line: string): { time: string; timezone?: string } {
  const match = line.match(/Resets?\s+(.+?)\s*\(([^)]+)\)/i);
  if (match) {
    return { time: match[1].trim(), timezone: match[2] };
  }
  const simpleMatch = line.match(/Resets?\s+(.+)/i);
  if (simpleMatch) {
    return { time: simpleMatch[1].trim() };
  }
  return { time: "" };
}

// Parse the raw output from /usage command
function parseUsageOutput(output: string): ClaudeUsageData {
  const result: ClaudeUsageData = {
    currentSession: null,
    currentWeekAllModels: null,
    currentWeekSonnetOnly: null,
    timestamp: new Date().toISOString(),
  };

  // Clean ANSI codes for parsing
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "").replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  const lines = cleanOutput.split("\n");

  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect sections
    if (line.includes("Current session")) {
      currentSection = "session";
    } else if (line.includes("Current week") && line.includes("all models")) {
      currentSection = "weekAll";
    } else if (line.includes("Current week") && line.includes("Sonnet")) {
      currentSection = "weekSonnet";
    }

    // Parse percentage lines
    if (line.includes("% used")) {
      const percent = parsePercentage(line);
      const nextLine = lines[i + 1]?.trim() || "";
      const resetInfo = parseResetTime(nextLine);

      const limitData: UsageLimit = {
        name:
          currentSection === "session"
            ? "Current Session"
            : currentSection === "weekAll"
              ? "Weekly (All Models)"
              : "Weekly (Sonnet Only)",
        percentUsed: percent,
        resetTime: resetInfo.time,
        resetTimezone: resetInfo.timezone,
      };

      if (currentSection === "session") {
        result.currentSession = limitData;
      } else if (currentSection === "weekAll") {
        result.currentWeekAllModels = limitData;
      } else if (currentSection === "weekSonnet") {
        result.currentWeekSonnetOnly = limitData;
      }
    }
  }

  return result;
}

// Get usage from persistent terminal (instant)
export async function getClaudeUsage(): Promise<ClaudeUsageData> {
  if (!claudeTerminal.ready) {
    throw new Error("Claude terminal not ready. Please wait for it to start.");
  }

  const output = await claudeTerminal.getUsage();
  return parseUsageOutput(output);
}

// Cache for usage data (refresh every 30 seconds)
let cachedUsage: ClaudeUsageData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function getCachedClaudeUsage(): Promise<ClaudeUsageData> {
  const now = Date.now();

  if (cachedUsage && now - cacheTimestamp < CACHE_TTL) {
    return cachedUsage;
  }

  try {
    cachedUsage = await getClaudeUsage();
    cacheTimestamp = now;
    return cachedUsage;
  } catch (error) {
    // Return cached data if available, even if expired
    if (cachedUsage) {
      return cachedUsage;
    }
    throw error;
  }
}
