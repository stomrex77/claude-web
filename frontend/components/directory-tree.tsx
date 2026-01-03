"use client"

import * as React from "react"
import { toast } from "sonner"
import { TreeItem } from "@/components/tree-item"
import { useDirectory } from "@/contexts/directory-context"
import type { TreeNode } from "@/app/directory/mock-data"

interface DirectoryTreeProps {
  data: TreeNode[]
}

export function DirectoryTree({ data }: DirectoryTreeProps) {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const { setRootDirectory } = useDirectory()

  const handleToggle = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelect = React.useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handleSetRoot = React.useCallback((path: string) => {
    // Convert path to display format with ~
    const displayPath = `~${path}`
    setRootDirectory(displayPath)
    // Show success notification
    toast.success("Root directory updated", {
      description: displayPath,
    })
  }, [setRootDirectory])

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {data.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          depth={0}
          path=""
          expandedIds={expandedIds}
          selectedId={selectedId}
          onToggle={handleToggle}
          onSelect={handleSelect}
          onSetRoot={handleSetRoot}
        />
      ))}
    </div>
  )
}
