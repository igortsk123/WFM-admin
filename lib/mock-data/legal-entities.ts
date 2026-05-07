import type { LegalEntity } from "@/lib/types";

/**
 * @endpoint GET /api/legal-entities
 * 4 legal entities, generic structure for RU + future UK support.
 * LegalEntity.id is number per the interface but referenced as string in Store; using sequential ints.
 */
export const MOCK_LEGAL_ENTITIES: LegalEntity[] = [
  {
    id: 1,
    name: "ООО «СПАР Томск»",
    organization_id: "org-lama",
    tax_jurisdiction: "RU",
    inn: "7017123456",
    kpp: "701701001",
    ogrn: "1107017001234",
  },
  {
    id: 2,
    name: "ООО «СПАР Новосибирск»",
    organization_id: "org-lama",
    tax_jurisdiction: "RU",
    inn: "5407123456",
    kpp: "540701001",
    ogrn: "1115407002345",
  },
  {
    id: 3,
    name: "ООО «Глобал Маркет»",
    organization_id: "org-lama",
    tax_jurisdiction: "RU",
    inn: "7019234567",
    kpp: "701901001",
    ogrn: "1127019003456",
  },
  {
    /** ИП — малый бизнес fashion (нет KPP у ИП) */
    id: 4,
    name: "ИП Никитина А. Н.",
    organization_id: "org-levas",
    tax_jurisdiction: "RU",
    inn: "702401234567",
    ogrn: "316702400012345",
  },
];
