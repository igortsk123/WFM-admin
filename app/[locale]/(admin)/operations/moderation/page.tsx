import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"
import { SubtasksModeration } from "@/components/features/tasks/subtasks-moderation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.subtasksModeration")
  return {
    title: t("title"),
    description: t("hint"),
  }
}

export default function SubtasksModerationPage() {
  return <SubtasksModeration />
}
