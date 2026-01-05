"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  listAgentSessions,
  streamAgentTask,
  getTotalUsage,
  type SessionMetadata,
  type AgentStreamEvent,
  type PaginationInfo,
  type ToolCall,
} from "@/lib/api";

interface UsageData {
  input: number;
  output: number;
  costUsd: number;
}

// Streaming block types for interleaved content
export type StreamingBlock =
  | { type: 'text'; content: string }
  | { type: 'tool'; tool: ToolCall };

interface AgentState {
  sessions: SessionMetadata[];
  pagination: PaginationInfo | null;
  currentSessionId: string | null;
  isStreaming: boolean;
  streamingBlocks: StreamingBlock[];
  usage: {
    currentSession: UsageData;
    total: UsageData;
  };
  lastError: string | null;
}

interface AgentContextValue extends AgentState {
  sendMessage: (text: string, workingDirectory?: string) => Promise<void>;
  loadSessions: (page?: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  resumeSession: (sessionId: string) => void;
  clearSession: () => void;
  refreshUsage: () => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AgentState>({
    sessions: [],
    pagination: null,
    currentSessionId: null,
    isStreaming: false,
    streamingBlocks: [],
    usage: {
      currentSession: { input: 0, output: 0, costUsd: 0 },
      total: { input: 0, output: 0, costUsd: 0 },
    },
    lastError: null,
  });

  // Ref to always hold the latest currentSessionId - fixes stale closure issue
  // When sendMessage is called, it reads from this ref to get the most up-to-date value
  const currentSessionIdRef = useRef<string | null>(null);
  
  // Keep the ref in sync with state
  useEffect(() => {
    currentSessionIdRef.current = state.currentSessionId;
  }, [state.currentSessionId]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    refreshUsage();
  }, []);

  const loadSessions = useCallback(async (page?: number) => {
    try {
      const response = await listAgentSessions({ page: page || 1, limit: 10 });
      setState((prev) => ({
        ...prev,
        sessions: response.sessions,
        pagination: response.pagination,
      }));
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  }, []);

  const nextPage = useCallback(async () => {
    if (state.pagination?.hasNext) {
      await loadSessions(state.pagination.page + 1);
    }
  }, [state.pagination, loadSessions]);

  const prevPage = useCallback(async () => {
    if (state.pagination?.hasPrev) {
      await loadSessions(state.pagination.page - 1);
    }
  }, [state.pagination, loadSessions]);

  const refreshUsage = useCallback(async () => {
    try {
      const usage = await getTotalUsage();
      setState((prev) => ({
        ...prev,
        usage: { ...prev.usage, total: usage },
      }));
    } catch (error) {
      console.error("Failed to refresh usage:", error);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string, workingDirectory?: string) => {
      // Read the LATEST sessionId from ref to avoid stale closure issues
      const sessionIdToUse = currentSessionIdRef.current;
      
      setState((prev) => ({
        ...prev,
        isStreaming: true,
        streamingBlocks: [],
        lastError: null,
        usage: { ...prev.usage, currentSession: { input: 0, output: 0, costUsd: 0 } },
      }));

      try {
        const stream = streamAgentTask(
          text,
          sessionIdToUse || undefined,
          workingDirectory
        );

        for await (const event of stream) {
          handleStreamEvent(event);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
      }

      // Refresh sessions and usage after completion
      await loadSessions();
      await refreshUsage();
    },
    [loadSessions, refreshUsage]
  );

  const handleStreamEvent = useCallback((event: AgentStreamEvent) => {
    // Safety check for undefined data
    const data = event.data as Record<string, unknown> | undefined;

    switch (event.type) {
      case "connected":
        if (data?.sessionId) {
          const newSessionId = data.sessionId as string;
          // Update ref IMMEDIATELY so subsequent messages use correct sessionId
          currentSessionIdRef.current = newSessionId;
          setState((prev) => ({
            ...prev,
            currentSessionId: newSessionId,
          }));
        }
        break;

      case "token":
        if (data?.text) {
          setState((prev) => {
            const blocks = [...prev.streamingBlocks];
            const lastBlock = blocks[blocks.length - 1];

            // If the last block is text, append to it; otherwise create new text block
            if (lastBlock && lastBlock.type === 'text') {
              blocks[blocks.length - 1] = {
                type: 'text',
                content: lastBlock.content + (data.text as string),
              };
            } else {
              blocks.push({ type: 'text', content: data.text as string });
            }

            return { ...prev, streamingBlocks: blocks };
          });
        }
        break;

      case "complete":
        setState((prev) => {
          const sessionId = data?.sessionId as string | undefined;
          const usage = data?.usage as {
            inputTokens: number;
            outputTokens: number;
            costUsd?: number;
          } | undefined;

          return {
            ...prev,
            isStreaming: false,
            currentSessionId: sessionId || prev.currentSessionId,
            usage: usage
              ? {
                  currentSession: {
                    input: usage.inputTokens,
                    output: usage.outputTokens,
                    costUsd: usage.costUsd || 0,
                  },
                  total: {
                    input: prev.usage.total.input + usage.inputTokens,
                    output: prev.usage.total.output + usage.outputTokens,
                    costUsd: prev.usage.total.costUsd + (usage.costUsd || 0),
                  },
                }
              : prev.usage,
          };
        });
        break;

      case "error":
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          lastError: (data?.message as string) || "Unknown error",
        }));
        break;

      case "tool_use":
        if (data) {
          const input = data.input as Record<string, unknown>;
          const toolType = (data.name as string)?.toLowerCase() || "unknown";

          // Extract display name based on tool type
          let displayName = (data.name as string) || "Tool";
          if (toolType === "bash" && input?.command) {
            displayName = String(input.command).slice(0, 60) + (String(input.command).length > 60 ? "..." : "");
          } else if ((toolType === "read" || toolType === "write" || toolType === "edit") && input?.file_path) {
            displayName = String(input.file_path);
          } else if ((toolType === "glob" || toolType === "grep") && input?.pattern) {
            displayName = String(input.pattern);
          }

          const toolCall: ToolCall = {
            id: (data.id as string) || `tool-${Date.now()}`,
            type: toolType,
            name: displayName,
            input: input,
          };

          setState((prev) => ({
            ...prev,
            streamingBlocks: [...prev.streamingBlocks, { type: 'tool', tool: toolCall }],
          }));
        }
        break;

      case "tool_result":
        if (data) {
          const toolId = data.toolUseId as string;
          setState((prev) => ({
            ...prev,
            streamingBlocks: prev.streamingBlocks.map((block) =>
              block.type === 'tool' && block.tool.id === toolId
                ? { ...block, tool: { ...block.tool, result: (data.content as string) || "Done" } }
                : block
            ),
          }));
        }
        break;

      default:
        break;
    }
  }, []);

  const resumeSession = useCallback((sessionId: string) => {
    // Update ref immediately for consistency
    currentSessionIdRef.current = sessionId;
    setState((prev) => ({
      ...prev,
      currentSessionId: sessionId,
      streamingBlocks: [],
    }));
  }, []);

  const clearSession = useCallback(() => {
    // Update ref immediately to null for new chat
    currentSessionIdRef.current = null;
    setState((prev) => ({
      ...prev,
      currentSessionId: null,
      streamingBlocks: [],
      usage: { ...prev.usage, currentSession: { input: 0, output: 0, costUsd: 0 } },
    }));
  }, []);

  const value: AgentContextValue = {
    ...state,
    sendMessage,
    loadSessions,
    nextPage,
    prevPage,
    resumeSession,
    clearSession,
    refreshUsage,
  };

  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
