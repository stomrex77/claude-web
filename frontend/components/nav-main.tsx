"use client"

import { type FormEventHandler, useState } from "react"
import { type Icon } from "@tabler/icons-react"
import { FolderOpen, Image, MoreHorizontal } from "lucide-react"
import { useDirectory } from "@/contexts/directory-context"

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
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
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
  const [status, setStatus] = useState<
    'submitted' | 'streaming' | 'ready' | 'error'
  >('ready')
  const { rootDirectory, isHydrated } = useDirectory()

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    if (!text) {
      return
    }
    setStatus('submitted')
    setTimeout(() => {
      setStatus('streaming')
    }, 200)
    setTimeout(() => {
      setStatus('ready')
      setText('')
    }, 2000)
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
                  <span className="truncate text-muted-foreground">{rootDirectory}</span>
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
