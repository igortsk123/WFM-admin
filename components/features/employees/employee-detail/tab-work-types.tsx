"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Wrench } from "lucide-react"

import type { UserDetail } from "@/lib/api/users"
import type { EmployeeWorkTypeRow } from "@/lib/api"
import { getEmployeeWorkTypes, updateUser } from "@/lib/api"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"

interface EmployeeWorkTypesTabProps {
  user: UserDetail
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

export function EmployeeWorkTypesTab({ user, t }: EmployeeWorkTypesTabProps) {
  const [rows, setRows] = useState<EmployeeWorkTypeRow[] | null>(null)
  // Set отмеченных типов — optimistic local state
  const [checked, setChecked] = useState<Set<string>>(new Set())
  // Идущая запись — чтобы не отправить параллельно две мутации
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await getEmployeeWorkTypes(user.id)
    setRows(res.data)
    setChecked(new Set(res.data.filter((r) => r.checked).map((r) => r.work_type)))
  }, [user.id])

  useEffect(() => {
    void load()
  }, [load])

  const handleToggle = useCallback(
    async (workType: string, enable: boolean) => {
      // Optimistic update
      const next = new Set(checked)
      if (enable) next.add(workType)
      else next.delete(workType)
      setChecked(next)

      setSaving(true)
      try {
        const res = await updateUser(user.id, {
          preferred_work_types: Array.from(next),
        })
        if (res.success) {
          toast.success(t("work_types.saved"))
        } else {
          // Revert
          setChecked(checked)
          toast.error(t("toast.error"))
        }
      } catch {
        setChecked(checked)
        toast.error(t("toast.error"))
      } finally {
        setSaving(false)
      }
    },
    [checked, user.id, t],
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="size-4 text-muted-foreground" aria-hidden="true" />
          {t("work_types.card_title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("work_types.hint")}</p>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((row) => {
              const isChecked = checked.has(row.work_type)
              const checkboxId = `wt-${user.id}-${row.work_type}`
              const countLabel =
                row.history_count > 0
                  ? t("work_types.count_label", { count: row.history_count })
                  : t("work_types.never")
              return (
                <li key={row.work_type}>
                  <label
                    htmlFor={checkboxId}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/40"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={isChecked}
                      disabled={saving}
                      onCheckedChange={(v) => handleToggle(row.work_type, v === true)}
                    />
                    <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className="text-sm font-medium">{row.work_type}</span>
                      <span className="text-xs text-muted-foreground">{countLabel}</span>
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
