"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Check, ChevronsUpDown } from "lucide-react"
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { MOCK_USERS } from "@/lib/mock-data/users"

interface TransferDialogContentProps {
  currentAssigneeId?: number | null
  onTransfer: (userId: number) => Promise<void>
  onClose: () => void
  isPending?: boolean
}

export function TransferDialogContent({ currentAssigneeId, onTransfer, onClose, isPending }: TransferDialogContentProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const candidates = MOCK_USERS.filter(
    (u) => !u.archived && u.type === "STAFF" && u.id !== currentAssigneeId
  ).slice(0, 20)

  const selected = candidates.find((u) => u.id === selectedId)

  async function handleSubmit() {
    if (!selectedId) return
    await onTransfer(selectedId)
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("transfer_dialog_title")}</DialogTitle>
        <DialogDescription>{t("transfer_dialog_desc")}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("transfer_assignee_label")}</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal"
              >
                {selected
                  ? `${selected.last_name} ${selected.first_name} ${selected.middle_name ?? ""}`
                  : t("transfer_assignee_placeholder")}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder={t("transfer_assignee_placeholder")} />
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
          {t("transfer_submit")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
