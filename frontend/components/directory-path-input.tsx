"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  IconFolder,
  IconFile,
  IconHome,
  IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDirectory } from "@/contexts/directory-context"
import { fetchDirectoryTree, validateDirectory, type TreeNode } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Suggestion {
  name: string
  path: string
  type: "folder" | "file"
}

export function DirectoryPathInput() {
  const { rootDirectory, setRootDirectory, resetToDefault } = useDirectory()

  const [inputValue, setInputValue] = React.useState(rootDirectory)
  const [isEditing, setIsEditing] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const suggestionsRef = React.useRef<HTMLDivElement>(null)
  const selectedItemRef = React.useRef<HTMLButtonElement>(null)

  // Sync input value when rootDirectory changes externally
  React.useEffect(() => {
    if (!isEditing) {
      setInputValue(rootDirectory)
    }
  }, [rootDirectory, isEditing])

  // Scroll selected item into view
  React.useEffect(() => {
    if (selectedIndex >= 0 && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      })
    }
  }, [selectedIndex])

  // Fetch suggestions based on input
  const fetchSuggestions = React.useCallback(async (path: string) => {
    if (!path || path.length < 1) {
      setSuggestions([])
      return
    }

    setIsLoadingSuggestions(true)

    try {
      // Determine the parent directory to fetch
      let parentPath = path
      let searchTerm = ""

      // If path ends with /, fetch that directory
      // Otherwise, fetch parent and filter by the last segment
      if (!path.endsWith("/")) {
        const lastSlash = path.lastIndexOf("/")
        if (lastSlash > 0) {
          parentPath = path.substring(0, lastSlash)
          searchTerm = path.substring(lastSlash + 1).toLowerCase()
        } else if (path.startsWith("~")) {
          parentPath = "~"
          searchTerm = path.substring(1).toLowerCase()
        }
      }

      const result = await fetchDirectoryTree(parentPath)

      let filtered = result.tree.map((node: TreeNode) => ({
        name: node.name,
        path: `${parentPath}/${node.name}`,
        type: node.type,
      }))

      // Filter by search term if present
      if (searchTerm) {
        filtered = filtered.filter((item) =>
          item.name.toLowerCase().startsWith(searchTerm)
        )
      }

      // Sort: folders first, then alphabetically
      filtered.sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1
        if (a.type !== "folder" && b.type === "folder") return 1
        return a.name.localeCompare(b.name)
      })

      // Limit suggestions
      setSuggestions(filtered.slice(0, 10))
    } catch {
      setSuggestions([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [])

  // Debounced suggestion fetching
  React.useEffect(() => {
    if (!isEditing || !showSuggestions) return

    const timer = setTimeout(() => {
      fetchSuggestions(inputValue)
    }, 200)

    return () => clearTimeout(timer)
  }, [inputValue, isEditing, showSuggestions, fetchSuggestions])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setSelectedIndex(-1)
    setShowSuggestions(true)
  }

  const handleInputFocus = () => {
    setIsEditing(true)
    setShowSuggestions(true)
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay blur to allow clicking on suggestions
    const relatedTarget = e.relatedTarget as HTMLElement
    if (suggestionsRef.current?.contains(relatedTarget)) {
      return
    }

    setTimeout(() => {
      setIsEditing(false)
      setShowSuggestions(false)
      setInputValue(rootDirectory)
    }, 150)
  }

  const selectSuggestion = async (suggestion: Suggestion) => {
    if (suggestion.type === "folder") {
      // Navigate to folder
      try {
        const validation = await validateDirectory(suggestion.path)
        if (validation.valid) {
          setRootDirectory(suggestion.path)
          setInputValue(suggestion.path)
          toast.success("Navigated to", { description: suggestion.path })
        } else {
          toast.error("Invalid directory", {
            description: validation.error || "Path does not exist",
          })
        }
      } catch {
        setRootDirectory(suggestion.path)
        setInputValue(suggestion.path)
      }
    } else {
      // For files, just update the input (future: could open file)
      setInputValue(suggestion.path)
    }

    setShowSuggestions(false)
    setIsEditing(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        return
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        return
      }

      if (e.key === "Tab" && selectedIndex >= 0) {
        e.preventDefault()
        const selected = suggestions[selectedIndex]
        if (selected.type === "folder") {
          // Autocomplete the path with trailing slash for further navigation
          setInputValue(selected.path + "/")
          setSelectedIndex(-1)
        } else {
          selectSuggestion(selected)
        }
        return
      }

      if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault()
        selectSuggestion(suggestions[selectedIndex])
        return
      }
    }

    if (e.key === "Enter") {
      e.preventDefault()
      const trimmedPath = inputValue.trim()

      if (!trimmedPath) {
        toast.error("Please enter a valid path")
        return
      }

      // Normalize path to start with ~
      let normalizedPath = trimmedPath
      if (!normalizedPath.startsWith("~") && !normalizedPath.startsWith("/")) {
        normalizedPath = `~/${normalizedPath}`
      }

      // Remove trailing slash if present
      if (normalizedPath.endsWith("/") && normalizedPath.length > 1) {
        normalizedPath = normalizedPath.slice(0, -1)
      }

      try {
        const validation = await validateDirectory(normalizedPath)
        if (validation.valid) {
          setRootDirectory(normalizedPath)
          setShowSuggestions(false)
          setIsEditing(false)
          inputRef.current?.blur()
        } else {
          toast.error("Invalid directory", {
            description: validation.error || "Path does not exist",
          })
        }
      } catch {
        setRootDirectory(normalizedPath)
        setShowSuggestions(false)
        setIsEditing(false)
        inputRef.current?.blur()
      }
    } else if (e.key === "Escape") {
      setInputValue(rootDirectory)
      setShowSuggestions(false)
      setIsEditing(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative flex items-center gap-2 px-4 py-2 border-b bg-background">
      {/* Home button */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2.5 shrink-0"
        onClick={resetToDefault}
        title="Go to home directory"
      >
        <IconHome className="size-4" />
        <span className="ml-1.5 text-sm">~</span>
      </Button>

      {/* Path input with autocomplete */}
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder="Enter path..."
          className={cn("h-8", isEditing && "ring-2 ring-primary/50")}
          autoComplete="off"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && isEditing && (suggestions.length > 0 || isLoadingSuggestions) && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-3 text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin mr-2" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.path}
                  ref={index === selectedIndex ? selectedItemRef : null}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors",
                    index === selectedIndex && "bg-muted"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectSuggestion(suggestion)
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {suggestion.type === "folder" ? (
                    <IconFolder className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <IconFile className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate">{suggestion.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground truncate max-w-[200px]">
                    {suggestion.path}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
