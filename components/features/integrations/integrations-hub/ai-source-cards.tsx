"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  Package,
  Truck,
  Tag,
  Send,
  Cable,
  Info,
} from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";

import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { AiSourceStatusBadge, StatItem } from "./_shared";
import { ConnectorSheet, SimpleConnectorSheet } from "./connector-sheets";

interface AiSourcesSectionProps {
  isFashion: boolean;
}

export function AiSourcesSection({ isFashion }: AiSourcesSectionProps) {
  const t = useTranslations("screen.integrations");

  // AI source connector sheets
  const [posSheetOpen, setPosSheetOpen] = React.useState(false);
  const [inventorySheetOpen, setInventorySheetOpen] = React.useState(false);
  const [supplySheetOpen, setSupplySheetOpen] = React.useState(false);
  const [promoSheetOpen, setPromoSheetOpen] = React.useState(false);
  const [marketingSheetOpen, setMarketingSheetOpen] = React.useState(false);
  const [universalSheetOpen, setUniversalSheetOpen] = React.useState(false);

  // Count connected AI sources (mock: only POS connected for FMCG)
  const connectedAiSources = isFashion ? 0 : 1; // POS is "connected" for FMCG demo

  return (
    <section aria-label="Источники данных для ИИ">
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("ai_sources.section_title")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("ai_sources.section_subtitle")}</p>
        </div>

        {/* Demo hint alert */}
        {connectedAiSources === 0 && (
          <Alert className="border-info/30 bg-info/5">
            <Info className="size-4 text-info" />
            <AlertDescription className="text-sm">
              {t("ai_sources.hint_demo_alert")}{" "}
              <Link
                href={ADMIN_ROUTES.aiChat + "?context_type=general"}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {t("ai_sources.hint_demo_link")}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          {/* POS Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-info/10 text-info shrink-0">
                    <ShoppingCart className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{t("ai_sources.pos.title")}</p>
                  </div>
                </div>
                <AiSourceStatusBadge connected={!isFashion} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.pos.description")}</p>
            </CardHeader>
            <CardContent className="flex-1 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <StatItem label={t("ai_sources.pos.stat_checks")} value={!isFashion ? "124 567" : "—"} />
                <StatItem label={t("ai_sources.pos.stat_stores")} value={!isFashion ? "1 / 8" : "—"} />
                <StatItem label={t("ai_sources.pos.stat_last_check")} value={!isFashion ? "2 мин назад" : "—"} />
                <StatItem label={t("ai_sources.pos.stat_avg_check")} value={!isFashion ? "1 240 ₽" : "—"} />
              </div>
            </CardContent>
            <CardFooter className="gap-2 border-t border-border pt-2">
              <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setPosSheetOpen(true)}>
                {t("ai_sources.connect")}
              </Button>
              <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                {t("ai_sources.docs")}
              </Button>
            </CardFooter>
          </Card>

          {/* Inventory Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-warning/10 text-warning shrink-0">
                    <Package className="size-4" />
                  </span>
                  <p className="text-sm font-semibold">{t("ai_sources.inventory.title")}</p>
                </div>
                <AiSourceStatusBadge connected={false} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.inventory.description")}</p>
            </CardHeader>
            <CardContent className="flex-1 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <StatItem label={t("ai_sources.inventory.stat_sku")} value="—" />
                <StatItem label={t("ai_sources.inventory.stat_interval")} value="—" />
                <StatItem label={t("ai_sources.inventory.stat_last_update")} value="—" />
              </div>
            </CardContent>
            <CardFooter className="gap-2 border-t border-border pt-2">
              <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setInventorySheetOpen(true)}>
                {t("ai_sources.connect")}
              </Button>
            </CardFooter>
          </Card>

          {/* Supply Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-success/10 text-success shrink-0">
                    <Truck className="size-4" />
                  </span>
                  <p className="text-sm font-semibold">{t("ai_sources.supply.title")}</p>
                </div>
                <AiSourceStatusBadge connected={false} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.supply.description")}</p>
            </CardHeader>
            <CardContent className="flex-1 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <StatItem label={t("ai_sources.supply.stat_suppliers")} value="—" />
                <StatItem label={t("ai_sources.supply.stat_week")} value="—" />
                <StatItem label={t("ai_sources.supply.stat_last")} value="—" />
              </div>
            </CardContent>
            <CardFooter className="gap-2 border-t border-border pt-2">
              <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setSupplySheetOpen(true)}>
                {t("ai_sources.connect")}
              </Button>
            </CardFooter>
          </Card>

          {/* Promo Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
                    <Tag className="size-4" />
                  </span>
                  <p className="text-sm font-semibold">{t("ai_sources.promo.title")}</p>
                </div>
                <AiSourceStatusBadge connected={false} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.promo.description")}</p>
            </CardHeader>
            <CardContent className="flex-1 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <StatItem label={t("ai_sources.promo.stat_active")} value="—" />
                <StatItem label={t("ai_sources.promo.stat_tomorrow")} value="—" />
                <StatItem label={t("ai_sources.promo.stat_today_end")} value="—" />
              </div>
            </CardContent>
            <CardFooter className="gap-2 border-t border-border pt-2">
              <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setPromoSheetOpen(true)}>
                {t("ai_sources.connect")}
              </Button>
            </CardFooter>
          </Card>

          {/* Marketing Channel Card — fashion only */}
          {isFashion && (
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      <Send className="size-4" />
                    </span>
                    <p className="text-sm font-semibold">{t("ai_sources.marketing_channel.title")}</p>
                  </div>
                  <AiSourceStatusBadge connected={false} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.marketing_channel.description")}</p>
              </CardHeader>
              <CardContent className="flex-1 pb-2">
                <div className="grid grid-cols-2 gap-2">
                  <StatItem label={t("ai_sources.marketing_channel.stat_posts")} value="—" />
                  <StatItem label={t("ai_sources.marketing_channel.stat_last")} value="—" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-3 border-t border-border pt-3">
                  {t("ai_sources.marketing_channel.note")}
                </p>
              </CardContent>
              <CardFooter className="gap-2 border-t border-border pt-2">
                <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setMarketingSheetOpen(true)}>
                  {t("ai_sources.connect")}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Universal Connector Card */}
          <Card className="flex flex-col bg-muted/30 border-dashed">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                  <Cable className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t("ai_sources.connector_universal_title")}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.connector_universal_desc")}</p>
            </CardHeader>
            <CardContent className="flex-1 pb-2" />
            <CardFooter className="gap-2 border-t border-border pt-2">
              <Button size="sm" variant="default" className="gap-2 h-8 text-xs" onClick={() => setUniversalSheetOpen(true)}>
                {t("ai_sources.configure")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* ── AI Connector Sheets ──────────────────────────────────────── */}

      {/* POS sheet */}
      <SimpleConnectorSheet
        open={posSheetOpen}
        onOpenChange={setPosSheetOpen}
        title={t("ai_sources.pos.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("ai_sources.pos.api_url_label")}</Label>
              <Input placeholder="https://pos.example.com/api" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ai_sources.pos.api_key_label")}</Label>
              <Input type="password" placeholder="••••••••••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ai_sources.pos.connector_type_label")}</Label>
              <Select defaultValue="1C">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1C">1С</SelectItem>
                  <SelectItem value="SBIS">СБИС</SelectItem>
                  <SelectItem value="KASSA">Кассовый сервис</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("ai_sources.pos.data_label")}</Label>
              {[
                { id: "checks", label: t("ai_sources.pos.data_checks") },
                { id: "returns", label: t("ai_sources.pos.data_returns") },
                { id: "shifts", label: t("ai_sources.pos.data_shifts") },
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox id={`pos-${opt.id}`} defaultChecked={opt.id === "checks"} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        }
      />

      {/* Inventory sheet */}
      <SimpleConnectorSheet
        open={inventorySheetOpen}
        onOpenChange={setInventorySheetOpen}
        title={t("ai_sources.inventory.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input placeholder="https://wms.example.com/api" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" placeholder="••••••••••••••••" />
            </div>
          </div>
        }
      />

      {/* Supply sheet */}
      <SimpleConnectorSheet
        open={supplySheetOpen}
        onOpenChange={setSupplySheetOpen}
        title={t("ai_sources.supply.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input placeholder="https://supply.example.com/api" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" placeholder="••••••••••••••••" />
            </div>
          </div>
        }
      />

      {/* Promo sheet */}
      <SimpleConnectorSheet
        open={promoSheetOpen}
        onOpenChange={setPromoSheetOpen}
        title={t("ai_sources.promo.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input placeholder="https://promo.example.com/api" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" placeholder="••••••••••••••••" />
            </div>
          </div>
        }
      />

      {/* Marketing Channel sheet */}
      <SimpleConnectorSheet
        open={marketingSheetOpen}
        onOpenChange={setMarketingSheetOpen}
        title={t("ai_sources.marketing_channel.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("ai_sources.marketing_channel.field_name")}</Label>
              <Input placeholder="Telegram-канал распродаж" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ai_sources.marketing_channel.field_url")}</Label>
              <Input placeholder="https://api.telegram.org/bot..." />
            </div>
          </div>
        }
      />

      {/* Universal connector sheet */}
      <ConnectorSheet
        open={universalSheetOpen}
        onOpenChange={setUniversalSheetOpen}
        title={t("ai_sources.connector_universal_title")}
        onSave={() => {}}
        t={t}
        showDataOptions={[
          { id: "pos", label: t("ai_sources.pos.title") },
          { id: "inventory", label: t("ai_sources.inventory.title") },
          { id: "supply", label: t("ai_sources.supply.title") },
          { id: "promo", label: t("ai_sources.promo.title") },
        ]}
      />
    </section>
  );
}
