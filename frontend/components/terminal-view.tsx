"use client"

import * as React from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebglAddon } from "@xterm/addon-webgl"
import "@xterm/xterm/css/xterm.css"
import { getTerminalWebSocketUrl } from "@/lib/api"
import { useDirectory } from "@/contexts/directory-context"

interface TerminalViewProps {
  className?: string
}

export function TerminalView({ className }: TerminalViewProps) {
  const terminalRef = React.useRef<HTMLDivElement>(null)
  const terminalInstance = React.useRef<Terminal | null>(null)
  const fitAddon = React.useRef<FitAddon | null>(null)
  const wsRef = React.useRef<WebSocket | null>(null)
  const { rootDirectory } = useDirectory()
  const [connected, setConnected] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Initialize terminal
  React.useEffect(() => {
    if (!terminalRef.current || terminalInstance.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1a1a2e",
        foreground: "#eaeaea",
        cursor: "#f8f8f2",
        cursorAccent: "#1a1a2e",
        selectionBackground: "#44475a",
        black: "#21222c",
        red: "#ff5555",
        green: "#50fa7b",
        yellow: "#f1fa8c",
        blue: "#bd93f9",
        magenta: "#ff79c6",
        cyan: "#8be9fd",
        white: "#f8f8f2",
        brightBlack: "#6272a4",
        brightRed: "#ff6e6e",
        brightGreen: "#69ff94",
        brightYellow: "#ffffa5",
        brightBlue: "#d6acff",
        brightMagenta: "#ff92df",
        brightCyan: "#a4ffff",
        brightWhite: "#ffffff",
      },
    })

    const fit = new FitAddon()
    term.loadAddon(fit)

    term.open(terminalRef.current)

    // Try to load WebGL addon for better performance
    try {
      const webgl = new WebglAddon()
      webgl.onContextLoss(() => {
        webgl.dispose()
      })
      term.loadAddon(webgl)
    } catch {
      // WebGL not available, continue with canvas renderer
    }

    fit.fit()
    terminalInstance.current = term
    fitAddon.current = fit

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit()
        // Send resize to server
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows,
            })
          )
        }
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      term.dispose()
      terminalInstance.current = null
    }
  }, [])

  // Connect WebSocket
  React.useEffect(() => {
    if (!terminalInstance.current) return

    const term = terminalInstance.current

    // Convert root directory to absolute path for WebSocket
    const cwd = rootDirectory.startsWith("~")
      ? rootDirectory
      : `~/${rootDirectory}`

    const wsUrl = getTerminalWebSocketUrl(cwd)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError(null)
      term.clear()
      term.writeln("\x1b[32mConnected to terminal\x1b[0m")
      term.writeln("")

      // Send initial resize
      if (fitAddon.current) {
        fitAddon.current.fit()
        ws.send(
          JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows,
          })
        )
      }
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        switch (message.type) {
          case "output":
            term.write(message.data)
            break

          case "connected":
            term.writeln(`\x1b[90mSession: ${message.sessionId}\x1b[0m`)
            term.writeln(`\x1b[90mCWD: ${message.cwd}\x1b[0m`)
            term.writeln("")
            break

          case "exit":
            term.writeln("")
            term.writeln(`\x1b[33mProcess exited with code ${message.code}\x1b[0m`)
            break
        }
      } catch {
        // Handle raw data
        term.write(event.data)
      }
    }

    ws.onerror = () => {
      setError("Connection error")
      term.writeln("\x1b[31mConnection error\x1b[0m")
    }

    ws.onclose = () => {
      setConnected(false)
      term.writeln("")
      term.writeln("\x1b[33mDisconnected from terminal\x1b[0m")
    }

    // Handle user input
    const dataHandler = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }))
      }
    })

    return () => {
      dataHandler.dispose()
      ws.close()
      wsRef.current = null
    }
  }, [rootDirectory])

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b text-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-muted-foreground">
            {connected ? "Connected" : error || "Disconnected"}
          </span>
        </div>
        <span className="text-muted-foreground text-xs font-mono">
          {rootDirectory}
        </span>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2"
        style={{ backgroundColor: "#1a1a2e" }}
      />
    </div>
  )
}
