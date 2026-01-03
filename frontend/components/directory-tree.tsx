"use client"

import * as React from "react"
import { toast } from "sonner"
import { TreeItem } from "@/components/tree-item"
import { ParentDirectoryItem } from "@/components/parent-directory-item"
import { useDirectory } from "@/contexts/directory-context"
import { fetchDirectoryTree, validateDirectory, type TreeNode } from "@/lib/api"
import { IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

export function DirectoryTree() {
  const [data, setData] = React.useState<TreeNode[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const {
    rootDirectory,
    setRootDirectory,
    resetToDefault,
    navigateUp,
    canNavigateUp,
  } = useDirectory()

  // Fetch directory tree when rootDirectory changes
  React.useEffect(() => {
    const loadTree = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchDirectoryTree(rootDirectory)
        setData(result.tree)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load directory"
        setError(message)
        toast.error("Failed to load directory", { description: message })
      } finally {
        setLoading(false)
      }
    }

    loadTree()
  }, [rootDirectory])

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

  const handleSetRoot = React.useCallback(async (path: string) => {
    // Convert path to display format with ~
    const displayPath = `~${path}`

    try {
      // Validate path before setting
      const validation = await validateDirectory(displayPath)
      if (validation.valid) {
        setRootDirectory(displayPath)
        toast.success("Root directory updated", {
          description: displayPath,
        })
      } else {
        toast.error("Invalid directory", {
          description: validation.error || "Path does not exist",
        })
      }
    } catch (err) {
      // If backend is not available, still set the directory (for development)
      setRootDirectory(displayPath)
      toast.success("Root directory updated", {
        description: displayPath,
      })
    }
  }, [setRootDirectory])

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <IconLoader2 className="size-6 animate-spin" />
          <span className="text-sm">Loading directory...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="text-sm text-destructive">{error}</span>
          <span className="text-xs">Path: {rootDirectory}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetToDefault()
              toast.success("Reset to home directory")
            }}
          >
            Reset to Home (~)
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <span className="text-sm text-muted-foreground">No files found</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {/* Parent directory navigation */}
      {canNavigateUp && <ParentDirectoryItem onNavigateUp={navigateUp} />}

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
