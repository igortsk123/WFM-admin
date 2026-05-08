"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";

import { PERMISSIONS_4 } from "./_shared";

interface HeaderRowProps {
  isAllSelected: boolean;
  onToggleAll: () => void;
  isNetworkScope: boolean;
}

export function HeaderRow({
  isAllSelected,
  onToggleAll,
  isNetworkScope,
}: HeaderRowProps) {
  const t = useTranslations("screen.permissions");

  return (
    <thead>
      <tr className="border-b bg-muted/40">
        <th className="sticky left-0 z-10 bg-muted/40 w-10 px-3 py-3 text-left">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label="Select all"
          />
        </th>
        <th className="sticky left-10 z-10 bg-muted/40 min-w-[200px] px-3 py-3 text-left font-medium text-muted-foreground">
          {t("matrix.col_employee")}
        </th>
        {isNetworkScope && (
          <th className="min-w-[160px] px-3 py-3 text-left font-medium text-muted-foreground">
            {t("matrix.col_store")}
          </th>
        )}
        {PERMISSIONS_4.map((p) => (
          <th
            key={p}
            className="w-24 px-3 py-3 text-center font-medium text-muted-foreground"
          >
            {t(`matrix.col_${p.toLowerCase()}` as Parameters<typeof t>[0])}
          </th>
        ))}
        <th className="w-12 px-3 py-3 text-center font-medium text-muted-foreground">
          {t("matrix.col_actions")}
        </th>
      </tr>
    </thead>
  );
}
