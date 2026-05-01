import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold text-foreground">WFM Admin</h1>
      <p className="text-muted-foreground">
        Workforce Management Administration Panel
      </p>

      <nav className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
        <p className="text-sm font-medium text-muted-foreground">
          {tc("language")}: RU / EN
        </p>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href="/dashboard"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("dashboard")}
            </Link>
          </li>
          <li>
            <Link
              href="/tasks"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("tasks")}
            </Link>
          </li>
          <li>
            <Link
              href="/goals"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("goals")}
            </Link>
          </li>
          <li>
            <Link
              href="/schedule"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("schedule")}
            </Link>
          </li>
          <li>
            <Link
              href="/employees"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("employees")}
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
