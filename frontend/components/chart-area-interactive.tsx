"use client"

import { useEffect, useState } from "react"
import { getRateLimits, type RateLimitData, type UsageLimit } from "@/lib/api"

function UsageBar({ limit, loading }: { limit: UsageLimit | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!limit) {
    return (
      <div className="text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  const percent = limit.percentUsed
  const barWidth = Math.min(percent, 100)

  // Color based on usage level
  const getBarColor = (percent: number) => {
    if (percent >= 80) return "bg-red-500"
    if (percent >= 60) return "bg-yellow-500"
    return "bg-amber-700"
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{limit.name}</span>
        <span className="tabular-nums text-muted-foreground">{percent}% used</span>
      </div>
      <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor(percent)} transition-all duration-500`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {limit.resetTime && (
        <p className="text-xs text-muted-foreground">
          Resets {limit.resetTime}
          {limit.resetTimezone && ` (${limit.resetTimezone})`}
        </p>
      )}
    </div>
  )
}

export function ChartAreaInteractive() {
  const [rateLimits, setRateLimits] = useState<RateLimitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLimits = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getRateLimits()
        setRateLimits(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load usage")
      } finally {
        setLoading(false)
      }
    }

    fetchLimits()
    // Refresh every 60 seconds
    const interval = setInterval(fetchLimits, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Usage Limits</h2>
        <p className="text-sm text-muted-foreground">
          Your Claude Code subscription usage
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <UsageBar limit={rateLimits?.currentSession ?? null} loading={loading} />
        <UsageBar limit={rateLimits?.currentWeekAllModels ?? null} loading={loading} />
        <UsageBar limit={rateLimits?.currentWeekSonnetOnly ?? null} loading={loading} />
      </div>

      {rateLimits?.timestamp && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated: {new Date(rateLimits.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
