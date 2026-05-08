import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  hero: React.ReactNode;
  sub?: React.ReactNode;
  hint?: React.ReactNode;
  diff?: React.ReactNode;
}

export function StatCard({ icon: Icon, title, hero, sub, hint, diff }: StatCardProps) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-semibold tracking-tight text-foreground">{hero}</span>
              {diff && <span className="text-sm font-medium text-success mb-0.5">{diff}</span>}
            </div>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
