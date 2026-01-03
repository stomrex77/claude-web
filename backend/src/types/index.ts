// Tree node structure (matches frontend)
export interface TreeNode {
  id: string;
  name: string;
  type: "folder" | "file";
  path: string;
  children?: TreeNode[];
}

// File read response
export interface FileReadResponse {
  content: string;
  size: number;
  modified: string;
  path: string;
}

// Path validation response
export interface PathValidationResponse {
  valid: boolean;
  absolutePath: string;
  error?: string;
}

// Terminal WebSocket messages
export interface TerminalInputMessage {
  type: "input";
  data: string;
}

export interface TerminalResizeMessage {
  type: "resize";
  cols: number;
  rows: number;
}

export interface TerminalOutputMessage {
  type: "output";
  data: string;
}

export interface TerminalExitMessage {
  type: "exit";
  code: number;
}

export type TerminalClientMessage = TerminalInputMessage | TerminalResizeMessage;
export type TerminalServerMessage = TerminalOutputMessage | TerminalExitMessage;

// Claude Agent types
export interface AgentTaskRequest {
  task: string;
  sessionId?: string;
  workingDirectory?: string;
}

export interface AgentToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
}

export interface AgentTaskResponse {
  sessionId: string;
  response: string;
  toolCalls: AgentToolCall[];
  stopReason: string;
}

export interface AgentStreamEvent {
  type: "token" | "tool_use" | "tool_result" | "complete" | "error";
  data: unknown;
}

// Conversation session
export interface ConversationMessage {
  role: "user" | "assistant";
  content: unknown;
}

export interface ConversationSession {
  id: string;
  messages: ConversationMessage[];
  workingDirectory: string;
  createdAt: Date;
  lastActivity: Date;
}
