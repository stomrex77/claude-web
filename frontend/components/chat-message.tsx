"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChevronDown, ChevronRight } from "lucide-react"
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

// Collapsible section for tool details
function CollapsibleDetails({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mt-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>{title}</span>
      </button>
      {isOpen && (
        <div className="mt-1 ml-4 text-sm">{children}</div>
      )}
    </div>
  )
}

// Diff view for edit operations
function DiffView({ oldString, newString }: { oldString: string; newString: string }) {
  return (
    <div className="font-mono text-xs space-y-1">
      <div className="bg-red-500/10 border-l-2 border-red-500 pl-2 py-1 overflow-x-auto">
        <pre className="text-red-400 whitespace-pre-wrap break-all">- {oldString}</pre>
      </div>
      <div className="bg-green-500/10 border-l-2 border-green-500 pl-2 py-1 overflow-x-auto">
        <pre className="text-green-400 whitespace-pre-wrap break-all">+ {newString}</pre>
      </div>
    </div>
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

  const details = tool.details

  // Build summary based on tool type
  const getSummary = () => {
    if (!details) return tool.result

    switch (tool.type) {
      case "read":
        return details.numLines ? `${details.numLines} lines` : tool.result
      case "write":
        return details.numLines ? `Wrote ${details.numLines} lines` : tool.result
      case "edit":
        return "Modified file"
      case "bash":
        if (details.exitCode !== undefined) {
          return details.exitCode === 0 ? "Success" : `Exit code: ${details.exitCode}`
        }
        return tool.result
      case "glob":
      case "grep":
        return details.matchCount !== undefined
          ? `Found ${details.matchCount} matches`
          : tool.result
      default:
        return tool.result
    }
  }

  // Check if this tool has expandable details
  const hasExpandableDetails = () => {
    if (!details) return false
    switch (tool.type) {
      case "edit":
        return details.oldString && details.newString
      case "bash":
        return details.stdout || details.stderr
      default:
        return false
    }
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
            {details?.filePath || details?.pattern || tool.name}
          </span>
        </div>

        {/* Summary result */}
        {getSummary() && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <span className="text-muted-foreground/60">└</span>
            <span>{getSummary()}</span>
          </div>
        )}

        {/* Expandable details for Edit */}
        {tool.type === "edit" && details?.oldString && details?.newString && (
          <CollapsibleDetails title="Show diff">
            <DiffView oldString={details.oldString} newString={details.newString} />
          </CollapsibleDetails>
        )}

        {/* Expandable details for Bash */}
        {tool.type === "bash" && (details?.stdout || details?.stderr) && (
          <CollapsibleDetails title="Show output">
            <div className="bg-muted/50 rounded p-2 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
              {details.stdout && (
                <pre className="whitespace-pre-wrap break-all text-foreground">{details.stdout}</pre>
              )}
              {details.stderr && (
                <pre className="whitespace-pre-wrap break-all text-red-400 mt-1">{details.stderr}</pre>
              )}
            </div>
          </CollapsibleDetails>
        )}
      </div>
    </div>
  )
}

// Markdown content renderer
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h4>
        ),
        // Paragraphs
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground">{children}</li>
        ),
        // Code
        code: ({ className, children, ...props }) => {
          const isInline = !className
          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                {children}
              </code>
            )
          }
          return (
            <code className={cn("font-mono text-sm", className)} {...props}>
              {children}
            </code>
          )
        },
        pre: ({ children }) => (
          <pre className="bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto mb-2 text-sm">
            {children}
          </pre>
        ),
        // Links
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
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground mb-2">
            {children}
          </blockquote>
        ),
        // Horizontal rule
        hr: () => <hr className="border-border my-4" />,
        // Strong and emphasis
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        // Tables (GFM)
        table: ({ children }) => (
          <div className="overflow-x-auto mb-2">
            <table className="min-w-full border border-border rounded">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-sm font-semibold border-b border-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-sm border-b border-border">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
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
      {/* Main text content with markdown rendering */}
      {message.content && (
        <div className="flex items-start gap-3">
          <StatusDot isActive={message.isStreaming} />
          <div className="flex-1 min-w-0 text-foreground">
            <MarkdownContent content={message.content} />
          </div>
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
