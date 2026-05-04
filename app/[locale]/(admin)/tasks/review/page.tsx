import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ReviewQueue } from "@/components/features/tasks/review-queue"

export default function ReviewQueuePage() {
  return (
    <NuqsAdapter>
      <ReviewQueue />
    </NuqsAdapter>
  )
}
