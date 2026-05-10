"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Check, ChevronsUpDown } from "lucide-react"
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { getUsers, type UserWithAssignment } from "@/lib/api"

interface AssignDialogContentProps {
  onAssign: (userId: number) => Promise<void>
  onClose: () => void
  isPending?: boolean
}

export function AssignDialogContent({ onAssign, onClose, isPending }: AssignDialogContentProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [candidates, setCandidates] = useState<UserWithAssignment[]>([])

  useEffect(() => {
    let cancelled = false
    getUsers({
      employment_type: "STAFF",
      archived: false,
      page: 1,
      page_size: 30,
    })
      .then((res) => {
        if (cancelled) return
        setCandidates(res.data.slice(0, 20))
      })
      .catch(() => {
        if (cancelled) return
        setCandidates([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = candidates.find((u) => u.id === selectedId)

  async function handleSubmit() {
    if (!selectedId) return
    await onAssign(selectedId)
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("assign_dialog_title")}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("assign_assignee_label")}</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal"
              >
                {selected
                  ? `${selected.last_name} ${selected.first_name} ${selected.middle_name ?? ""}`.trim()
                  : t("assign_assignee_placeholder")}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder={t("assign_assignee_placeholder")} />
                <CommandList>
                  <CommandEmpty>{tCommon("noResults")}</CommandEmpty>
                  <CommandGroup>
                    {candidates.map((u) => {
                      const fullName = `${u.last_name} ${u.first_name} ${u.middle_name ?? ""}`.trim()
                      return (
                        <CommandItem
                          key={u.id}
                          value={fullName}
                          onSelect={() => {
                            setSelectedId(u.id)
                            setOpen(false)
                          }}
                        >
                          <Check className={cn("mr-2 size-4", selectedId === u.id ? "opacity-100" : "opacity-0")} />
                          {fullName}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!selectedId || isPending}>
          {t("assign_submit")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
