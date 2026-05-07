/**
 * Юридические лица ЛАМА (internal_company из /shops/).
 * 8 уникальных компаний по 133 магазинам.
 * IDs от LAMA как есть (1-3577) — это их внутренние ID.
 */
import type { LegalEntity } from "@/lib/types";

// LAMA company id → mock id (offset 100+ чтоб не конфликтовать с base 1-4)
export const LAMA_COMPANY_TO_MOCK_LE_ID: Record<number, number> = {
  1: 100,
  2: 101,
  3: 102,
  4: 103,
  5: 104,
  6: 105,
  2259: 106,
  3577: 107,
};

export const REAL_LAMA_LEGAL_ENTITIES: LegalEntity[] = [
  { id: 100, organization_id: "org-lama", tax_jurisdiction: "RU", code: "7728371250", name: "ООО «Альянс Региональных Ритейлеров»", inn: "7728371250", kpp: "772801001", rec_id: "1" },
  { id: 101, organization_id: "org-lama", tax_jurisdiction: "RU", code: "7017361618", name: "ООО \"Перспектива\"", inn: "7017361618", kpp: "701701001", rec_id: null },
  { id: 102, organization_id: "org-lama", tax_jurisdiction: "RU", code: "5406441615", name: "ООО \"ЕвроЛогистик\"", inn: "5406441615", kpp: "540501001", rec_id: null },
  { id: 103, organization_id: "org-lama", tax_jurisdiction: "RU", code: "7017276810", name: "ООО \"Глобал-Маркет\"", inn: "7017276810", kpp: "701701001", rec_id: null },
  { id: 104, organization_id: "org-lama", tax_jurisdiction: "RU", code: "7017178115", name: "ООО \"Инвест Ресторация\"", inn: "7017178115", kpp: "701701001", rec_id: null },
  { id: 105, organization_id: "org-lama", tax_jurisdiction: "RU", code: "7017326645", name: "ООО \"Спар-Томск\"", inn: "7017326645", kpp: "701701001", rec_id: null },
  { id: 106, organization_id: "org-lama", tax_jurisdiction: "RU", code: "5408144470", name: "ООО \"Сибирское подворье\" (Новосибирск)", inn: "5408144470", kpp: "540201001", rec_id: null },
  { id: 107, organization_id: "org-lama", tax_jurisdiction: "RU", code: "7017139532", name: "ООО \"ТомРитейл\"", inn: "7017139532", kpp: "701750001", rec_id: null },
];