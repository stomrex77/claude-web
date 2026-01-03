"use client"

import * as React from "react"
import { IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { getFileIcon, getFolderIcon } from "@/lib/file-icons"
import type { TreeNode } from "@/app/directory/mock-data"

interface TreeItemProps {
  node: TreeNode
  depth: number
  path: string
  expandedIds: Set<string>
  selectedId: string | null
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onSetRoot: (path: string) => void
}

export function TreeItem({
  node,
  depth,
  path,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
  onSetRoot,
}: TreeItemProps) {
  const isFolder = node.type === "folder"
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id

  const FolderIcon = getFolderIcon(isExpanded)
  const FileIcon = getFileIcon(node.name)
  const Icon = isFolder ? FolderIcon : FileIcon

  const currentPath = `${path}/${node.name}`

  const handleClick = () => {
    onSelect(node.id)
    if (isFolder) {
      onToggle(node.id)
    }
  }

  const handleDoubleClick = () => {
    if (isFolder) {
      onSetRoot(currentPath)
    }
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center h-7 cursor-pointer select-none",
          "hover:bg-muted/50 transition-colors",
          isSelected && "bg-primary/20"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Chevron for folders */}
        <span className="w-4 h-4 flex items-center justify-center mr-1">
          {isFolder && (
            <IconChevronRight
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          )}
        </span>

        {/* Icon */}
        <Icon className="size-4 text-muted-foreground mr-2 shrink-0" />

        {/* Name */}
        <span className="text-sm truncate">{node.name}</span>
      </div>

      {/* Children */}
      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              path={currentPath}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              onSetRoot={onSetRoot}
            />
          ))}
        </div>
      )}
    </div>
  )
}
