"use client"

const usageData = [
  {
    label: "Current Session",
    used: 13,
    limit: 100,
    resetTime: "Resets in 1 hr 43 min",
  },
  {
    label: "All Models",
    used: 2,
    limit: 100,
    resetTime: "Resets Fri 10:00 PM",
  },
  {
    label: "Sonnet Only",
    used: 0,
    limit: 100,
    resetTime: "You haven't used Sonnet yet",
  },
]

function UsageBar({
  label,
  used,
  limit,
  resetTime,
}: {
  label: string
  used: number
  limit: number
  resetTime: string
}) {
  const percentage = Math.min((used / limit) * 100, 100)
  const isHigh = percentage > 80
  const isMedium = percentage > 50 && percentage <= 80

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm font-medium tabular-nums">
          {percentage.toFixed(0)}% used
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${
            isHigh
              ? "bg-destructive"
              : isMedium
                ? "bg-chart-4"
                : "bg-primary"
          }`}
          style={{ width: `${Math.max(percentage, 1)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {resetTime}
      </p>
    </div>
  )
}

export function ChartAreaInteractive() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Plan Usage Limits</h2>
        <p className="text-sm text-muted-foreground">
          Current usage across different models and limits
        </p>
      </div>
      <div className="space-y-6">
        {usageData.map((item) => (
          <UsageBar key={item.label} {...item} />
        ))}
      </div>
    </div>
  )
}
