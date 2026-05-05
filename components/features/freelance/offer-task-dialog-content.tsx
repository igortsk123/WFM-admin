"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { CalendarIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

import { sendTaskOffer, getStores, getWorkTypes } from "@/lib/api"
import type { FreelancerWithStats, StoreWithStats } from "@/lib/api"
import type { WorkTypeWithCount } from "@/lib/api/taxonomy"

interface Props {
  freelancer: FreelancerWithStats
  onClose: () => void
  onSent?: () => void
}

export function OfferTaskDialogContent({ freelancer, onClose, onSent }: Props) {
  const t = useTranslations("screen.freelancers.offer")
  const tCommon = useTranslations("common")

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
      const result = await sendTaskOffer(freelancer.id, {
        service_id: serviceId,
        store_id: parseInt(storeId, 10),
        shift_date: format(shiftDate, "yyyy-MM-dd"),
        start_time: startTime,
        duration_hours: Number(durationHours),
        price_rub: Number(priceRub),
        note: note.trim() || undefined,
      })
      if (result.success) {
        toast.success(t("toast_sent", { name: `${freelancer.last_name} ${freelancer.first_name[0]}.` }))
        onSent?.()
        onClose()
      } else {
        toast.error(result.error?.message ?? tCommon("error"))
      }
    } catch {
      toast.error(tCommon("error"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{t("title", { name: `${freelancer.last_name} ${freelancer.first_name}` })}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

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
                  <Button variant="outline" className={cn("justify-start font-normal", !shiftDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 size-4" />
                    {shiftDate ? format(shiftDate, "d MMMM, EEEE", { locale: ru }) : t("field_date_placeholder")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={shiftDate} onSelect={setShiftDate} disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="offer-time">{t("field_start_time")}</Label>
              <Input id="offer-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
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
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || submitting}>
          {submitting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
          {t("submit")}
        </Button>
      </div>
    </DialogContent>
  )
}
