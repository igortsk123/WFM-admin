import type { useTranslations } from "next-intl";

export function PeriodBanner({
  t,
  storeLabel,
}: {
  t: ReturnType<typeof useTranslations>;
  storeLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
      {t("period_banner.period_label")}:{" "}
      <span className="text-foreground font-medium">1–28 апреля 2026</span>
      {" · "}
      {t("period_banner.store_label")}:{" "}
      <span className="text-foreground font-medium">{storeLabel || t("period_banner.all_stores")}</span>
      {" · "}
      {t("period_banner.updated")}{" "}
      <span className="text-foreground">28 апр, 14:00</span>
    </div>
  );
}
