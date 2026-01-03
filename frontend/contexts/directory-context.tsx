"use client"

import * as React from "react"

const STORAGE_KEY = "claude-web-root-directory"
const DEFAULT_DIRECTORY = "~"

interface DirectoryContextType {
  rootDirectory: string
  setRootDirectory: (path: string) => void
  resetToDefault: () => void
  isHydrated: boolean
}

const DirectoryContext = React.createContext<DirectoryContextType | undefined>(
  undefined
)

export function DirectoryProvider({ children }: { children: React.ReactNode }) {
  const [rootDirectory, setRootDirectoryState] = React.useState(DEFAULT_DIRECTORY)
  const [isHydrated, setIsHydrated] = React.useState(false)

  // Load from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setRootDirectoryState(stored)
    }
    setIsHydrated(true)
  }, [])

  // Reset to default directory
  const resetToDefault = React.useCallback(() => {
    setRootDirectoryState(DEFAULT_DIRECTORY)
    localStorage.setItem(STORAGE_KEY, DEFAULT_DIRECTORY)
  }, [])

  // Wrapper that also persists to localStorage
  const setRootDirectory = React.useCallback((path: string) => {
    setRootDirectoryState(path)
    localStorage.setItem(STORAGE_KEY, path)
  }, [])

  const value = React.useMemo(() => ({
    rootDirectory,
    setRootDirectory,
    resetToDefault,
    isHydrated,
  }), [rootDirectory, setRootDirectory, resetToDefault, isHydrated])

  return (
    <DirectoryContext.Provider value={value}>
      {children}
    </DirectoryContext.Provider>
  )
}

export function useDirectory() {
  const context = React.useContext(DirectoryContext)
  if (context === undefined) {
    throw new Error("useDirectory must be used within a DirectoryProvider")
  }
  return context
}
