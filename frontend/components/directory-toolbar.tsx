"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconArrowLeft,
  IconLayoutList,
  IconLayoutGrid,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type ViewMode = "list" | "grid"

interface DirectoryToolbarProps {
  title?: string
}

export function DirectoryToolbar({ title = "Directory" }: DirectoryToolbarProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("list")

  return (
    <div className="flex items-center justify-between h-12 px-4 border-b bg-background">
      {/* Left section - Back button and view toggles */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link href="/dashboard">
            <IconArrowLeft className="size-4" />
            <span className="sr-only">Back to Dashboard</span>
          </Link>
        </Button>

        <Separator orientation="vertical" className="h-4" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-8", viewMode === "list" && "bg-muted")}
            onClick={() => setViewMode("list")}
          >
            <IconLayoutList className="size-4" />
            <span className="sr-only">List view</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-8", viewMode === "grid" && "bg-muted")}
            onClick={() => setViewMode("grid")}
          >
            <IconLayoutGrid className="size-4" />
            <span className="sr-only">Grid view</span>
          </Button>
        </div>
      </div>

      {/* Center section - Title and hint */}
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className="text-xs text-muted-foreground/60">Double-click folder to select</span>
      </div>

      {/* Right section - Close button */}
      <Button variant="ghost" size="icon" className="size-8" asChild>
        <Link href="/dashboard">
          <IconX className="size-4" />
          <span className="sr-only">Close</span>
        </Link>
      </Button>
    </div>
  )
}
