"use client"

import { useState, useEffect, useRef, type FormEventHandler } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { useAgent, type StreamingBlock } from "@/contexts/agent-context"
import { useDirectory } from "@/contexts/directory-context"
import { getSessionMessages, type ChatMessage } from "@/lib/api"

const models = [
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
  { id: "claude-opus-4", name: "Claude Opus 4" },
  { id: "claude-haiku", name: "Claude Haiku" },
]

// Use window object to store shared state - persists across module reloads in dev mode
// This prevents flash to "new chat" during brief null transitions with multiple component instances
interface ChatGlobalState {
  __chatLastKnownSessionId?: string
  __chatInitialLoadComplete?: boolean
}

const getGlobalLastKnownSessionId = (): string | null => {
  if (typeof window !== 'undefined') {
    return (window as ChatGlobalState).__chatLastKnownSessionId || null
  }
  return null
}

const setGlobalLastKnownSessionId = (sessionId: string | null) => {
  if (typeof window !== 'undefined') {
    (window as ChatGlobalState).__chatLastKnownSessionId = sessionId || undefined
  }
}

const getGlobalInitialLoadComplete = (): boolean => {
  if (typeof window !== 'undefined') {
    return (window as ChatGlobalState).__chatInitialLoadComplete || false
  }
  return false
}

const setGlobalInitialLoadComplete = (complete: boolean) => {
  if (typeof window !== 'undefined') {
    (window as ChatGlobalState).__chatInitialLoadComplete = complete
  }
}

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlSessionId = searchParams.get("session")

  const [text, setText] = useState<string>("")
  const [model, setModel] = useState<string>(models[0].id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [pendingBlocks, setPendingBlocks] = useState<StreamingBlock[]>([])
  const prevIsStreaming = useRef(false)
  // Track if we're creating a new session (started streaming without URL session)
  const isCreatingNewSession = useRef(false)
  // NOTE: initialLoadComplete is now global (stored on window) to coordinate across instances
  const { rootDirectory } = useDirectory()
  const {
    sendMessage,
    resumeSession,
    isStreaming,
    streamingBlocks,
    lastError,
    currentSessionId,
  } = useAgent()

  // NOTE: globalLastKnownSessionId is now updated during render (see hasMessages calculation)

  // Sync URL session with context on mount/URL change
  useEffect(() => {
    if (urlSessionId && urlSessionId !== currentSessionId) {
      // URL has session - sync to context
      resumeSession(urlSessionId)
    }
  }, [urlSessionId, currentSessionId, resumeSession])

  // Update URL when a NEW session is created (from streaming)
  useEffect(() => {
    // Only redirect if we're actively creating a new session
    if (currentSessionId && !urlSessionId && isCreatingNewSession.current) {
      router.replace(`/chat?session=${currentSessionId}`, { scroll: false })
      isCreatingNewSession.current = false
    }
  }, [currentSessionId, urlSessionId, router])

  // Load messages when URL session changes (initial load or navigation)
  // Note: This does NOT run when streaming ends - that's handled by handleStreamEnd
  // Use undefined as sentinel to distinguish "never loaded" from "loaded with null"
  const prevUrlSessionId = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    async function loadMessages() {
      // Only load if URL session actually changed (not just on mount during streaming)
      // Note: undefined !== null, so this will run on first mount even with null urlSessionId
      if (urlSessionId === prevUrlSessionId.current) {
        return
      }
      prevUrlSessionId.current = urlSessionId

      if (!urlSessionId) {
        // No session in URL - clear messages (new chat)
        if (!isStreaming) {
          // Check if another instance has already set a session (two-instance mount scenario)
          const existingGlobalSession = getGlobalLastKnownSessionId()
          setMessages([])
          setPendingBlocks([])
          // Only reset global state if we were previously on a session AND no other instance
          // has set a session. This prevents the null-instance from overwriting the session-instance.
          if (prevUrlSessionId.current && !existingGlobalSession) {
            setGlobalLastKnownSessionId(null)
            setGlobalInitialLoadComplete(true)
          } else if (!existingGlobalSession) {
            // First mount with no session and no global session - mark load complete
            setGlobalInitialLoadComplete(true)
          }
          // If existingGlobalSession is set, don't mark as complete - let the other instance handle it
        }
        return
      }

      // Don't load while streaming - we have optimistic updates
      if (isStreaming) {
        return
      }

      setIsLoadingMessages(true)
      try {
        const msgs = await getSessionMessages(urlSessionId)
        setMessages(msgs)
        setPendingBlocks([]) // Clear any stale pending blocks
        // Mark initial load as complete - we've loaded session messages
        setGlobalInitialLoadComplete(true)
      } catch (error) {
        console.error("Failed to load messages:", error)
        // Even on error, mark as complete so we don't stay in loading state forever
        setGlobalInitialLoadComplete(true)
      } finally {
        setIsLoadingMessages(false)
      }
    }

    loadMessages()
  }, [urlSessionId, isStreaming])

  // Track if we should skip the next message reload (when user sends new message quickly)
  const loadRequestId = useRef(0)

  // Capture streaming blocks when streaming ends and reload messages
  useEffect(() => {
    async function handleStreamEnd() {
      // Detect transition from streaming to not streaming
      if (prevIsStreaming.current && !isStreaming) {
        // Capture full blocks (including tool calls) to display while loading
        if (streamingBlocks.length > 0) {
          setPendingBlocks([...streamingBlocks])
        }

        // Reload messages from backend
        if (currentSessionId) {
          const requestId = ++loadRequestId.current

          // Small delay to ensure backend has processed the message
          await new Promise((resolve) => setTimeout(resolve, 300))

          // Check if a new request was made (user sent another message)
          if (loadRequestId.current !== requestId) {
            return // Skip this reload, newer one will handle it
          }

          try {
            const msgs = await getSessionMessages(currentSessionId)

            // Double check we're still the latest request
            if (loadRequestId.current !== requestId) {
              return
            }

            setMessages(msgs)
            // Clear pending blocks after successful load
            setPendingBlocks([])
          } catch (error) {
            console.error("Failed to reload messages:", error)
            // Keep pending blocks visible on error
          }
        }
      }
      prevIsStreaming.current = isStreaming
    }

    handleStreamEnd()
  }, [isStreaming, currentSessionId, streamingBlocks])

  const status = isStreaming ? "streaming" : lastError ? "error" : "ready"
  
  // Update global session state DURING RENDER (not in effect) so other instances see it immediately
  const sessionId = urlSessionId || currentSessionId
  if (sessionId) {
    setGlobalLastKnownSessionId(sessionId)
  }
  
  // Read global state for hasMessages calculation
  const globalSession = getGlobalLastKnownSessionId()
  const globalLoadComplete = getGlobalInitialLoadComplete()
  
  // Show chat UI if we have messages, are streaming, OR have a session (URL, context, or global)
  // CRITICAL: Also show chat UI if initial load hasn't completed - this prevents the
  // "new chat" flash during hydration when urlSessionId may briefly be null
  const hasMessages = messages.length > 0 || isStreaming || pendingBlocks.length > 0 || streamingBlocks.length > 0 || !!urlSessionId || !!currentSessionId || !!globalSession || !globalLoadComplete

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!text || isStreaming) {
      return
    }

    // Cancel any pending message reloads from previous stream
    loadRequestId.current++

    // Track if we're starting a new session (no session in URL)
    if (!urlSessionId) {
      isCreatingNewSession.current = true
    }

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      type: "user",
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Clear pending blocks from previous response
    setPendingBlocks([])

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
                  streamingBlocks={streamingBlocks}
                  pendingBlocks={pendingBlocks}
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
