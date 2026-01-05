"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  listAgentSessions,
  streamAgentTask,
  getTotalUsage,
  type SessionMetadata,
  type AgentStreamEvent,
  type PaginationInfo,
} from "@/lib/api";

interface UsageData {
  input: number;
  output: number;
  costUsd: number;
}

interface AgentState {
  sessions: SessionMetadata[];
  pagination: PaginationInfo | null;
  currentSessionId: string | null;
  isStreaming: boolean;
  streamingContent: string;
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
    streamingContent: "",
    usage: {
      currentSession: { input: 0, output: 0, costUsd: 0 },
      total: { input: 0, output: 0, costUsd: 0 },
    },
    lastError: null,
  });

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
      setState((prev) => ({
        ...prev,
        isStreaming: true,
        streamingContent: "",
        lastError: null,
        usage: { ...prev.usage, currentSession: { input: 0, output: 0, costUsd: 0 } },
      }));

      try {
        const stream = streamAgentTask(
          text,
          state.currentSessionId || undefined,
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
    [state.currentSessionId, loadSessions, refreshUsage]
  );

  const handleStreamEvent = useCallback((event: AgentStreamEvent) => {
    // Safety check for undefined data
    const data = event.data as Record<string, unknown> | undefined;

    switch (event.type) {
      case "connected":
        if (data?.sessionId) {
          setState((prev) => ({
            ...prev,
            currentSessionId: data.sessionId as string,
          }));
        }
        break;

      case "token":
        if (data?.text) {
          setState((prev) => ({
            ...prev,
            streamingContent: prev.streamingContent + (data.text as string),
          }));
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

      default:
        // Handle tool_use and tool_result if needed
        break;
    }
  }, []);

  const resumeSession = useCallback((sessionId: string) => {
    setState((prev) => ({
      ...prev,
      currentSessionId: sessionId,
      streamingContent: "",
    }));
  }, []);

  const clearSession = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentSessionId: null,
      streamingContent: "",
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
