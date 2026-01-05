"use client"

import { useRouter } from "next/navigation"
import { IconPlus, IconCheck, IconLoader2 } from "@tabler/icons-react"
import { useAgent } from "@/contexts/agent-context"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { SessionMetadata } from "@/lib/api"

// Format date: relative for today/yesterday, then short date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateOnly.getTime() === today.getTime()) {
    return "Today"
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday"
  } else {
    // Short date format: "Nov 13"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
}

// Extract directory name from full path
function getDirectoryName(directory: string): string {
  if (!directory) return ""
  const parts = directory.split("/").filter(Boolean)
  return parts[parts.length - 1] || directory
}

interface ConversationItemProps {
  session: SessionMetadata
  isActive: boolean
  isRunning: boolean
  onClick: () => void
}

function ConversationItem({ session, isActive, isRunning, onClick }: ConversationItemProps) {
  const directoryName = getDirectoryName(session.directory)
  const formattedDate = formatDate(session.lastActivity)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onClick}
        tooltip={session.title}
        className={cn(
          "h-auto py-2 flex flex-col items-start gap-0.5",
          isActive && "bg-sidebar-accent"
        )}
      >
        <span className="truncate w-full text-sm font-medium">{session.title}</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full">
          <span className="truncate">{directoryName}</span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">{formattedDate}</span>
          <span className="shrink-0 ml-auto">
            {isRunning ? (
              <IconLoader2 className="size-3.5 animate-spin text-blue-500" />
            ) : (
              <IconCheck className="size-3.5 text-purple-500" />
            )}
          </span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function NavChat() {
  const router = useRouter()
  const { sessions, clearSession, currentSessionId, isStreaming, streamingSessionId, interactedSessionIds } = useAgent()

  // Split sessions into two categories
  const sessionConversations: SessionMetadata[] = []
  const recentConversations: SessionMetadata[] = []

  // Maximum 5 total items
  let totalCount = 0
  const MAX_ITEMS = 5

  for (const session of sessions) {
    if (totalCount >= MAX_ITEMS) break

    if (interactedSessionIds.has(session.id)) {
      sessionConversations.push(session)
    } else {
      recentConversations.push(session)
    }
    totalCount++
  }

  const handleNewChat = () => {
    clearSession()
    router.push("/chat")
  }

  const handleResumeChat = (sessionId: string) => {
    router.push(`/chat?session=${sessionId}`)
  }

  // Check if a session is currently running (streaming)
  const isSessionRunning = (sessionId: string) => {
    return isStreaming && streamingSessionId === sessionId
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between pr-2">
        <span>Chat</span>
        <button
          onClick={handleNewChat}
          className="p-1 rounded hover:bg-sidebar-accent transition-colors"
          title="New Chat"
        >
          <IconPlus className="size-4" />
        </button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* Session Conversations - sessions interacted with in this browser session */}
          {sessionConversations.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Session Conversations
              </div>
              {sessionConversations.map((session) => (
                <ConversationItem
                  key={session.id}
                  session={session}
                  isActive={currentSessionId === session.id}
                  isRunning={isSessionRunning(session.id)}
                  onClick={() => handleResumeChat(session.id)}
                />
              ))}
            </>
          )}

          {/* Recent Conversations - other past sessions */}
          {recentConversations.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Recent Conversations
              </div>
              {recentConversations.map((session) => (
                <ConversationItem
                  key={session.id}
                  session={session}
                  isActive={currentSessionId === session.id}
                  isRunning={isSessionRunning(session.id)}
                  onClick={() => handleResumeChat(session.id)}
                />
              ))}
            </>
          )}

          {/* Empty state */}
          {sessions.length === 0 && (
            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
              No conversations yet
            </div>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
