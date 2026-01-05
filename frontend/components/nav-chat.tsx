"use client"

import { useRouter } from "next/navigation"
import { IconMessage, IconMessagePlus } from "@tabler/icons-react"
import { useAgent } from "@/contexts/agent-context"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavChat() {
  const router = useRouter()
  const { sessions, resumeSession, clearSession } = useAgent()

  // Get the 5 most recent sessions
  const recentSessions = sessions.slice(0, 5)

  const handleNewChat = () => {
    clearSession()
    router.push("/chat")
  }

  const handleResumeChat = (sessionId: string) => {
    resumeSession(sessionId)
    router.push("/chat")
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Chat</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* New Chat Button */}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleNewChat}>
              <IconMessagePlus className="size-4" />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Recent Chats */}
          {recentSessions.map((session) => (
            <SidebarMenuItem key={session.id}>
              <SidebarMenuButton
                onClick={() => handleResumeChat(session.id)}
                tooltip={session.title}
              >
                <IconMessage className="size-4" />
                <span className="truncate">{session.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
