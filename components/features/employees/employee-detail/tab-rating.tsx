"use client"

import { useTranslations } from "next-intl"
import { Star } from "lucide-react"

import type { UserDetail } from "@/lib/api/users"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { EmptyState } from "@/components/shared"

interface EmployeeRatingTabProps {
  user: UserDetail
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

const MOCK_FREELANCE_RATING = {
  overall: 4.2,
  criteria: [
    { key: "criteria_shift_show",    score: 4.8, max: 5 },
    { key: "criteria_task_speed",    score: 4.1, max: 5 },
    { key: "criteria_task_quality",  score: 4.5, max: 5 },
    { key: "criteria_rework",        score: 3.9, max: 5 },
    { key: "criteria_relative_speed",score: 4.0, max: 5 },
    { key: "criteria_total_tasks",   score: 87, max: 200, isCount: true },
    { key: "criteria_experience",    score: 9, max: 24, isCount: true, unit: "мес." },
  ] as Array<{ key: string; score: number; max: number; isCount?: boolean; unit?: string }>,
}

export function EmployeeRatingTab({ user, t }: EmployeeRatingTabProps) {
  const hasRating = user.rating != null || (user.freelancer_status === "ACTIVE")

  if (!hasRating) {
    return (
      <EmptyState icon={Star} title={t("rating_tab.no_data")} description="" />
    )
  }

  // Use user's actual LAMA rating if present; criteria breakdown пока synthetic
  // (backend ещё не отдаёт per-criteria scores — TODO: backend provides this on real swap).
  const ratingData = {
    ...MOCK_FREELANCE_RATING,
    overall: user.rating ?? MOCK_FREELANCE_RATING.overall,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Overall rating card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl font-bold text-primary">{ratingData.overall.toFixed(1)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">{t("rating_tab.overall")}</span>
              <div className="flex items-center gap-1" aria-label={`${ratingData.overall} out of 5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-4 ${star <= Math.round(ratingData.overall) ? "text-warning fill-warning" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-criteria breakdown */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-5">
            {ratingData.criteria.map((c) => (
              <div key={c.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground">
                    {t(`rating_tab.${c.key}` as Parameters<typeof t>[0])}
                  </span>
                  <span className="text-sm font-medium text-foreground shrink-0">
                    {c.isCount ? c.score : `${c.score.toFixed(1)} / ${c.max}`}
                    {c.unit ? ` ${c.unit}` : ""}
                  </span>
                </div>
                {!c.isCount && (
                  <Progress
                    value={(c.score / c.max) * 100}
                    className="h-1.5"
                    aria-label={`${c.score} out of ${c.max}`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
