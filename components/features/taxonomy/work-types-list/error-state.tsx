"use client"

import { AlertCircle, RefreshCw } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { PageHeader } from "@/components/shared/page-header"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import type { TFn } from "./_shared"

interface ErrorStateProps {
  onRetry: () => void
  t: TFn
  tCommon: TFn
}

export function WorkTypesErrorState({ onRetry, t, tCommon }: ErrorStateProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("page_title")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.taxonomy") },
          { label: t("breadcrumbs.work_types") },
        ]}
      />
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription className="flex items-center gap-3">
          {tCommon("error")}
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="size-3.5 mr-1.5" aria-hidden="true" />
            {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
