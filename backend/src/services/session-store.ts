import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Chat message for conversation display
export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Session metadata for dashboard display
export interface SessionMetadata {
  id: string;
  title: string;
  directory: string;
  messageCount: number;
  createdAt: string;
  lastActivity: string;
  totalTokens: {
    input: number;
    output: number;
  };
  totalCostUsd: number;
}

// Model-specific usage tracking
export interface ModelUsageData {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  costUSD: number;
}

// Claude Code stats-cache.json structure
export interface ClaudeCodeStatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: Array<{
    date: string;
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
  }>;
  modelUsage: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    costUSD: number;
  }>;
  totalSessions: number;
  totalMessages: number;
  firstSessionDate?: string;
}

// Claude Code session message structure
interface ClaudeCodeMessage {
  type: "user" | "assistant" | "summary" | "file-history-snapshot";
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
  message?: {
    role: string;
    content: string | Array<{ type: string; text?: string; thinking?: string }>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  summary?: string;
  slug?: string;
}

const STORAGE_DIR = path.join(os.homedir(), ".claude-web");
const STORAGE_FILE = path.join(STORAGE_DIR, "sessions.json");
const CLAUDE_CODE_DIR = path.join(os.homedir(), ".claude");
const CLAUDE_CODE_STATS = path.join(CLAUDE_CODE_DIR, "stats-cache.json");
const CLAUDE_CODE_PROJECTS = path.join(CLAUDE_CODE_DIR, "projects");

class SessionStore {
  private sessions: Map<string, SessionMetadata> = new Map();

  constructor() {
    this.load();
  }

  private ensureDir(): void {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  private load(): void {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const data = fs.readFileSync(STORAGE_FILE, "utf-8");
        const parsed = JSON.parse(data) as SessionMetadata[];
        for (const session of parsed) {
          this.sessions.set(session.id, session);
        }
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  }

  private save(): void {
    try {
      this.ensureDir();
      const data = Array.from(this.sessions.values());
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save sessions:", error);
    }
  }

  // Generate title from first prompt (truncated)
  private generateTitle(prompt: string): string {
    const maxLength = 50;
    const cleaned = prompt.replace(/\s+/g, " ").trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return cleaned.substring(0, maxLength) + "...";
  }

  // Create or update a session
  upsert(
    id: string,
    prompt: string,
    directory: string,
    usage?: { input: number; output: number; costUsd?: number }
  ): SessionMetadata {
    const existing = this.sessions.get(id);
    const now = new Date().toISOString();

    if (existing) {
      // Update existing session
      existing.messageCount += 1;
      existing.lastActivity = now;
      if (usage) {
        existing.totalTokens.input += usage.input;
        existing.totalTokens.output += usage.output;
        existing.totalCostUsd += usage.costUsd || 0;
      }
      this.save();
      return existing;
    }

    // Create new session
    const session: SessionMetadata = {
      id,
      title: this.generateTitle(prompt),
      directory,
      messageCount: 1,
      createdAt: now,
      lastActivity: now,
      totalTokens: usage ? { input: usage.input, output: usage.output } : { input: 0, output: 0 },
      totalCostUsd: usage?.costUsd || 0,
    };

    this.sessions.set(id, session);
    this.save();
    return session;
  }

  // Update usage for a session
  updateUsage(id: string, usage: { input: number; output: number; costUsd?: number }): void {
    const session = this.sessions.get(id);
    if (session) {
      session.totalTokens.input += usage.input;
      session.totalTokens.output += usage.output;
      session.totalCostUsd += usage.costUsd || 0;
      session.lastActivity = new Date().toISOString();
      this.save();
    }
  }

  // Get a session by ID
  get(id: string): SessionMetadata | undefined {
    return this.sessions.get(id);
  }

  // List all sessions, sorted by last activity (most recent first)
  listAll(): SessionMetadata[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  // Delete a session
  delete(id: string): boolean {
    const result = this.sessions.delete(id);
    if (result) {
      this.save();
    }
    return result;
  }

  // Get total usage across all sessions (including Claude Code stats)
  getTotalUsage(): { input: number; output: number; costUsd: number } {
    // Try to read from Claude Code's stats-cache.json first
    const claudeCodeUsage = this.getClaudeCodeUsage();
    if (claudeCodeUsage) {
      return claudeCodeUsage;
    }

    // Fallback to our own session tracking
    let input = 0;
    let output = 0;
    let costUsd = 0;
    for (const session of this.sessions.values()) {
      input += session.totalTokens.input;
      output += session.totalTokens.output;
      costUsd += session.totalCostUsd;
    }
    return { input, output, costUsd };
  }

  // Read Claude Code's stats-cache.json for usage data
  getClaudeCodeUsage(): { input: number; output: number; costUsd: number } | null {
    try {
      if (!fs.existsSync(CLAUDE_CODE_STATS)) {
        return null;
      }
      const data = fs.readFileSync(CLAUDE_CODE_STATS, "utf-8");
      const stats: ClaudeCodeStatsCache = JSON.parse(data);

      let input = 0;
      let output = 0;
      let costUsd = 0;

      // Aggregate usage across all models
      for (const modelData of Object.values(stats.modelUsage || {})) {
        input += modelData.inputTokens + modelData.cacheReadInputTokens + modelData.cacheCreationInputTokens;
        output += modelData.outputTokens;
        costUsd += modelData.costUSD || 0;
      }

      return { input, output, costUsd };
    } catch (error) {
      console.error("Failed to read Claude Code stats:", error);
      return null;
    }
  }

  // Get Claude Code stats metadata
  getClaudeCodeStats(): ClaudeCodeStatsCache | null {
    try {
      if (!fs.existsSync(CLAUDE_CODE_STATS)) {
        return null;
      }
      const data = fs.readFileSync(CLAUDE_CODE_STATS, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to read Claude Code stats:", error);
      return null;
    }
  }

  // List all Claude Code sessions from ~/.claude/projects/
  listClaudeCodeSessions(): SessionMetadata[] {
    const sessions: SessionMetadata[] = [];

    try {
      if (!fs.existsSync(CLAUDE_CODE_PROJECTS)) {
        return sessions;
      }

      // Get all project directories
      const projectDirs = fs.readdirSync(CLAUDE_CODE_PROJECTS);

      for (const projectDir of projectDirs) {
        const projectPath = path.join(CLAUDE_CODE_PROJECTS, projectDir);
        const stat = fs.statSync(projectPath);

        if (!stat.isDirectory()) continue;

        // Get all session files in this project
        const files = fs.readdirSync(projectPath);
        const sessionFiles = files.filter(f => f.endsWith(".jsonl"));

        for (const sessionFile of sessionFiles) {
          const sessionPath = path.join(projectPath, sessionFile);
          const sessionMeta = this.parseClaudeCodeSession(sessionPath, projectDir);
          if (sessionMeta) {
            sessions.push(sessionMeta);
          }
        }
      }

      // Sort by last activity (most recent first)
      sessions.sort((a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );

    } catch (error) {
      console.error("Failed to list Claude Code sessions:", error);
    }

    return sessions;
  }

  // Parse a Claude Code session file to extract metadata
  private parseClaudeCodeSession(filePath: string, projectDir: string): SessionMetadata | null {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.trim().split("\n");

      if (lines.length === 0) return null;

      let title = "";
      let cwd = "";
      let messageCount = 0;
      let firstTimestamp = "";
      let lastTimestamp = "";
      let inputTokens = 0;
      let outputTokens = 0;
      let cacheReadTokens = 0;
      let cacheCreationTokens = 0;

      for (const line of lines) {
        try {
          const msg: ClaudeCodeMessage = JSON.parse(line);

          // Skip file-history-snapshot entries
          if (msg.type === "file-history-snapshot") continue;

          // Extract working directory
          if (msg.cwd && !cwd) {
            cwd = msg.cwd;
          }

          // Track timestamps
          if (msg.timestamp) {
            if (!firstTimestamp) firstTimestamp = msg.timestamp;
            lastTimestamp = msg.timestamp;
          }

          // Count user messages only (for conversation turns)
          if (msg.type === "user") {
            messageCount++;
          }

          // Extract title from first user message or summary
          if (!title && msg.type === "summary" && msg.summary) {
            title = msg.summary;
          } else if (!title && msg.type === "user" && msg.message?.content) {
            const msgContent = msg.message.content;
            if (typeof msgContent === "string" && !msgContent.includes("<command-name>")) {
              title = msgContent.slice(0, 60) + (msgContent.length > 60 ? "..." : "");
            } else if (Array.isArray(msgContent)) {
              const textBlock = msgContent.find(b => b.type === "text" && b.text);
              if (textBlock?.text) {
                title = textBlock.text.slice(0, 60) + (textBlock.text.length > 60 ? "..." : "");
              }
            }
          }

          // Extract token usage from assistant messages
          if (msg.type === "assistant" && msg.message?.usage) {
            const usage = msg.message.usage;
            inputTokens += usage.input_tokens || 0;
            outputTokens += usage.output_tokens || 0;
            cacheReadTokens += usage.cache_read_input_tokens || 0;
            cacheCreationTokens += usage.cache_creation_input_tokens || 0;
          }
        } catch {
          // Skip malformed lines
        }
      }

      // Always use filename as the unique ID (not sessionId from content)
      // This matches how Claude Code's /resume works - each file is a separate entry
      const fileId = path.basename(filePath, ".jsonl");

      // Convert project dir name back to path
      const directory = cwd || projectDir.replace(/-/g, "/");

      // Total input includes cache tokens
      const totalInput = inputTokens + cacheReadTokens + cacheCreationTokens;

      return {
        id: fileId,
        title: title || "Untitled conversation",
        directory,
        messageCount,
        createdAt: firstTimestamp || new Date().toISOString(),
        lastActivity: lastTimestamp || new Date().toISOString(),
        totalTokens: { input: totalInput, output: outputTokens },
        totalCostUsd: 0, // Cost not stored in session files
      };
    } catch (error) {
      console.error(`Failed to parse session file ${filePath}:`, error);
      return null;
    }
  }

  // Find the file path for a session ID
  private findSessionFile(sessionId: string): string | null {
    try {
      if (!fs.existsSync(CLAUDE_CODE_PROJECTS)) {
        return null;
      }

      // Search through all project directories
      const projectDirs = fs.readdirSync(CLAUDE_CODE_PROJECTS);

      for (const projectDir of projectDirs) {
        const projectPath = path.join(CLAUDE_CODE_PROJECTS, projectDir);
        const stat = fs.statSync(projectPath);

        if (!stat.isDirectory()) continue;

        // Look for the session file
        const sessionFile = path.join(projectPath, `${sessionId}.jsonl`);
        if (fs.existsSync(sessionFile)) {
          return sessionFile;
        }
      }

      return null;
    } catch (error) {
      console.error("Error finding session file:", error);
      return null;
    }
  }

  // Get messages for a session
  getSessionMessages(sessionId: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    try {
      const sessionFile = this.findSessionFile(sessionId);
      if (!sessionFile) {
        console.error(`Session file not found for: ${sessionId}`);
        return messages;
      }

      const content = fs.readFileSync(sessionFile, "utf-8");
      const lines = content.trim().split("\n");

      let messageIndex = 0;

      for (const line of lines) {
        try {
          const msg: ClaudeCodeMessage = JSON.parse(line);

          // Only include user and assistant messages
          if (msg.type !== "user" && msg.type !== "assistant") continue;

          // Extract content
          let textContent = "";
          if (msg.message?.content) {
            if (typeof msg.message.content === "string") {
              textContent = msg.message.content;
            } else if (Array.isArray(msg.message.content)) {
              // Combine text blocks
              textContent = msg.message.content
                .filter((block) => block.type === "text" && block.text)
                .map((block) => block.text)
                .join("\n");
            }
          }

          // Skip empty messages or command messages
          if (!textContent || textContent.includes("<command-name>")) continue;

          messages.push({
            id: `${sessionId}-${messageIndex++}`,
            type: msg.type,
            content: textContent,
            timestamp: msg.timestamp || new Date().toISOString(),
          });
        } catch {
          // Skip malformed lines
        }
      }
    } catch (error) {
      console.error(`Failed to get messages for session ${sessionId}:`, error);
    }

    return messages;
  }
}

// Singleton instance
export const sessionStore = new SessionStore();
