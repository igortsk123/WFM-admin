import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterChipProps {
  label: string
  value: string
  onRemove: () => void
  className?: string
}

export function FilterChip({ label, value, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground",
        "text-xs font-medium px-3 h-7",
        className
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label} ${value}`}
        className="ml-0.5 rounded-full p-0.5 hover:bg-accent-foreground/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  )
}
