"use client"

import { type FormEventHandler, useState, useEffect } from "react"
import { type Icon } from "@tabler/icons-react"
import { FolderOpen, Image, MoreHorizontal } from "lucide-react"
import { useDirectory } from "@/contexts/directory-context"
import { useAgent } from "@/contexts/agent-context"

import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ui/prompt-input"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const models = [
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
  { id: 'claude-opus-4', name: 'Claude Opus 4' },
  { id: 'claude-haiku', name: 'Claude Haiku' },
]

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
  const [text, setText] = useState<string>('')
  const [model, setModel] = useState<string>(models[0].id)
  const { rootDirectory, isHydrated } = useDirectory()
  const { sendMessage, isStreaming, lastError } = useAgent()

  // Derive status from agent state
  const status = isStreaming ? 'streaming' : lastError ? 'error' : 'ready'

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!text || isStreaming) {
      return
    }
    const message = text
    setText('')
    await sendMessage(message, rootDirectory)
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-3">
        <SidebarMenu>
          <SidebarMenuItem className="pl-1">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                onChange={(e) => setText(e.target.value)}
                value={text}
                placeholder="Ask Claude to write code..."
              />
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputButton>
                    <Image size={16} />
                  </PromptInputButton>
                  <PromptInputButton>
                    <MoreHorizontal size={16} />
                  </PromptInputButton>
                  <PromptInputModelSelect onValueChange={setModel} value={model}>
                    <PromptInputModelSelectTrigger>
                      <PromptInputModelSelectValue />
                    </PromptInputModelSelectTrigger>
                    <PromptInputModelSelectContent>
                      {models.map((m) => (
                        <PromptInputModelSelectItem key={m.id} value={m.id}>
                          {m.name}
                        </PromptInputModelSelectItem>
                      ))}
                    </PromptInputModelSelectContent>
                  </PromptInputModelSelect>
                </PromptInputTools>
                <PromptInputSubmit disabled={!text} status={status} />
              </PromptInputToolbar>
            </PromptInput>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="gap-2" asChild>
              <a href="/directory">
                <FolderOpen size={16} />
                {isHydrated ? (
                  <span className="truncate text-muted-foreground [direction:rtl] text-left">{rootDirectory}</span>
                ) : (
                  <span className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
                )}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} className="overflow-visible" asChild>
                <a href={item.url}>
                  {item.icon && <item.icon className="size-4 shrink-0" />}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
