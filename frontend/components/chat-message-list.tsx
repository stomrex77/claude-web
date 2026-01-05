"use client"

import { useEffect, useRef, useLayoutEffect } from "react"
import { ChatMessage } from "@/components/chat-message"
import { StreamingMessage } from "@/components/streaming-message"
import type { ChatMessage as ChatMessageType } from "@/lib/api"
import type { StreamingBlock } from "@/contexts/agent-context"
import { IconRobot } from "@tabler/icons-react"

interface ChatMessageListProps {
  messages: ChatMessageType[]
  streamingBlocks?: StreamingBlock[]
  pendingBlocks?: StreamingBlock[]
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
  streamingBlocks,
  pendingBlocks,
  isStreaming,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Helper to scroll to bottom within the container only (not the whole page)
  const scrollToBottom = (smooth = false) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "instant",
      })
    }
  }

  // Scroll to bottom when messages change (new session or new message)
  useLayoutEffect(() => {
    scrollToBottom(false)
  }, [messages.length])

  // Smooth scroll for streaming block updates
  useEffect(() => {
    if (streamingBlocks && streamingBlocks.length > 0) {
      scrollToBottom(true)
    }
  }, [streamingBlocks])

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

          {/* Messages container with horizontal padding */}
          <div className="py-4 space-y-1 px-4 md:px-8 lg:px-16">
            <div className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Streaming message - show during streaming with blocks */}
              {isStreaming && streamingBlocks && streamingBlocks.length > 0 && (
                <StreamingMessage blocks={streamingBlocks} />
              )}

              {/* Pending blocks - show after streaming ends while loading from backend */}
              {/* Only show if the last message isn't already an assistant response */}
              {!isStreaming && pendingBlocks && pendingBlocks.length > 0 &&
               messages[messages.length - 1]?.type !== 'assistant' && (
                <StreamingMessage blocks={pendingBlocks} />
              )}

              {/* Loading indicator - timeline style */}
              {isStreaming && (!streamingBlocks || streamingBlocks.length === 0) && (
                <div className="py-2">
                  <div className="flex items-start gap-3">
                    <StreamingDot />
                    <span className="text-muted-foreground font-mono text-sm">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
