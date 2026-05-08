import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Active goal skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposals skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AILoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="size-8 text-primary animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
