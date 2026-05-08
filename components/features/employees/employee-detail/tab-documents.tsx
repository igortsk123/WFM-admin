"use client"

import { useTranslations } from "next-intl"
import { AlertCircle, FileText } from "lucide-react"

import type { UserDetail } from "@/lib/api/users"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import type { FormatDate } from "./_shared"

interface EmployeeDocumentsTabProps {
  user: UserDetail
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  locale: string
  formatDate: FormatDate
}

const DOC_LABELS = {
  PASSPORT: "documents.doc_passport",
  INN: "documents.doc_inn",
  SNILS: "documents.doc_snils",
  CONTRACT: "documents.doc_contract",
} as const

const FREELANCE_DOCS = [
  { type: "PASSPORT" as const },
  { type: "INN" as const },
  { type: "SNILS" as const },
  { type: "CONTRACT" as const },
]

export function EmployeeDocumentsTab({ user, t, locale, formatDate }: EmployeeDocumentsTabProps) {
  const allMissing =
    user.type === "FREELANCE" &&
    (!user.freelance_documents || user.freelance_documents.every((d) => !d.uploaded_at))

  return (
    <div className="flex flex-col gap-4">
      {user.type === "FREELANCE" && allMissing && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{t("documents.freelance_required_alert")}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FREELANCE_DOCS.map((doc) => {
          const found = user.freelance_documents?.find((d) => d.type === doc.type)
          const uploaded = found?.uploaded_at ?? null
          const isRequired = user.type === "FREELANCE"

          return (
            <Card key={doc.type}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {/* File preview placeholder */}
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center border">
                    <FileText className="size-10 text-muted-foreground" strokeWidth={1.5} />
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{t(DOC_LABELS[doc.type])}</span>
                      {uploaded ? (
                        <span className="text-xs text-muted-foreground">
                          {t("documents.uploaded_at", { date: formatDate(uploaded, locale) })}
                        </span>
                      ) : (
                        <Badge
                          variant={isRequired ? "destructive" : "secondary"}
                          className="w-fit text-xs"
                        >
                          {t("documents.not_uploaded")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {uploaded ? (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 min-h-11">
                          {t("documents.download")}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 min-h-11">
                          {t("documents.replace")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="w-full min-h-11">
                        {t("documents.upload")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
