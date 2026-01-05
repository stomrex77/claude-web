import { query, type Options, type SDKMessage, type SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { sessionStore, type SessionMetadata, type ChatMessage } from "./session-store.js";
import type { AgentStreamEvent, AgentTaskResponse, AgentToolCall } from "../types/index.js";
import { config } from "../config/index.js";

class ClaudeAgentService {
  async executeTask(
    task: string,
    sessionId?: string,
    workingDirectory: string = config.defaultWorkingDirectory
  ): Promise<AgentTaskResponse> {
    const toolCalls: AgentToolCall[] = [];
    let responseText = "";
    let newSessionId = sessionId || "";
    let stopReason = "end_turn";

    const options: Options = {
      cwd: workingDirectory,
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
      permissionMode: "acceptEdits",
      ...(sessionId && { resume: sessionId }),
    };

    try {
      for await (const message of query({ prompt: task, options })) {
        // Capture session ID from init message
        if (message.type === "system" && message.subtype === "init") {
          newSessionId = message.session_id;
          // Store session metadata
          sessionStore.upsert(newSessionId, task, workingDirectory);
        }

        // Capture tool usage from assistant messages
        if (message.type === "assistant" && message.message.content) {
          for (const block of message.message.content) {
            if (block.type === "tool_use") {
              toolCalls.push({
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              });
            } else if (block.type === "text") {
              responseText += block.text;
            }
          }
        }

        // Capture final result
        if (message.type === "result") {
          if (message.subtype === "success") {
            responseText = message.result;
            stopReason = "end_turn";
            // Update usage with cost
            sessionStore.updateUsage(newSessionId, {
              input: message.usage.input_tokens,
              output: message.usage.output_tokens,
              costUsd: message.total_cost_usd,
            });
          } else {
            stopReason = message.subtype;
          }
        }
      }
    } catch (error) {
      console.error("Error executing task:", error);
      throw error;
    }

    return {
      sessionId: newSessionId,
      response: responseText,
      toolCalls,
      stopReason,
    };
  }

  async *streamTask(
    task: string,
    sessionId?: string,
    workingDirectory: string = config.defaultWorkingDirectory
  ): AsyncGenerator<AgentStreamEvent> {
    const options: Options = {
      cwd: workingDirectory,
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
      permissionMode: "acceptEdits",
      includePartialMessages: true,
      ...(sessionId && { resume: sessionId }),
    };

    let currentSessionId = sessionId || "";

    try {
      for await (const message of query({ prompt: task, options })) {
        const event = this.transformMessage(message, currentSessionId);

        if (event) {
          // Update session ID if we got it from init
          if (message.type === "system" && message.subtype === "init") {
            currentSessionId = message.session_id;
            // Store session metadata
            sessionStore.upsert(currentSessionId, task, workingDirectory);

            yield {
              type: "connected",
              data: { sessionId: currentSessionId },
            };
          }

          yield event;
        }
      }
    } catch (error) {
      console.error("Error in stream task:", error);
      yield {
        type: "error",
        data: { message: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  private transformMessage(message: SDKMessage, sessionId: string): AgentStreamEvent | null {
    switch (message.type) {
      case "stream_event": {
        // Handle streaming token events
        const event = message.event;
        if (event.type === "content_block_delta" && "delta" in event) {
          const delta = event.delta;
          if ("text" in delta) {
            return {
              type: "token",
              data: { text: delta.text, sessionId },
            };
          }
        }
        return null;
      }

      case "assistant": {
        // Handle complete assistant messages
        const toolUses: AgentStreamEvent[] = [];

        for (const block of message.message.content) {
          if (block.type === "tool_use") {
            return {
              type: "tool_use",
              data: {
                id: block.id,
                name: block.name,
                input: block.input,
              },
            };
          }
        }
        return null;
      }

      case "user": {
        // Handle tool results (user messages with tool results)
        if (message.tool_use_result !== undefined) {
          return {
            type: "tool_result",
            data: {
              result: typeof message.tool_use_result === "string"
                ? message.tool_use_result
                : JSON.stringify(message.tool_use_result),
            },
          };
        }
        return null;
      }

      case "result": {
        // Handle completion
        const resultMessage = message as SDKResultMessage;

        // Update usage in session store
        if (resultMessage.subtype === "success") {
          sessionStore.updateUsage(sessionId, {
            input: resultMessage.usage.input_tokens,
            output: resultMessage.usage.output_tokens,
            costUsd: resultMessage.total_cost_usd,
          });
        }

        return {
          type: "complete",
          data: {
            sessionId,
            stopReason: resultMessage.subtype,
            usage: {
              inputTokens: resultMessage.usage.input_tokens,
              outputTokens: resultMessage.usage.output_tokens,
              costUsd: resultMessage.subtype === "success" ? resultMessage.total_cost_usd : 0,
            },
            result: resultMessage.subtype === "success" ? resultMessage.result : undefined,
          },
        };
      }

      default:
        return null;
    }
  }

  // Get session metadata
  getSession(sessionId: string): SessionMetadata | undefined {
    return sessionStore.get(sessionId);
  }

  // List all sessions (including Claude Code sessions)
  listSessions(): SessionMetadata[] {
    // Get Claude Code sessions from local storage
    const claudeCodeSessions = sessionStore.listClaudeCodeSessions();

    // Get our web app sessions
    const webAppSessions = sessionStore.listAll();

    // Merge and deduplicate by ID, Claude Code sessions take precedence
    const sessionMap = new Map<string, SessionMetadata>();

    // Add web app sessions first
    for (const session of webAppSessions) {
      sessionMap.set(session.id, session);
    }

    // Claude Code sessions override web app sessions
    for (const session of claudeCodeSessions) {
      sessionMap.set(session.id, session);
    }

    // Sort by last activity (most recent first)
    return Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  // Clear a session
  clearSession(sessionId: string): boolean {
    return sessionStore.delete(sessionId);
  }

  // Get total usage across all sessions (from Claude Code stats)
  getTotalUsage(): { input: number; output: number; costUsd: number } {
    return sessionStore.getTotalUsage();
  }

  // Get Claude Code stats
  getClaudeCodeStats() {
    return sessionStore.getClaudeCodeStats();
  }

  // Get messages for a session
  getSessionMessages(sessionId: string): ChatMessage[] {
    return sessionStore.getSessionMessages(sessionId);
  }
}

// Singleton instance
export const agentService = new ClaudeAgentService();
