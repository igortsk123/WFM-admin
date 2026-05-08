import { AlertCircle, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { T } from "./_shared";

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-28" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ErrorRetry({ onRetry, t }: { onRetry: () => void; t: T }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>{t("states.forbidden_title")}</AlertTitle>
      <AlertDescription>
        <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
          <RotateCcw className="size-3.5 mr-1.5" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
