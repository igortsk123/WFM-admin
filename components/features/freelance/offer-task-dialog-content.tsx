"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { CalendarIcon, Loader2, Users } from "lucide-react"
import { toast } from "sonner"

import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LazyCalendar as Calendar } from "@/components/shared/lazy-calendar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

import {
  sendTaskOffer,
  createTaskOffer,
  getStores,
  getWorkTypes,
  getTierForRank,
} from "@/lib/api"
import type { FreelancerWithStats, StoreWithStats } from "@/lib/api"
import type { WorkTypeWithCount } from "@/lib/api/taxonomy"
import { useAuth } from "@/lib/contexts/auth-context"

type Props =
  | {
      mode?: "single"
      freelancer: FreelancerWithStats
      onClose: () => void
      onSent?: () => void
    }
  | {
      mode: "bulk"
      freelancers: FreelancerWithStats[]
      onClose: () => void
      onSent?: () => void
    }

export function OfferTaskDialogContent(props: Props) {
  const t = useTranslations("screen.freelancers.offer")
  const tCommon = useTranslations("common")
  const { user } = useAuth()
  const isBulk = props.mode === "bulk"
  const candidates = isBulk ? props.freelancers : [props.freelancer]
  // Сортируем кандидатов по рейтингу для предпросмотра очереди
  const sortedCandidates = [...candidates].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

  const [stores, setStores] = useState<StoreWithStats[]>([])
  const [workTypes, setWorkTypes] = useState<WorkTypeWithCount[]>([])
  const [loading, setLoading] = useState(true)

  const [serviceId, setServiceId] = useState("")
  const [storeId, setStoreId] = useState("")
  const [shiftDate, setShiftDate] = useState<Date | undefined>()
  const [startTime, setStartTime] = useState("10:00")
  const [durationHours, setDurationHours] = useState("8")
  const [priceRub, setPriceRub] = useState("2100")
  const [note, setNote] = useState("")

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([getStores({ page_size: 100 }), getWorkTypes({ page_size: 50 })])
      .then(([storesRes, wtRes]) => {
        setStores(storesRes.data)
        setWorkTypes(wtRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const isValid =
    serviceId &&
    storeId &&
    shiftDate &&
    startTime &&
    Number(durationHours) > 0 &&
    Number(priceRub) > 0

  async function handleSubmit() {
    if (!isValid || !shiftDate) return
    setSubmitting(true)
    try {
      if (isBulk) {
        const result = await createTaskOffer({
          work_type_id: parseInt(serviceId, 10),
          store_id: parseInt(storeId, 10),
          shift_date: format(shiftDate, "yyyy-MM-dd"),
          start_time: startTime,
          duration_hours: Number(durationHours),
          price_rub: Number(priceRub),
          note: note.trim() || undefined,
          candidate_freelancer_ids: candidates.map((c) => c.id),
          created_by_user_id: user?.id ?? 1,
        })
        if (result.success) {
          toast.success(t("toast_bulk_started", { count: candidates.length }))
          props.onSent?.()
          props.onClose()
        } else {
          toast.error(result.error?.message ?? tCommon("error"))
        }
      } else {
        const single = props.freelancer
        const result = await sendTaskOffer(single.id, {
          service_id: serviceId,
          store_id: parseInt(storeId, 10),
          shift_date: format(shiftDate, "yyyy-MM-dd"),
          start_time: startTime,
          duration_hours: Number(durationHours),
          price_rub: Number(priceRub),
          note: note.trim() || undefined,
        })
        if (result.success) {
          toast.success(t("toast_sent", { name: `${single.last_name} ${single.first_name[0]}.` }))
          props.onSent?.()
          props.onClose()
        } else {
          toast.error(result.error?.message ?? tCommon("error"))
        }
      }
    } catch {
      toast.error(tCommon("error"))
    } finally {
      setSubmitting(false)
    }
  }

  const dialogTitle = isBulk
    ? t("bulk_title", { count: candidates.length })
    : t("title", { name: `${props.freelancer.last_name} ${props.freelancer.first_name}` })

  const dialogDesc = isBulk ? t("bulk_description") : t("description")

  return (
    <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogDescription>{dialogDesc}</DialogDescription>
      </DialogHeader>

      {/* Bulk: queue preview */}
      {isBulk && sortedCandidates.length > 0 && (
        <Alert className="border-info/30 bg-info/5">
          <Users className="size-4 text-info" />
          <AlertDescription className="text-xs space-y-1">
            <div className="font-medium text-foreground">{t("bulk_queue_title")}</div>
            <ol className="space-y-0.5 ml-4 list-decimal">
              {sortedCandidates.slice(0, 5).map((c, idx) => {
                const { tier, minutes } = getTierForRank(idx + 1)
                return (
                  <li key={c.id}>
                    {c.last_name} {c.first_name[0]}.
                    {c.rating ? ` (★ ${c.rating.toFixed(1)})` : ""}
                    <span className="text-muted-foreground ml-1">
                      — {minutes} мин ({t(`tier_${tier.toLowerCase()}`)})
                    </span>
                  </li>
                )
              })}
              {sortedCandidates.length > 5 && (
                <li className="text-muted-foreground">{t("bulk_queue_and_more", { count: sortedCandidates.length - 5 })}</li>
              )}
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="py-8 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="offer-service">{t("field_service")}</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id="offer-service">
                <SelectValue placeholder={t("field_service_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {workTypes.map((wt) => (
                  <SelectItem key={wt.id} value={String(wt.id)}>
                    {wt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="offer-store">{t("field_store")}</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger id="offer-store">
                <SelectValue placeholder={t("field_store_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("field_date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start font-normal", !shiftDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {shiftDate ? format(shiftDate, "d MMMM, EEEE", { locale: ru }) : t("field_date_placeholder")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={shiftDate}
                    onSelect={setShiftDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="offer-time">{t("field_start_time")}</Label>
              <Input
                id="offer-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="offer-duration">{t("field_duration")}</Label>
              <Input
                id="offer-duration"
                type="number"
                min="1"
                max="12"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="offer-price">{t("field_price")}</Label>
              <Input
                id="offer-price"
                type="number"
                min="0"
                step="50"
                value={priceRub}
                onChange={(e) => setPriceRub(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="offer-note">{t("field_note")}</Label>
            <Textarea
              id="offer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t("field_note_placeholder")}
              className="resize-none"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={props.onClose} disabled={submitting}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || submitting}>
          {submitting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
          {isBulk ? t("submit_bulk") : t("submit")}
        </Button>
      </div>
    </DialogContent>
  )
}
