"use client"

import { useTranslations, useLocale } from "next-intl"
import { LayoutGrid, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/empty-state"
import type { Operation } from "@/lib/types"
import type { TaskDetail as TaskDetailType } from "@/lib/api/tasks"

import { SubtaskAddDialogContent } from "../subtask-add-dialog-content"
import { SubtaskSuggestEditDialogContent } from "../subtask-suggest-edit-dialog-content"

import { fmtMin } from "./_shared"
import { SubtaskActionsMenu } from "./subtask-actions-menu"
import { SubtaskReviewBadge } from "./subtask-review-badge"

interface TabSubtasksProps {
  task: TaskDetailType
  isManager: boolean
  isStoreDirector: boolean
  isNetworkOps: boolean
  subtaskAddOpen: boolean
  setSubtaskAddOpen: (v: boolean) => void
  subtaskSuggestEdit: Operation | null
  setSubtaskSuggestEdit: (v: Operation | null) => void
  onSubtaskAdd: (name: string, hint?: string) => Promise<void>
  onSubtaskSuggestEdit: (subtask: Operation, newText: string) => Promise<void>
  onSubtaskDelete: (id: number) => Promise<void>
}

export function TabSubtasks({
  task,
  isManager,
  isStoreDirector,
  isNetworkOps,
  subtaskAddOpen,
  setSubtaskAddOpen,
  subtaskSuggestEdit,
  setSubtaskSuggestEdit,
  onSubtaskAdd,
  onSubtaskSuggestEdit,
  onSubtaskDelete,
}: TabSubtasksProps) {
  const t = useTranslations("screen.taskDetail")
  const locale = useLocale()

  const canAddSubtask = isManager && task.state !== "COMPLETED" && task.review_state !== "ACCEPTED"

  return (
    <div className="flex flex-col gap-4">
      {task.subtasks.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={t("subtasks_empty_title")}
          description={t("subtasks_empty_desc")}
          action={canAddSubtask ? { label: t("subtasks_add_cta"), onClick: () => setSubtaskAddOpen(true) } : undefined}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-10">{t("subtask_col_order")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{t("subtask_col_name")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-16">{t("subtask_col_hints")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-28">{t("subtask_col_status")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-24">{t("subtask_col_time")}</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {task.subtasks.map((subtask) => (
                  <tr key={subtask.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{subtask.order}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{subtask.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{subtask.hints_count > 0 ? subtask.hints_count : "—"}</td>
                    <td className="px-4 py-3"><SubtaskReviewBadge state={subtask.review_state} /></td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {subtask.duration_min ? fmtMin(subtask.duration_min, locale) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <SubtaskActionsMenu
                        subtask={subtask}
                        isStoreDirector={isStoreDirector}
                        isNetworkOps={isNetworkOps}
                        onSuggestEdit={() => setSubtaskSuggestEdit(subtask)}
                        onDelete={() => onSubtaskDelete(subtask.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {task.subtasks.map((subtask) => (
              <Card key={subtask.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5 w-5">{subtask.order}.</span>
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{subtask.name}</p>
                      <div className="flex items-center gap-2">
                        <SubtaskReviewBadge state={subtask.review_state} />
                        {subtask.duration_min && (
                          <span className="text-xs text-muted-foreground">{fmtMin(subtask.duration_min, locale)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <SubtaskActionsMenu
                    subtask={subtask}
                    isStoreDirector={isStoreDirector}
                    isNetworkOps={isNetworkOps}
                    onSuggestEdit={() => setSubtaskSuggestEdit(subtask)}
                    onDelete={() => onSubtaskDelete(subtask.id)}
                  />
                </div>
              </Card>
            ))}
          </div>

          {canAddSubtask && (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setSubtaskAddOpen(true)}>
              <Plus className="size-4 mr-1.5" />{t("subtasks_add_cta")}
            </Button>
          )}
        </>
      )}

      {/* Subtask add dialog */}
      <Dialog open={subtaskAddOpen} onOpenChange={setSubtaskAddOpen}>
        <SubtaskAddDialogContent onAdd={onSubtaskAdd} onClose={() => setSubtaskAddOpen(false)} />
      </Dialog>

      {/* Subtask suggest-edit dialog */}
      <Dialog open={subtaskSuggestEdit !== null} onOpenChange={(v) => { if (!v) setSubtaskSuggestEdit(null) }}>
        {subtaskSuggestEdit && (
          <SubtaskSuggestEditDialogContent
            currentText={subtaskSuggestEdit.name}
            onSubmit={(newText) => onSubtaskSuggestEdit(subtaskSuggestEdit, newText)}
            onClose={() => setSubtaskSuggestEdit(null)}
          />
        )}
      </Dialog>
    </div>
  )
}
