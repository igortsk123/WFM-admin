import {
  ChevronRight,
  Factory,
  Plus,
  Shirt,
  ShoppingCart,
} from "lucide-react";
import { useLocale } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Goal, Locale } from "@/lib/types";
import { pickLocalized, pickLocalizedList } from "@/lib/utils/locale-pick";

import { CreateGoalDialogContent } from "./create-goal-dialog";
import {
  CATALOG_GOALS,
  type GoalsT,
  type CommonT,
} from "./_shared";

export function CatalogSection({
  canManageGoals,
  createDialogOpen,
  setCreateDialogOpen,
  onCreate,
  t,
  tCommon,
}: {
  canManageGoals: boolean;
  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;
  onCreate: (data: Partial<Goal>) => Promise<void>;
  t: GoalsT;
  tCommon: CommonT;
}) {
  const locale = useLocale() as Locale;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("catalog.section_title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fmcg" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="fmcg" className="gap-1.5">
              <ShoppingCart className="size-4" />
              {t("catalog.tab_fmcg")}
            </TabsTrigger>
            <TabsTrigger value="fashion" className="gap-1.5">
              <Shirt className="size-4" />
              {t("catalog.tab_fashion")}
            </TabsTrigger>
            <TabsTrigger value="production" className="gap-1.5">
              <Factory className="size-4" />
              {t("catalog.tab_production")}
            </TabsTrigger>
          </TabsList>

          {(["fmcg", "fashion", "production"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CATALOG_GOALS[tab].map((goal, i) => {
                  const tasks = pickLocalizedList(goal.tasks, goal.tasks_en, locale);
                  return (
                    <Card key={i} className="flex flex-col">
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <h4 className="font-medium text-sm mb-2">
                          {pickLocalized(goal.title, goal.title_en, locale)}
                        </h4>

                        <div className="space-y-2 text-xs flex-1">
                          <div>
                            <span className="text-muted-foreground">{t("catalog.when_to_use")}: </span>
                            <span>{pickLocalized(goal.when, goal.when_en, locale)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t("catalog.typical_period")}: </span>
                            <span>{goal.period}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t("catalog.key_tasks")}: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tasks.map((task, j) => (
                                <Badge key={j} variant="secondary" className="text-xs">
                                  {task}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t("catalog.ai_analyzes_via")}: </span>
                            <span>{pickLocalized(goal.aiSource, goal.aiSource_en, locale)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {t("catalog.footer_hint")}{" "}
            <Link href={ADMIN_ROUTES.integrations} className="text-primary hover:underline">
              {t("actions.connect_data_sources")}
              <ChevronRight className="size-3 inline" />
            </Link>
          </p>

          {canManageGoals ? (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4 mr-1" />
                  {t("actions.create_manual_goal")}
                </Button>
              </DialogTrigger>
              <CreateGoalDialogContent
                t={t}
                tCommon={tCommon}
                onSubmit={onCreate}
                onOpenChange={setCreateDialogOpen}
              />
            </Dialog>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled>
                  <Plus className="size-4 mr-1" />
                  {t("actions.create_manual_goal")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Решение принимает супервайзер или директор сети
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
