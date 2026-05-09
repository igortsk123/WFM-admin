import { InformationBanner } from "@/components/shared";

export function PeriodBanner({ scope }: { scope: string }) {
  return (
    <InformationBanner
      variant="muted"
      layout="compact"
      title={
        <>
          Период:{" "}
          <span className="text-foreground font-medium">
            1 апреля 2026 — 28 апреля 2026
          </span>
          {" · "}
          {scope}
          {" · "}
          Обновлено <span className="text-foreground">28 апр, 14:00</span>
        </>
      }
    />
  );
}
