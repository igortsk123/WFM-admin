"use client"

import { useTranslations } from "next-intl"
import { Lightbulb, MessageSquare } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import type { TaskDetail as TaskDetailType } from "@/lib/api/tasks"

interface TabDescriptionProps {
  task: TaskDetailType
}

export function TabDescription({ task }: TabDescriptionProps) {
  const t = useTranslations("screen.taskDetail")

  return (
    <div className="flex flex-col gap-4">
      {/* Description card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("section_description")}</CardTitle>
        </CardHeader>
        <CardContent>
          {task.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{task.description}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">{t("no_description")}</p>
          )}
        </CardContent>
      </Card>

      {/* Manager comment */}
      {task.comment && (
        <Card className="bg-muted/30 border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <MessageSquare className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium text-primary">{t("section_manager_comment")}</p>
                <p className="text-sm leading-relaxed text-foreground">{task.comment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hints */}
      {task.hints.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="size-4" />
                {t("section_hints")}
              </CardTitle>
              {task.hints.length > 3 && (
                <a href={ADMIN_ROUTES.hints} className="text-xs text-primary hover:underline">
                  {t("hints_all")}
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {task.hints.slice(0, 5).map((hint) => (
                <li key={hint.id} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 mt-0.5 size-1.5 rounded-full bg-primary/50 inline-block mt-2" />
                  {hint.text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
