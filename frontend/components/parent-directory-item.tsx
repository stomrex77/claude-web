"use client"

import * as React from "react"
import { IconCornerLeftUp } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface ParentDirectoryItemProps {
  onNavigateUp: () => void
}

export function ParentDirectoryItem({ onNavigateUp }: ParentDirectoryItemProps) {
  return (
    <div
      className={cn(
        "flex items-center h-7 cursor-pointer select-none",
        "hover:bg-muted/50 transition-colors",
        "pl-2"
      )}
      onClick={onNavigateUp}
    >
      {/* Empty space for chevron alignment */}
      <span className="w-4 h-4 flex items-center justify-center mr-1" />

      {/* Back icon */}
      <IconCornerLeftUp className="size-4 text-muted-foreground mr-2 shrink-0" />

      {/* Label */}
      <span className="text-sm text-muted-foreground">..</span>
    </div>
  )
}
