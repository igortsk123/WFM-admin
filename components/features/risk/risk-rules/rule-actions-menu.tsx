"use client";

import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { RiskRuleConfig } from "@/lib/api/risk";

interface RuleActionsMenuProps {
  rule: RiskRuleConfig;
  onEdit: (rule: RiskRuleConfig) => void;
  onDuplicate: (rule: RiskRuleConfig) => void;
  onDeleteRequest: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}

export function RuleActionsMenu({ rule, onEdit, onDuplicate, onDeleteRequest, t }: RuleActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={t("rules_tab.columns.actions")}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit(rule);
          }}
        >
          {t("rules_tab.row_actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(rule);
          }}
        >
          {t("rules_tab.row_actions.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(rule.id);
          }}
        >
          {t("rules_tab.row_actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
