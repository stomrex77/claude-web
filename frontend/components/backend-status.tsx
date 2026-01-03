"use client"

import * as React from "react"
import { IconCircleFilled, IconRefresh } from "@tabler/icons-react"
import { checkBackendHealth, type HealthResponse } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ServiceStatus {
  name: string
  connected: boolean
}

export function BackendStatus() {
  const [health, setHealth] = React.useState<HealthResponse | null>(null)
  const [loading, setLoading] = React.useState(true)

  const checkStatus = React.useCallback(async () => {
    setLoading(true)
    const result = await checkBackendHealth()
    setHealth(result)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    checkStatus()
    // Poll every 30 seconds
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [checkStatus])

  const services: ServiceStatus[] = health
    ? [
        { name: "Backend", connected: true },
        { name: "File System", connected: health.services.fileSystem },
        { name: "Terminal", connected: health.services.terminal },
        { name: "Claude Agent", connected: health.services.agent },
      ]
    : [
        { name: "Backend", connected: false },
        { name: "File System", connected: false },
        { name: "Terminal", connected: false },
        { name: "Claude Agent", connected: false },
      ]

  const allConnected = services.every((s) => s.connected)
  const someConnected = services.some((s) => s.connected)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={checkStatus}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
          >
            {loading ? (
              <IconRefresh className="size-3 animate-spin" />
            ) : (
              <IconCircleFilled
                className={cn(
                  "size-2",
                  allConnected
                    ? "text-green-500"
                    : someConnected
                    ? "text-yellow-500"
                    : "text-red-500"
                )}
              />
            )}
            <span>
              {loading
                ? "Checking..."
                : allConnected
                ? "All Connected"
                : someConnected
                ? "Partial"
                : "Disconnected"}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-0">
          <div className="px-3 py-2 space-y-1.5">
            <div className="text-xs font-medium mb-2">Service Status</div>
            {services.map((service) => (
              <div key={service.name} className="flex items-center gap-2 text-xs">
                <IconCircleFilled
                  className={cn(
                    "size-2",
                    service.connected ? "text-green-500" : "text-red-500"
                  )}
                />
                <span>{service.name}</span>
                <span className="text-muted-foreground ml-auto">
                  {service.connected ? "Connected" : "Not Connected"}
                </span>
              </div>
            ))}
            {!health?.services.agent && health && (
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                Set ANTHROPIC_API_KEY in backend/.env
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
