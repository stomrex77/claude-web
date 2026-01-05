"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import type { StreamingBlock } from "@/contexts/agent-context"
import type { ToolCall } from "@/lib/api"

interface StreamingMessageProps {
  blocks: StreamingBlock[]
}

interface StreamingToolCallProps {
  tool: ToolCall
}

// Status indicator dot (animated for streaming)
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

// Simple markdown renderer for streaming text
function StreamingText({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        code: ({ className, children }) => {
          const isInline = !className
          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                {children}
              </code>
            )
          }
          return (
            <code className={cn("font-mono text-sm", className)}>
              {children}
            </code>
          )
        },
        pre: ({ children }) => (
          <pre className="bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto mb-2 text-sm">
            {children}
          </pre>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// Tool call display for streaming
function StreamingToolCall({ tool }: StreamingToolCallProps) {
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

  const isComplete = !!tool.result

  return (
    <div className="flex items-start gap-3 py-1">
      <StatusDot isActive={!isComplete} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-foreground">
            {toolLabels[tool.type] || tool.type}
          </span>
          <span className="text-muted-foreground text-sm font-mono truncate max-w-[500px]">
            {tool.name}
          </span>
        </div>

        {/* Result or in-progress indicator */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
          <span className="text-muted-foreground/60">└</span>
          <span>
            {isComplete ? (
              tool.result === "Done" ? "Completed" : tool.result?.slice(0, 100)
            ) : (
              <span className="animate-pulse">Running...</span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

export function StreamingMessage({ blocks }: StreamingMessageProps) {
  return (
    <div className="py-3 space-y-2">
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          return (
            <div key={`text-${index}`} className="flex items-start gap-3">
              <StatusDot isActive={index === blocks.length - 1} />
              <div className="flex-1 min-w-0 text-foreground">
                <StreamingText content={block.content} />
              </div>
            </div>
          )
        }

        if (block.type === 'tool') {
          return (
            <StreamingToolCall key={`tool-${block.tool.id}`} tool={block.tool} />
          )
        }

        return null
      })}
    </div>
  )
}
