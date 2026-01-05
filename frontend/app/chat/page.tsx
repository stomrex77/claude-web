"use client"

import { useState, useEffect, type FormEventHandler } from "react"
import { Image, MoreHorizontal } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ChatMessageList } from "@/components/chat-message-list"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
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
import { useAgent } from "@/contexts/agent-context"
import { useDirectory } from "@/contexts/directory-context"
import { getSessionMessages, type ChatMessage } from "@/lib/api"

const models = [
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
  { id: "claude-opus-4", name: "Claude Opus 4" },
  { id: "claude-haiku", name: "Claude Haiku" },
]

export default function ChatPage() {
  const [text, setText] = useState<string>("")
  const [model, setModel] = useState<string>(models[0].id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const { rootDirectory } = useDirectory()
  const {
    sendMessage,
    isStreaming,
    streamingContent,
    lastError,
    currentSessionId,
  } = useAgent()

  // Load messages when session changes
  useEffect(() => {
    async function loadMessages() {
      if (!currentSessionId) {
        setMessages([])
        return
      }

      setIsLoadingMessages(true)
      try {
        const msgs = await getSessionMessages(currentSessionId)
        setMessages(msgs)
      } catch (error) {
        console.error("Failed to load messages:", error)
        setMessages([])
      } finally {
        setIsLoadingMessages(false)
      }
    }

    loadMessages()
  }, [currentSessionId])

  // Reload messages after streaming completes
  useEffect(() => {
    async function reloadAfterStream() {
      if (!isStreaming && currentSessionId && streamingContent) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        try {
          const msgs = await getSessionMessages(currentSessionId)
          setMessages(msgs)
        } catch (error) {
          console.error("Failed to reload messages:", error)
        }
      }
    }

    reloadAfterStream()
  }, [isStreaming, currentSessionId, streamingContent])

  const status = isStreaming ? "streaming" : lastError ? "error" : "ready"
  const hasMessages = messages.length > 0 || isStreaming

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!text || isStreaming) {
      return
    }

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      type: "user",
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    const message = text
    setText("")
    await sendMessage(message, rootDirectory)
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Chat" />
        <div className="flex flex-col h-[calc(100vh-var(--header-height))] overflow-hidden">
          {/* Messages Area or Centered Prompt */}
          {hasMessages ? (
            <>
              {isLoadingMessages ? (
                <div className="flex-1 flex items-center justify-center min-h-0">
                  <div className="animate-pulse text-muted-foreground">
                    Loading messages...
                  </div>
                </div>
              ) : (
                <ChatMessageList
                  messages={messages}
                  streamingContent={streamingContent}
                  isStreaming={isStreaming}
                />
              )}

              {/* Input Area at Bottom - fixed height */}
              <div className="border-t bg-background px-4 md:px-8 lg:px-16 py-4 shrink-0">
                <div className="mx-auto max-w-4xl">
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
                        <PromptInputModelSelect
                          onValueChange={setModel}
                          value={model}
                        >
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
                </div>
              </div>
            </>
          ) : (
            /* Centered Prompt for New Chat */
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <h1 className="text-3xl font-medium mb-8 text-foreground">
                Welcome back
              </h1>
              <div className="w-full max-w-2xl">
                <PromptInput onSubmit={handleSubmit}>
                  <PromptInputTextarea
                    onChange={(e) => setText(e.target.value)}
                    value={text}
                    placeholder="How can I help you today?"
                  />
                  <PromptInputToolbar>
                    <PromptInputTools>
                      <PromptInputButton>
                        <Image size={16} />
                      </PromptInputButton>
                      <PromptInputButton>
                        <MoreHorizontal size={16} />
                      </PromptInputButton>
                      <PromptInputModelSelect
                        onValueChange={setModel}
                        value={model}
                      >
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
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
