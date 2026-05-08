import type { Agent, AgentStatus } from "@/lib/types"

// ─────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────

export type AgentTab = "active" | "blocked" | "archive"
export type AgentType = "INDIVIDUAL" | "COMPANY"
export type SheetMode = "create" | "edit"

export const TAB_STATUS_MAP: Record<AgentTab, AgentStatus> = {
  active: "ACTIVE",
  blocked: "BLOCKED",
  archive: "ARCHIVED",
}

// ─────────────────────────────────────────────────────────────────
// FORM
// ─────────────────────────────────────────────────────────────────

export interface AgentFormData {
  name: string
  type: AgentType
  inn: string
  kpp: string
  ogrn: string
  contact_person_name: string
  contact_phone: string
  contact_email: string
  contract_url: string
  commission_pct: string
  status: AgentStatus
}

export const EMPTY_FORM: AgentFormData = {
  name: "",
  type: "INDIVIDUAL",
  inn: "",
  kpp: "",
  ogrn: "",
  contact_person_name: "",
  contact_phone: "",
  contact_email: "",
  contract_url: "",
  commission_pct: "10",
  status: "ACTIVE",
}

export function agentToFormData(agent: Agent): AgentFormData {
  return {
    name: agent.name,
    type: agent.type,
    inn: agent.inn ?? "",
    kpp: agent.kpp ?? "",
    ogrn: agent.ogrn ?? "",
    contact_person_name: agent.contact_person_name ?? "",
    contact_phone: agent.contact_phone ?? "",
    contact_email: agent.contact_email ?? "",
    contract_url: agent.contract_url ?? "",
    commission_pct: String(agent.commission_pct),
    status: agent.status,
  }
}
