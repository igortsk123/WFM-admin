import { MapPin, Phone, Store, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoleBadge, SidebarInfoCard } from "@/components/shared";
import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { type ShiftDetailData, getInitials } from "./_shared";

// ─────────────────────────────────────────────────────────────────────
// EMPLOYEE CARD
// ─────────────────────────────────────────────────────────────────────

export function EmployeeCard({ shift }: { shift: ShiftDetailData }) {
  const user = {
    id: shift.user_id,
    name: shift.user_name,
    avatarUrl: shift.user_avatar_url,
    positionName: shift.position_name,
  };

  const initials = getInitials(user.name);
  const completedTasks = shift.tasks?.filter((t) => t.state === "COMPLETED").length ?? 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-14 shrink-0">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{user.name}</p>
            {user.positionName && (
              <p className="text-xs text-muted-foreground mt-0.5">{user.positionName}</p>
            )}
            <div className="mt-1.5">
              <RoleBadge role="WORKER" size="sm" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" className="flex-1 min-h-[36px]" asChild>
            <Link href={ADMIN_ROUTES.employeeDetail(String(user.id))}>
              <User className="size-3.5 mr-1.5" />
              Профиль
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 min-h-[36px]">
            <Phone className="size-3.5 mr-1.5" />
            Связаться
          </Button>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-3">
          <div className="flex justify-between">
            <span>Задач завершено</span>
            <span className="font-medium text-foreground">{completedTasks}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// STORE CARD
// ─────────────────────────────────────────────────────────────────────

export function StoreCard({ shift }: { shift: ShiftDetailData }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Store className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {shift.store_name}
            </p>
            {shift.zone_name && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="size-3" />
                {shift.zone_name}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full min-h-[36px]" asChild>
          <Link href={ADMIN_ROUTES.storeDetail(String(shift.store_id))}>Открыть магазин</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// STATS CARD
// ─────────────────────────────────────────────────────────────────────

export function StatsCard({ shift }: { shift: ShiftDetailData }) {
  const completedTasks = shift.tasks?.filter((t) => t.state === "COMPLETED").length ?? 0;
  const totalTasks = shift.tasks?.length ?? 0;

  return (
    <SidebarInfoCard title="Статистика смены" collapsibleOnMobile={false}>
      <div className="space-y-2">
        {shift.late_minutes > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Опоздание</span>
            <span className="text-warning font-medium">{shift.late_minutes} мин</span>
          </div>
        )}
        {shift.overtime_minutes > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Переработка</span>
            <span className="text-info font-medium">{shift.overtime_minutes} мин</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Завершено задач</span>
          <span className="font-medium">
            {completedTasks} / {totalTasks}
          </span>
        </div>
        {shift.late_minutes === 0 && shift.overtime_minutes === 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Опоздание</span>
            <span className="text-success font-medium">—</span>
          </div>
        )}
      </div>
    </SidebarInfoCard>
  );
}

// ─────────────────────────────────────────────────────────────────────
// AUDIT CARD
// ─────────────────────────────────────────────────────────────────────

export function AuditCard({ shift }: { shift: ShiftDetailData }) {
  return (
    <SidebarInfoCard title="Аудит" collapsibleOnMobile={false}>
      <div className="space-y-2">
        {shift.audit?.slice(0, 3).map((entry) => (
          <div key={entry.id} className="text-xs space-y-0.5">
            <p className="font-medium text-foreground">{entry.action_label}</p>
            <p className="text-muted-foreground">
              {entry.actor.name} ·{" "}
              {new Date(entry.occurred_at).toLocaleDateString("ru-RU")}
            </p>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground mt-1"
          asChild
        >
          <Link href={`${ADMIN_ROUTES.audit}?entity_id=${shift.id}`}>Полный аудит →</Link>
        </Button>
      </div>
    </SidebarInfoCard>
  );
}
