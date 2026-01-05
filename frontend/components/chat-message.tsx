"use client"

import { cn } from "@/lib/utils"
import type { ChatMessage as ChatMessageType, ToolCall } from "@/lib/api"

interface ChatMessageProps {
  message: ChatMessageType
}

// Status indicator dot
function StatusDot({ isActive = false }: { isActive?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full shrink-0 mt-2",
        isActive
          ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"
          : "bg-green-500"
      )}
    />
  )
}

// Tool call display component
function ToolCallItem({ tool }: { tool: ToolCall }) {
  const toolLabels: Record<string, string> = {
    read: "Read",
    write: "Write",
    edit: "Edit",
    bash: "Bash",
    glob: "Glob",
    grep: "Grep",
    task: "Task",
    todo: "Update Todos",
    search: "Search",
  }

  return (
    <div className="flex items-start gap-3 py-1">
      <StatusDot />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-foreground">
            {toolLabels[tool.type] || tool.type}
          </span>
          <span className="text-muted-foreground text-sm font-mono truncate">
            {tool.name}
          </span>
        </div>
        {tool.result && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <span className="text-muted-foreground/60">└</span>
            <span>{tool.result}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === "user"

  // User message - dark card style
  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-[85%] rounded-xl bg-zinc-800 dark:bg-zinc-800 px-4 py-3 text-zinc-100">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    )
  }

  // Assistant message - timeline style with status dot
  return (
    <div className="px-4 py-2">
      {/* Main text content */}
      {message.content && (
        <div className="flex items-start gap-3">
          <StatusDot isActive={message.isStreaming} />
          <p className="flex-1 text-foreground whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      )}

      {/* Tool calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mt-2 space-y-1">
          {message.toolCalls.map((tool) => (
            <ToolCallItem key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  )
}
