"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import {
  ExternalLink,
} from "lucide-react"
import Link from "next/link"

import type { WorkType, AcceptancePolicy } from "@/lib/types"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

// ── Category badge colors (semantic tokens from globals.css badge vars) ──
const GROUP_COLORS: Record<string, { bg: string; text: string }> = {
  "Мерчендайзинг": {
    bg: "var(--color-badge-violet-bg-light)",
    text: "var(--color-badge-violet-text-light)",
  },
  "Логистика": {
    bg: "var(--color-badge-blue-bg-light)",
    text: "var(--color-badge-blue-text-light)",
  },
  "Касса": {
    bg: "var(--color-badge-yellow-bg-light)",
    text: "var(--color-badge-yellow-text-light)",
  },
  "Поддержка": {
    bg: "var(--color-badge-pink-bg-light)",
    text: "var(--color-badge-pink-text-light)",
  },
  "Качество": {
    bg: "var(--color-badge-green-bg-light)",
    text: "var(--color-badge-green-text-light)",
  },
  "Управление": {
    bg: "var(--color-badge-orange-bg-light)",
    text: "var(--color-badge-orange-text-light)",
  },
  "Производство": {
    bg: "var(--color-badge-blue-bg-light)",
    text: "var(--color-badge-blue-text-light)",
  },
}

export const WORK_TYPE_GROUPS = [
  "Мерчендайзинг",
  "Логистика",
  "Касса",
  "Поддержка",
  "Качество",
  "Управление",
  "Производство",
] as const

function buildSchema(t: ReturnType<typeof useTranslations>) {
  return z.object({
    code: z
      .string()
      .min(1, t("validation.required"))
      .max(20)
      .regex(/^[A-Z0-9_]+$/, "Только A-Z, 0-9, _"),
    name: z
      .string()
      .min(1, t("validation.required"))
      .max(80, t("validation.maxLength", { max: 80 })),
    group: z.string().min(1, t("validation.required")),
    default_duration_min: z
      .number({ invalid_type_error: t("validation.number") })
      .int(t("validation.integer"))
      .min(1, t("validation.min", { min: 1 }))
      .max(480, t("validation.max", { max: 480 })),
    description: z.string().max(500).optional(),
    requires_photo_default: z.boolean(),
    requires_report_default: z.boolean(),
    acceptance_policy_default: z.enum(["AUTO", "MANUAL"]),
    allow_new_subtasks: z.boolean(),
  })
}

type FormValues = {
  code: string
  name: string
  group: string
  default_duration_min: number
  description?: string
  requires_photo_default: boolean
  requires_report_default: boolean
  acceptance_policy_default: AcceptancePolicy
  allow_new_subtasks: boolean
}

interface WorkTypeEditDialogContentProps {
  workType?: WorkType | null
  onSave: (data: Partial<WorkType>) => Promise<void>
  onOpenChange: (open: boolean) => void
}

export function WorkTypeEditDialogContent({
  workType,
  onSave,
  onOpenChange,
}: WorkTypeEditDialogContentProps) {
  const t = useTranslations("screen.workTypes")
  const tCommon = useTranslations("common")
  const [isSaving, setIsSaving] = React.useState(false)

  const schema = React.useMemo(() => buildSchema(t), [t])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: workType?.code ?? "",
      name: workType?.name ?? "",
      group: workType?.group ?? "",
      default_duration_min: workType?.default_duration_min ?? 30,
      description: workType?.description ?? "",
      requires_photo_default: workType?.requires_photo_default ?? false,
      requires_report_default: workType?.requires_report_default ?? false,
      acceptance_policy_default: workType?.acceptance_policy_default ?? "MANUAL",
      allow_new_subtasks: workType?.allow_new_subtasks ?? true,
    },
  })

  async function onSubmit(values: FormValues) {
    setIsSaving(true)
    try {
      await onSave(values)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const isEdit = !!workType

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isEdit
            ? t("dialogs.edit_title", { name: workType!.name })
            : t("dialogs.create_title")}
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="main" className="mt-2">
        <TabsList className="w-full">
          <TabsTrigger value="main" className="flex-1">
            Основное
          </TabsTrigger>
          <TabsTrigger value="hints" className="flex-1" disabled={!isEdit}>
            Подсказки
            {isEdit && workType!.hints_count > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs h-4 px-1">
                {workType!.hints_count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="mt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Code */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dialogs.fields.code")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="font-mono uppercase"
                        placeholder="MERCH"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dialogs.fields.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Выкладка товара" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Group */}
              <FormField
                control={form.control}
                name="group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dialogs.fields.group")}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid grid-cols-2 gap-2"
                      >
                        {WORK_TYPE_GROUPS.map((g) => {
                          const colors = GROUP_COLORS[g]
                          const isSelected = field.value === g
                          return (
                            <label
                              key={g}
                              className="flex items-center gap-2 rounded-md border border-border p-2.5 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                            >
                              <RadioGroupItem value={g} className="sr-only" />
                              <Badge
                                className="border-transparent text-xs shrink-0"
                                style={
                                  isSelected && colors
                                    ? {
                                        backgroundColor: colors.bg,
                                        color: colors.text,
                                      }
                                    : undefined
                                }
                                variant={isSelected ? "secondary" : "outline"}
                              >
                                {g}
                              </Badge>
                            </label>
                          )
                        })}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration */}
              <FormField
                control={form.control}
                name="default_duration_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("dialogs.fields.default_duration_min")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={1}
                          max={480}
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                            )
                          }
                          className="pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                          мин
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("dialogs.fields.description")}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({tCommon("optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Подробное описание типа работы..."
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Requires photo */}
              <FormField
                control={form.control}
                name="requires_photo_default"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <FormLabel className="cursor-pointer font-normal text-sm leading-relaxed">
                      {t("dialogs.fields.requires_photo_default")}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Requires report */}
              <FormField
                control={form.control}
                name="requires_report_default"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <FormLabel className="cursor-pointer font-normal text-sm leading-relaxed">
                      {t("dialogs.fields.requires_report_default")}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Acceptance policy */}
              <FormField
                control={form.control}
                name="acceptance_policy_default"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("dialogs.fields.acceptance_policy_default")}
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AUTO">
                          {t("policy.AUTO")} — автоматическое принятие
                        </SelectItem>
                        <SelectItem value="MANUAL">
                          {t("policy.MANUAL")} — ручная проверка
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Allow new subtasks */}
              <FormField
                control={form.control}
                name="allow_new_subtasks"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <FormLabel className="cursor-pointer font-normal text-sm leading-relaxed">
                      {t("dialogs.fields.allow_new_subtasks")}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  {t("dialogs.cancel")}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Сохранение..." : t("dialogs.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="hints" className="mt-4 space-y-3">
          {isEdit && (
            <>
              <p className="text-sm text-muted-foreground">
                Подсказки помогают работникам выполнять задачи этого типа. Управляйте
                ими в разделе «Подсказки».
              </p>
              {workType!.hints_count === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Подсказок пока нет.
                </p>
              ) : (
                <p className="text-sm font-medium">
                  Подсказок: {workType!.hints_count}
                </p>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`${ADMIN_ROUTES.hints}?work_type_id=${workType!.id}`}
                  onClick={() => onOpenChange(false)}
                >
                  <ExternalLink className="size-4 mr-2" aria-hidden="true" />
                  Управлять подсказками
                </Link>
              </Button>
            </>
          )}
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("close")}
            </Button>
          </DialogFooter>
        </TabsContent>
      </Tabs>
    </DialogContent>
  )
}
