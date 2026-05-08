import type { ReactNode } from "react"

interface KpiMiniCardProps {
  label: string
  value: number | string
  icon?: ReactNode
  warn?: boolean
  colorClass?: string
}

export function KpiMiniCard({ label, value, icon, warn, colorClass }: KpiMiniCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <span
        className={`text-xl font-semibold leading-tight ${
          warn ? "text-warning" : colorClass ?? "text-foreground"
        }`}
      >
        {value}
        {warn && (
          <span className="ml-1 inline-flex size-1.5 rounded-full bg-warning align-middle" />
        )}
      </span>
    </div>
  )
}
