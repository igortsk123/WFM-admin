"use client"

import * as React from "react"
import { ExternalLink, Store } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { MAP_PINS } from "./_shared"

interface MapViewProps {
  onStoreClick: (id: number) => void
}

export function MapView({ onStoreClick }: MapViewProps) {
  const [activePin, setActivePin] = React.useState<number | null>(null)

  return (
    <div className="relative aspect-video w-full rounded-lg border border-border bg-muted overflow-hidden">
      {/* Subtle map grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-muted-foreground/50 select-none pointer-events-none">
          Карта (демо)
        </p>
      </div>

      {MAP_PINS.map((pin) => (
        <Popover
          key={pin.id}
          open={activePin === pin.id}
          onOpenChange={(open) => setActivePin(open ? pin.id : null)}
        >
          <PopoverTrigger asChild>
            <button
              style={{ top: pin.top, left: pin.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={pin.name}
            >
              <Store className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="center" side="top">
            <div className="space-y-1.5">
              <p className="font-mono text-xs text-muted-foreground uppercase">{pin.label}</p>
              <p className="text-sm font-medium leading-snug">{pin.name}</p>
              <Button
                size="sm"
                className="w-full mt-1 h-8 text-xs"
                onClick={() => {
                  onStoreClick(pin.id)
                  setActivePin(null)
                }}
              >
                <ExternalLink className="size-3.5 mr-1.5" />
                Открыть
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  )
}
