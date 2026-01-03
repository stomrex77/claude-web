import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/index.js";
import { handleTextEditorTool } from "../tools/text-editor.js";
import { handleBashTool } from "../tools/bash.js";
import type {
  ConversationSession,
  AgentTaskResponse,
  AgentToolCall,
  AgentStreamEvent,
} from "../types/index.js";

// Tool definitions for Claude
const TOOLS: Anthropic.Tool[] = [
  {
    name: "str_replace_based_edit_tool",
    description: `A tool for viewing, creating, and editing files.

Commands:
- view: View file contents or list directory. Use view_range for specific lines.
- create: Create a new file with the given content.
- str_replace: Replace a unique string in a file. old_str must appear exactly once.
- insert: Insert text at a specific line number.`,
    input_schema: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          enum: ["view", "create", "str_replace", "insert"],
          description: "The command to execute",
        },
        path: {
          type: "string",
          description: "Absolute path to the file or directory",
        },
        file_text: {
          type: "string",
          description: "Content for create command",
        },
        old_str: {
          type: "string",
          description: "Text to find for str_replace (must be unique)",
        },
        new_str: {
          type: "string",
          description: "Replacement text for str_replace or insert",
        },
        insert_line: {
          type: "number",
          description: "Line number for insert command (1-indexed)",
        },
        view_range: {
          type: "array",
          items: { type: "number" },
          description: "Optional [start, end] line range for view",
        },
      },
      required: ["command", "path"],
    },
  },
  {
    name: "bash",
    description: `Execute shell commands. Use this for running scripts, installing packages, git operations, etc.

The command runs in a bash shell with the working directory set to the project root.`,
    input_schema: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        restart: {
          type: "boolean",
          description: "Set to true to restart the bash session",
        },
      },
      required: ["command"],
    },
  },
];

class ClaudeAgentService {
  private client: Anthropic;
  private sessions: Map<string, ConversationSession> = new Map();

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  private getOrCreateSession(
    sessionId: string | undefined,
    workingDirectory: string
  ): ConversationSession {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.lastActivity = new Date();
      return session;
    }

    const newSession: ConversationSession = {
      id: sessionId || uuidv4(),
      messages: [],
      workingDirectory,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(newSession.id, newSession);
    return newSession;
  }

  async executeTask(
    task: string,
    sessionId?: string,
    workingDirectory: string = config.defaultWorkingDirectory
  ): Promise<AgentTaskResponse> {
    const session = this.getOrCreateSession(sessionId, workingDirectory);
    const toolCalls: AgentToolCall[] = [];

    // Add user message
    session.messages.push({
      role: "user",
      content: task,
    });

    // Build messages for API
    const messages: Anthropic.MessageParam[] = session.messages.map((m) => ({
      role: m.role,
      content: m.content as string,
    }));

    let response = await this.client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 8192,
      system: this.getSystemPrompt(session.workingDirectory),
      tools: TOOLS,
      messages,
    });

    // Tool use loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      // Execute tools
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await this.executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          session.workingDirectory
        );

        toolCalls.push({
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          result,
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Add assistant response and tool results to messages
      messages.push({
        role: "assistant",
        content: response.content,
      });

      messages.push({
        role: "user",
        content: toolResults,
      });

      // Continue conversation
      response = await this.client.messages.create({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 8192,
        system: this.getSystemPrompt(session.workingDirectory),
        tools: TOOLS,
        messages,
      });
    }

    // Extract final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const finalResponse = textBlocks.map((b) => b.text).join("\n");

    // Update session with final assistant message
    session.messages.push({
      role: "assistant",
      content: finalResponse,
    });

    return {
      sessionId: session.id,
      response: finalResponse,
      toolCalls,
      stopReason: response.stop_reason || "end_turn",
    };
  }

  async *streamTask(
    task: string,
    sessionId?: string,
    workingDirectory: string = config.defaultWorkingDirectory
  ): AsyncGenerator<AgentStreamEvent> {
    const session = this.getOrCreateSession(sessionId, workingDirectory);

    // Add user message
    session.messages.push({
      role: "user",
      content: task,
    });

    // Build messages for API
    const messages: Anthropic.MessageParam[] = session.messages.map((m) => ({
      role: m.role,
      content: m.content as string,
    }));

    yield { type: "token", data: { sessionId: session.id } };

    let continueLoop = true;

    while (continueLoop) {
      const stream = this.client.messages.stream({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 8192,
        system: this.getSystemPrompt(session.workingDirectory),
        tools: TOOLS,
        messages,
      });

      let currentToolUses: Anthropic.ToolUseBlock[] = [];
      let textContent = "";

      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          const delta = event.delta;
          if ("text" in delta) {
            textContent += delta.text;
            yield { type: "token", data: { text: delta.text } };
          }
        }
      }

      const finalMessage = await stream.finalMessage();

      // Check for tool use
      const toolUseBlocks = finalMessage.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlocks.length > 0) {
        // Execute tools
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          yield {
            type: "tool_use",
            data: {
              id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input,
            },
          };

          const result = await this.executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            session.workingDirectory
          );

          yield {
            type: "tool_result",
            data: {
              id: toolUse.id,
              result,
            },
          };

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        // Add to messages and continue
        messages.push({
          role: "assistant",
          content: finalMessage.content,
        });

        messages.push({
          role: "user",
          content: toolResults,
        });
      } else {
        // No more tool use, we're done
        continueLoop = false;

        // Update session
        const textBlocks = finalMessage.content.filter(
          (block): block is Anthropic.TextBlock => block.type === "text"
        );
        const finalText = textBlocks.map((b) => b.text).join("\n");

        session.messages.push({
          role: "assistant",
          content: finalText,
        });

        yield {
          type: "complete",
          data: {
            sessionId: session.id,
            stopReason: finalMessage.stop_reason,
          },
        };
      }
    }
  }

  private async executeTool(
    name: string,
    input: Record<string, unknown>,
    workingDirectory: string
  ): Promise<string> {
    try {
      switch (name) {
        case "str_replace_based_edit_tool":
          return await handleTextEditorTool(input as unknown as Parameters<typeof handleTextEditorTool>[0]);

        case "bash":
          return await handleBashTool(
            input as unknown as Parameters<typeof handleBashTool>[0],
            workingDirectory
          );

        default:
          return `Unknown tool: ${name}`;
      }
    } catch (error) {
      return `Error executing ${name}: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  private getSystemPrompt(workingDirectory: string): string {
    return `You are Claude, an AI assistant helping with software development tasks.

You have access to tools for reading, creating, and editing files, as well as running shell commands.

Current working directory: ${workingDirectory}

Guidelines:
- Use the view command to read files before editing them
- Use str_replace for editing existing files (old_str must be unique)
- Use bash for running commands, tests, and git operations
- Be concise in your responses
- Explain what you're doing before using tools
- After completing a task, summarize what was done`;
  }

  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Cleanup old sessions (older than 1 hour)
  cleanup(): void {
    const now = new Date();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [id, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(id);
      }
    }
  }
}

// Singleton instance
export const agentService = new ClaudeAgentService();

// Periodic cleanup
setInterval(() => agentService.cleanup(), 5 * 60 * 1000); // Every 5 minutes
