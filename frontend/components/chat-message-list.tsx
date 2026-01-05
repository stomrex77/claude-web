"use client"

import { useEffect, useRef } from "react"
import { ChatMessage } from "@/components/chat-message"
import type { ChatMessage as ChatMessageType } from "@/lib/api"
import { IconRobot } from "@tabler/icons-react"

interface ChatMessageListProps {
  messages: ChatMessageType[]
  streamingContent?: string
  isStreaming?: boolean
}

// Animated status dot for streaming indicator
function StreamingDot() {
  return (
    <span
      className="inline-block size-2 rounded-full shrink-0 mt-2 bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"
    />
  )
}

export function ChatMessageList({
  messages,
  streamingContent,
  isStreaming,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
    >
      {messages.length === 0 && !isStreaming ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <div className="text-center">
            <IconRobot className="mx-auto mb-2 size-8" />
            <p>Start a conversation with Claude</p>
          </div>
        </div>
      ) : (
        <div className="py-4 space-y-1">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <ChatMessage
              message={{
                id: "streaming",
                type: "assistant",
                content: streamingContent,
                timestamp: new Date().toISOString(),
                isStreaming: true,
              }}
            />
          )}

          {/* Loading indicator - timeline style */}
          {isStreaming && !streamingContent && (
            <div className="px-4 py-2">
              <div className="flex items-start gap-3">
                <StreamingDot />
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
