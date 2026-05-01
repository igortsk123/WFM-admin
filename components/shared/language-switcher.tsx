"use client"

import { useLocale, useTranslations } from "next-intl"
import { Globe } from "lucide-react"

import { useRouter, usePathname } from "@/i18n/navigation"
import { routing, type Locale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const localeLabels: Record<Locale, string> = {
  ru: "RU",
  en: "EN",
}

const localeFullLabels: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
}

interface LanguageSwitcherProps {
  /** "full" shows Globe + current locale label. "compact" shows Globe icon only. */
  variant?: "full" | "compact"
  className?: string
}

export function LanguageSwitcher({ variant = "full", className }: LanguageSwitcherProps) {
  const t = useTranslations("common")
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  function handleLocaleChange(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "compact" ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("language")}
            className={cn("size-9", className)}
          >
            <Globe className="size-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            aria-label={t("language")}
            className={cn("gap-1.5 h-9 px-2.5", className)}
          >
            <Globe className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">{localeLabels[locale]}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={cn(loc === locale && "bg-accent text-accent-foreground")}
          >
            {localeFullLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
