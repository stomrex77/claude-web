"use client"

import { useEffect, useRef, useLayoutEffect } from "react"
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
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on mount and when messages change
  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" })
  }, [messages.length])

  // Smooth scroll for streaming content updates
  useEffect(() => {
    if (streamingContent) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [streamingContent])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
    >
      {messages.length === 0 && !isStreaming ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <div className="text-center">
            <IconRobot className="mx-auto mb-2 size-8" />
            <p>Start a conversation with Claude</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col min-h-full">
          {/* Spacer to push content to bottom when there's not much content */}
          <div className="flex-1" />

          {/* Messages container */}
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

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
