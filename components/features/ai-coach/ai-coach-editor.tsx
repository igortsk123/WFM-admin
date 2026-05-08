"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BookOpen, Plus, Search, Sparkles } from "lucide-react";

import {
  getAiHints,
  getAbTest,
  type AIHint,
  type AbTest,
} from "@/lib/api/ai-coach";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { EditorTabs } from "./ai-coach-editor/editor-panel";
import { EditorSkeleton, LeftPanelContent } from "./ai-coach-editor/header-bar";
import type { HintFilter } from "./ai-coach-editor/_shared";

export function AiCoachEditor() {
  const t = useTranslations("screen.aiCoach");

  // Work types list
  const workTypes = MOCK_WORK_TYPES.filter((wt) => wt.id <= 13);

  const [filter, setFilter] = useState<HintFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<number | null>(4); // default to "Выкладка"

  // Hints data
  const [hints, setHints] = useState<AIHint[]>([]);
  const [hintsLoading, setHintsLoading] = useState(false);

  // A/B test data
  const [abTest, setAbTest] = useState<AbTest | null>(null);
  const [abTestLoading, setAbTestLoading] = useState(false);

  // Mobile left-panel drawer
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const loadHints = useCallback(
    async (workTypeId: number) => {
      setHintsLoading(true);
      try {
        const res = await getAiHints({ work_type_id: workTypeId });
        setHints(res.data);
      } catch {
        toast.error(t("toasts.error"));
      } finally {
        setHintsLoading(false);
      }
    },
    [t]
  );

  const loadAbTest = useCallback(async (workTypeId: number) => {
    setAbTestLoading(true);
    try {
      const res = await getAbTest(workTypeId);
      setAbTest(res.data);
    } catch {
      // silently fail
    } finally {
      setAbTestLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWorkTypeId != null) {
      loadHints(selectedWorkTypeId);
      loadAbTest(selectedWorkTypeId);
    }
  }, [selectedWorkTypeId, loadHints, loadAbTest]);

  const selectedWorkType = workTypes.find((wt) => wt.id === selectedWorkTypeId);
  const latestHint =
    hints.length > 0
      ? hints.reduce((a, b) => (a.version > b.version ? a : b))
      : null;

  const leftPanel = (
    <LeftPanelContent
      workTypes={workTypes}
      search={search}
      onSearchChange={setSearch}
      filter={filter}
      onFilterChange={setFilter}
      selectedWorkTypeId={selectedWorkTypeId}
      onSelect={(id) => {
        setSelectedWorkTypeId(id);
        setMobileListOpen(false);
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: "/dashboard" },
          { label: t("breadcrumbs.future") },
          { label: t("breadcrumbs.ai_coach") },
        ]}
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        actions={
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
            {t("beta_badge")}
          </Badge>
        }
      />

      {/* Mobile: selector button */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setMobileListOpen(true)}
        >
          <span className="text-sm">
            {selectedWorkType?.name ?? t("left_panel.title")}
          </span>
          <Search className="size-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Mobile list drawer */}
      <Drawer open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>{t("left_panel.title")}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">{leftPanel}</div>
        </DrawerContent>
      </Drawer>

      {/* Main 2-col layout */}
      <div
        className="grid lg:grid-cols-[20rem_1fr] gap-6"
        style={{ height: "calc(100vh - 9rem)" }}
      >
        {/* Left col — desktop only */}
        <Card className="hidden lg:flex flex-col overflow-hidden">{leftPanel}</Card>

        {/* Right col — Editor */}
        <Card className="flex flex-col overflow-hidden">
          {selectedWorkType == null ? (
            <EmptyState
              icon={BookOpen}
              title="Выберите тип работы"
              description="Выберите тип работы из списка слева, чтобы управлять подсказками"
              className="flex-1"
            />
          ) : hintsLoading ? (
            <EditorSkeleton />
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden p-4 md:p-6 gap-4">
              {/* Header */}
              <div className="shrink-0">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-foreground">
                      {selectedWorkType.name}
                    </h2>
                    {latestHint ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("editor.version_meta", {
                          version: latestHint.version,
                          activatedAt: new Date(latestHint.created_at).toLocaleDateString(
                            "ru-RU",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          ),
                          createdBy: "Соколова А. В.",
                        })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("empty.no_hint_title")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="shrink-0" />

              {hints.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title={t("empty.no_hint_title")}
                  description={t("page_subtitle")}
                  action={{
                    label: t("empty.no_hint_cta"),
                    icon: Plus,
                    onClick: () => {},
                  }}
                  className="flex-1"
                />
              ) : (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <EditorTabs
                    hints={hints}
                    abTest={abTest}
                    abTestLoading={abTestLoading}
                    workTypeName={selectedWorkType.name}
                    workTypeId={selectedWorkType.id}
                  />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
