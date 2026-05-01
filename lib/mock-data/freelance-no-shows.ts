import type { NoShowReport } from "@/lib/types";
import { daysAgoFrom } from "./_today";

/**
 * @endpoint GET /api/freelance/no-shows
 * 2 NoShowReport records linked to NO_SHOW services (svc-032, svc-033).
 * Status: 1 OPEN (new, awaiting legal), 1 IN_LEGAL (transferred to lawyers).
 */
export const MOCK_NO_SHOW_REPORTS: NoShowReport[] = [
  {
    /** NEW, awaiting legal review */
    id: "nsr-001",
    service_id: "svc-032",
    freelancer_id: 116,
    freelancer_name: "Тихомиров Сергей Васильевич",
    agent_id: null,
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    scheduled_date: daysAgoFrom(11).slice(0, 10),
    scheduled_hours: 8,
    actual_hours: 0,
    reported_at: daysAgoFrom(11),
    status: "OPEN",
  },
  {
    /** Transferred to legal — IN_LEGAL */
    id: "nsr-002",
    service_id: "svc-033",
    freelancer_id: 105,
    freelancer_name: "Миронова Ольга Петровна",
    agent_id: "agent-001",
    store_id: 7,
    store_name: "Food City Томск Global Market, пр. Ленина 217",
    scheduled_date: daysAgoFrom(10).slice(0, 10),
    scheduled_hours: 10,
    actual_hours: 0,
    reported_at: daysAgoFrom(10),
    status: "IN_LEGAL",
    legal_comment: "Документы переданы в юридический отдел 30 апреля. Ожидаем подтверждения уведомления.",
  },
];
