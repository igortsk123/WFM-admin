export function PeriodBanner({ scope }: { scope: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
      Период:{" "}
      <span className="text-foreground font-medium">
        1 апреля 2026 — 28 апреля 2026
      </span>
      {" · "}
      {scope}
      {" · "}
      Обновлено <span className="text-foreground">28 апр, 14:00</span>
    </div>
  );
}
