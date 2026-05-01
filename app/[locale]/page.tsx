import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/components/shared/link";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("nav");

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">WFM Admin</h1>
            <p className="mt-2 text-muted-foreground">
              Workforce Management Administration Panel
            </p>
          </div>
          <LanguageSwitcher />
        </header>

        <nav className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <NavSection title={t("dashboard")}>
            <NavLink href={ADMIN_ROUTES.dashboard}>{t("dashboard")}</NavLink>
          </NavSection>

          <NavSection title={t("tasks")}>
            <NavLink href={ADMIN_ROUTES.tasks}>{t("tasks")}</NavLink>
            <NavLink href={ADMIN_ROUTES.tasksReview}>{t("tasks_review")}</NavLink>
            <NavLink href={ADMIN_ROUTES.tasksArchive}>{t("tasks_archive")}</NavLink>
          </NavSection>

          <NavSection title={t("goals")}>
            <NavLink href={ADMIN_ROUTES.goals}>{t("goals")}</NavLink>
            <NavLink href={ADMIN_ROUTES.bonusTasks}>{t("bonus_tasks")}</NavLink>
          </NavSection>

          <NavSection title={t("employees")}>
            <NavLink href={ADMIN_ROUTES.employees}>{t("employees")}</NavLink>
            <NavLink href={ADMIN_ROUTES.permissions}>{t("permissions")}</NavLink>
            <NavLink href={ADMIN_ROUTES.schedule}>{t("schedule")}</NavLink>
          </NavSection>

          <NavSection title={t("stores")}>
            <NavLink href={ADMIN_ROUTES.stores}>{t("stores")}</NavLink>
            <NavLink href={ADMIN_ROUTES.taxonomyWorkTypes}>{t("taxonomy_work_types")}</NavLink>
            <NavLink href={ADMIN_ROUTES.taxonomyZones}>{t("taxonomy_zones")}</NavLink>
          </NavSection>

          <NavSection title={t("settings_profile")}>
            <NavLink href={ADMIN_ROUTES.profile}>{t("settings_profile")}</NavLink>
            <NavLink href={ADMIN_ROUTES.organization}>{t("settings_organization")}</NavLink>
            <NavLink href={ADMIN_ROUTES.integrations}>{t("integrations")}</NavLink>
          </NavSection>
        </nav>
      </div>
    </main>
  );
}

function NavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {children}
      </Link>
    </li>
  );
}
