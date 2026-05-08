"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Clock, MapPin, Users, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import type { UnassignedTaskBlock } from "@/lib/types"
import {
  distributeBlock,
  type EmployeeUtilization,
  type BlockAllocation,
} from "@/lib/api/distribution"

// ─────────────────────────────────────────────────────────────────────
// BlockDistributeSheet
//
// Sheet для распределения одного блока ЛАМА на конкретных сотрудников.
// При confirm:
//   - вызывается distributeBlock(blockId, allocations)
//   - блок обновляется в state, в MOCK_TASKS появляются N новых Task'ов
//   - onConfirmed уведомляет родителя что нужно перезагрузить blocks/tasks
// ─────────────────────────────────────────────────────────────────────

interface Props {
  block: UnassignedTaskBlock | null
  employees: EmployeeUtilization[]
  open: boolean
  canEdit: boolean
  onClose: () => void
  onConfirmed: () => void
}

function fmtHM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

function getInitials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?"
}

export function BlockDistributeSheet({ block, employees, open, canEdit, onClose, onConfirmed }: Props) {
  const tCommon = useTranslations("common")
  const [allocations, setAllocations] = React.useState<Record<number, number>>({})
  const [busy, setBusy] = React.useState(false)
  const [autoBusy, setAutoBusy] = React.useState(false)

  // Сброс на каждом открытии нового блока
  React.useEffect(() => {
    if (block) setAllocations({})
  }, [block?.id])

  if (!block) return null

  const totalAllocated = Object.values(allocations).reduce((s, m) => s + m, 0)
  const remainingAfter = block.remaining_minutes - totalAllocated
  const progressPct = Math.min((totalAllocated / block.remaining_minutes) * 100, 100)
  const overAllocated = totalAllocated > block.remaining_minutes

  function setAlloc(userId: number, min: number) {
    setAllocations((prev) => {
      const next = { ...prev }
      if (min <= 0) delete next[userId]
      else next[userId] = min
      return next
    })
  }

  // Распределяет remaining_minutes равномерно между employees с
  // подходящей зоной в смене сегодня. Если зон-матча нет — между всеми.
  function handleAutoDistribute() {
    if (!block || employees.length === 0) return
    setAutoBusy(true)

    // Сначала employees с матчингом по зоне
    const matched = employees.filter((e) =>
      e.user.zones?.some((z) => z === block.zone_name)
    )
    const candidates = matched.length > 0 ? matched : employees

    // Сортируем по свободному времени (больше свободного → больше выделим)
    const ranked = [...candidates].sort(
      (a, b) =>
        (b.shift_total_min - b.assigned_min) -
        (a.shift_total_min - a.assigned_min)
    )

    // Распределяем remaining_minutes между ними жадно
    const next: Record<number, number> = {}
    let left = block.remaining_minutes
    for (const emp of ranked) {
      if (left <= 0) break
      const free = Math.max(0, emp.shift_total_min - emp.assigned_min)
      const give = Math.min(free, left, 240) // не больше 4ч в одни руки
      if (give > 0) {
        next[emp.user.id] = give
        left -= give
      }
    }
    // Если ещё осталось — кидаем равномерно сверх ranked
    if (left > 0 && ranked.length > 0) {
      const per = Math.ceil(left / ranked.length)
      for (const emp of ranked) {
        if (left <= 0) break
        const give = Math.min(per, left)
        next[emp.user.id] = (next[emp.user.id] ?? 0) + give
        left -= give
      }
    }

    setAllocations(next)
    setAutoBusy(false)
  }

  async function handleConfirm() {
    if (!block || totalAllocated <= 0 || overAllocated || !canEdit) return
    setBusy(true)
    try {
      const list: BlockAllocation[] = Object.entries(allocations).map(([uid, minutes]) => {
        const emp = employees.find((e) => e.user.id === Number(uid))
        const fullName = emp ? `${emp.user.last_name} ${emp.user.first_name}` : `User #${uid}`
        return { user_id: Number(uid), user_name: fullName, minutes }
      })
      const res = await distributeBlock(block.id, list)
      if (!res.success) {
        toast.error(res.error?.message ?? "Ошибка распределения")
        return
      }
      toast.success(
        `Создано ${res.task_ids?.length ?? 0} задач. Распределено ${totalAllocated} мин.`
      )
      onConfirmed()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base text-left pr-8">{block.title}</SheetTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            <span>{block.zone_name}</span>
            <span className="text-border">·</span>
            <Clock className="size-3" />
            <span>{fmtHM(block.total_minutes)} всего</span>
            {block.priority && block.priority <= 3 && (
              <>
                <span className="text-border">·</span>
                <Badge variant="destructive" className="text-[10px]">P{block.priority}</Badge>
              </>
            )}
          </div>
        </SheetHeader>

        {/* Progress summary */}
        <div className="px-4 py-3 bg-muted/50 border-b space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Распределяем: {fmtHM(totalAllocated)} из {fmtHM(block.remaining_minutes)}
            </span>
            {remainingAfter > 0 && totalAllocated > 0 && (
              <Badge variant="outline" className="text-xs">
                Осталось: {fmtHM(remainingAfter)}
              </Badge>
            )}
            {overAllocated && (
              <Badge variant="destructive" className="text-xs">
                Перебор на {fmtHM(totalAllocated - block.remaining_minutes)}
              </Badge>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                overAllocated ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Auto-distribute button */}
        <div className="px-4 py-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoDistribute}
            disabled={!canEdit || autoBusy || employees.length === 0}
            className="w-full gap-2"
          >
            <Wand2 className="size-4" />
            Авто-распределение по сменам
          </Button>
        </div>

        {/* Employees */}
        <ScrollArea className="flex-1 px-4 py-3">
          {employees.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              <Users className="size-6 mx-auto mb-2 opacity-50" />
              На сегодня в магазине нет открытых смен
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Сотрудники в смене ({employees.length})
              </p>
              {employees.map((emp) => {
                const cur = allocations[emp.user.id] ?? 0
                const free = Math.max(0, emp.shift_total_min - emp.assigned_min)
                const fullName = `${emp.user.last_name} ${emp.user.first_name}`
                const matchesZone = emp.user.zones?.includes(block.zone_name)
                return (
                  <div
                    key={emp.user.id}
                    className={cn(
                      "p-3 rounded-md border bg-card flex items-center gap-3",
                      matchesZone && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={emp.user.avatar_url} alt={fullName} />
                      <AvatarFallback className="text-xs">
                        {getInitials(emp.user.first_name, emp.user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        Свободно: {fmtHM(free)}
                        {matchesZone && (
                          <span className="ml-2 text-primary">· зона совпадает</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        step={15}
                        value={cur || ""}
                        onChange={(e) =>
                          setAlloc(emp.user.id, parseInt(e.target.value) || 0)
                        }
                        disabled={!canEdit}
                        placeholder="мин"
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">мин</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="px-4 py-3 border-t flex-row gap-2 sm:flex-row sm:gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={busy} className="flex-1 sm:flex-initial">
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canEdit || busy || totalAllocated <= 0 || overAllocated}
            className="flex-1 sm:flex-initial"
          >
            {busy ? "Распределяем..." : "Распределить"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
