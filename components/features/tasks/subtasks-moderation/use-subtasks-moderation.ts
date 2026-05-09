"use client"

import * as React from "react"
import { toast } from "sonner"

import type { OperationWithTaskTitle } from "@/lib/api/tasks"
import {
  getPendingOperations,
  approveOperation,
  rejectOperation,
} from "@/lib/api/tasks"
import { getStores } from "@/lib/api/stores"
import { getWorkTypes, getZones } from "@/lib/api/taxonomy"

import type { ComboOption } from "./_shared"

interface UseSubtasksModerationResult {
  // data
  rows: OperationWithTaskTitle[]
  total: number
  isLoading: boolean
  isError: boolean
  // filter options
  storeOptions: ComboOption[]
  workTypeOptions: ComboOption[]
  zoneOptions: ComboOption[]
  // active filters
  search: string
  setSearch: (v: string) => void
  storeId: string
  setStoreId: (v: string) => void
  workTypeId: string
  setWorkTypeId: (v: string) => void
  zoneId: string
  setZoneId: (v: string) => void
  clearAllFilters: () => void
  // expand
  expandedId: number | null
  setExpandedId: (v: number | null) => void
  // reject
  rejectTarget: number | null
  setRejectTarget: (v: number | null) => void
  // actions
  loadData: () => Promise<void>
  handleApprove: (id: number) => Promise<void>
  handleRejectConfirm: (reason: string) => Promise<void>
}

export function useSubtasksModeration(approvedToast: string, rejectedToast: string): UseSubtasksModerationResult {
  // ── data state ──
  const [rows, setRows] = React.useState<OperationWithTaskTitle[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  // ── filter options ──
  const [storeOptions, setStoreOptions] = React.useState<ComboOption[]>([])
  const [workTypeOptions, setWorkTypeOptions] = React.useState<ComboOption[]>([])
  const [zoneOptions, setZoneOptions] = React.useState<ComboOption[]>([])

  // ── active filters ──
  const [search, setSearch] = React.useState("")
  const [storeId, setStoreId] = React.useState("")
  const [workTypeId, setWorkTypeId] = React.useState("")
  const [zoneId, setZoneId] = React.useState("")

  // ── expand state ──
  const [expandedId, setExpandedId] = React.useState<number | null>(null)

  // ── reject dialog ──
  const [rejectTarget, setRejectTarget] = React.useState<number | null>(null)

  // ── load filter options ──
  React.useEffect(() => {
    Promise.all([getStores(), getWorkTypes(), getZones()]).then(([s, w, z]) => {
      setStoreOptions(s.data.map((x) => ({ value: String(x.id), label: x.external_code || x.name })))
      setWorkTypeOptions(w.data.map((x) => ({ value: String(x.id), label: x.name })))
      setZoneOptions(z.data.map((x) => ({ value: String(x.id), label: x.name })))
    })
  }, [])

  // ── load data ──
  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const res = await getPendingOperations({
        search: search || undefined,
        store_id: storeId ? Number(storeId) : undefined,
        work_type_id: workTypeId ? Number(workTypeId) : undefined,
        zone_id: zoneId ? Number(zoneId) : undefined,
        page: 1,
        page_size: 50,
      })
      setRows(res.data)
      setTotal(res.total)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [search, storeId, workTypeId, zoneId])

  React.useEffect(() => { loadData() }, [loadData])

  const clearAllFilters = React.useCallback(() => {
    setStoreId("")
    setWorkTypeId("")
    setZoneId("")
    setSearch("")
  }, [])

  // ── approve ──
  const handleApprove = React.useCallback(async (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
    setTotal((prev) => prev - 1)
    setExpandedId((prev) => (prev === id ? null : prev))
    const res = await approveOperation(String(id))
    if (res.success) {
      toast.success(approvedToast)
    } else {
      loadData()
    }
  }, [loadData, approvedToast])

  // ── reject ──
  const handleRejectConfirm = React.useCallback(async (reason: string) => {
    if (rejectTarget !== null) {
      const id = rejectTarget
      setRows((prev) => prev.filter((r) => r.id !== id))
      setTotal((prev) => prev - 1)
      setExpandedId((prev) => (prev === id ? null : prev))
      setRejectTarget(null)
      const res = await rejectOperation(String(id), reason)
      if (res.success) {
        toast.success(rejectedToast)
      } else {
        loadData()
      }
    }
  }, [rejectTarget, loadData, rejectedToast])

  return {
    rows,
    total,
    isLoading,
    isError,
    storeOptions,
    workTypeOptions,
    zoneOptions,
    search,
    setSearch,
    storeId,
    setStoreId,
    workTypeId,
    setWorkTypeId,
    zoneId,
    setZoneId,
    clearAllFilters,
    expandedId,
    setExpandedId,
    rejectTarget,
    setRejectTarget,
    loadData,
    handleApprove,
    handleRejectConfirm,
  }
}
