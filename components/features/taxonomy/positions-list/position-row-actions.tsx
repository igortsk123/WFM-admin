"use client";

import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { PositionWithCounts } from "@/lib/api/taxonomy";

import type { TFn } from "./_shared";

interface PositionRowActionsProps {
  position: PositionWithCounts;
  canEdit: boolean;
  isMobile: boolean;
  onEdit: (pos: PositionWithCounts) => void;
  onDuplicate: (pos: PositionWithCounts) => void;
  onDelete: (pos: PositionWithCounts) => void;
  t: TFn;
}

export function PositionRowActions({
  position,
  canEdit,
  isMobile,
  onEdit,
  onDuplicate,
  onDelete,
  t,
}: PositionRowActionsProps) {
  const hasEmployees = (position.employees_count ?? 0) > 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={
            isMobile
              ? "size-11 shrink-0"
              : "size-9 min-w-[44px] min-h-[44px]"
          }
          aria-label={t("columns.actions")}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className={isMobile ? "size-5" : "size-4"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={isMobile ? "w-44" : "w-48"}>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit(position);
          }}
          disabled={!canEdit}
        >
          {t("row_actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(position);
          }}
          disabled={!canEdit}
        >
          {t("row_actions.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={`${ADMIN_ROUTES.employees}?position_id=${position.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            {t("row_actions.view_employees")}
          </Link>
        </DropdownMenuItem>
        {canEdit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={hasEmployees}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(position);
              }}
            >
              {t("row_actions.delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
