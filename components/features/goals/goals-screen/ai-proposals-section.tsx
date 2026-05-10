import {
  AlertCircle,
  ArrowRight,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { EmptyState } from "@/components/shared";
import { Link } from "@/i18n/navigation";
import type { GoalProposal } from "@/lib/api/goals";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Locale } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";

import { CategoryBadge } from "./category-badge";
import { AILoadingState } from "./loading-states";
import { SelectGoalDialogContent } from "./select-goal-dialog";
import {
  CATEGORY_ICONS,
  type GoalsT,
  type CommonT,
} from "./_shared";

export function AIProposalsSection({
  proposals,
  aiLoading,
  hasActiveGoal,
  canManageGoals,
  selectDialogOpen,
  setSelectDialogOpen,
  selectedProposal,
  setSelectedProposal,
  onSelect,
  locale,
  t,
  tCommon,
}: {
  proposals: GoalProposal[];
  aiLoading: boolean;
  hasActiveGoal: boolean;
  canManageGoals: boolean;
  selectDialogOpen: boolean;
  setSelectDialogOpen: (open: boolean) => void;
  selectedProposal: GoalProposal | null;
  setSelectedProposal: (p: GoalProposal | null) => void;
  onSelect: (proposal: GoalProposal) => Promise<void>;
  locale: Locale;
  t: GoalsT;
  tCommon: CommonT;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              {t("proposals.section_title")}
            </CardTitle>
            {!aiLoading && proposals.length > 0 && (
              <CardDescription className="mt-1">
                {t("proposals.section_subtitle_count", { count: proposals.length })}
              </CardDescription>
            )}
          </div>
          <Button variant="link" size="sm" asChild className="p-0 h-auto">
            <Link href={`${ADMIN_ROUTES.aiSuggestions}?type=GOAL_SUGGESTION`}>
              {t("actions.all_ai_suggestions")}
              <ArrowRight className="size-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {aiLoading ? (
          <AILoadingState message={t("ai_loading")} />
        ) : proposals.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title={t("empty.no_proposals_title")}
            description={t("empty.no_proposals_subtitle")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposals.map((proposal) => {
              const Icon = CATEGORY_ICONS[proposal.category];
              return (
                <Card key={proposal.id} className="flex flex-col">
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-md bg-muted">
                          <Icon className="size-4 text-muted-foreground" />
                        </span>
                        <CategoryBadge category={proposal.category} t={t} />
                      </div>
                      <Badge variant="outline">
                        {t("priority.high" as Parameters<typeof t>[0])}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-sm mb-2 text-balance">
                      {pickLocalized(proposal.title, proposal.title_en, locale)}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4 flex-1 leading-relaxed">
                      {pickLocalized(proposal.description, proposal.description_en, locale)}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-muted rounded-md p-2">
                        <p className="text-muted-foreground">{t("proposals.current_value")}</p>
                        <p className="font-medium">
                          {proposal.current_value}
                          {proposal.target_unit}
                        </p>
                      </div>
                      <div className="bg-muted rounded-md p-2">
                        <p className="text-muted-foreground">{t("proposals.target_value")}</p>
                        <p className="font-medium">
                          {proposal.target_value}
                          {proposal.target_unit}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-success font-medium mb-4">
                      {t("proposals.potential_gain")}: {proposal.potential_value}
                    </div>

                    <div className="flex gap-2 mt-auto">
                      {canManageGoals ? (
                        <AlertDialog
                          open={selectDialogOpen && selectedProposal?.id === proposal.id}
                          onOpenChange={(open) => {
                            setSelectDialogOpen(open);
                            if (!open) setSelectedProposal(null);
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => setSelectedProposal(proposal)}
                            >
                              {t("actions.select_as_active")}
                            </Button>
                          </AlertDialogTrigger>
                          {selectedProposal && (
                            <SelectGoalDialogContent
                              goal={selectedProposal}
                              hasActiveGoal={hasActiveGoal}
                              locale={locale}
                              t={t}
                              tCommon={tCommon}
                              onConfirm={() => onSelect(selectedProposal)}
                              onOpenChange={(open) => {
                                setSelectDialogOpen(open);
                                if (!open) setSelectedProposal(null);
                              }}
                            />
                          )}
                        </AlertDialog>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" className="flex-1" disabled>
                              {t("actions.select_as_active")}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("active_goal.remove_disabled_hint")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`${ADMIN_ROUTES.aiChat}?context_type=suggestion&context_id=${proposal.id}`}>
                          <MessageSquare className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
