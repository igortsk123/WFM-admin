"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  RefreshCw,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { EmptyState } from "@/components/shared/empty-state";

import { getAllHints, type HintWithLabels } from "@/lib/api/hints";

import { formatDate } from "./_shared";

interface TableViewProps {
  onEdit: (hint: HintWithLabels) => void;
  onDelete: (hint: HintWithLabels) => void;
}

export function TableView({ onEdit, onDelete }: TableViewProps) {
  const t = useTranslations("screen.hints");
  const tCommon = useTranslations("common");

  const [searchText, setSearchText] = React.useState("");
  const [data, setData] = React.useState<HintWithLabels[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);

  async function load(search: string) {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await getAllHints({ search, page_size: 100 });
      setData(result.data);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    load(searchText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => load(searchText), 300);
    return () => clearTimeout(timer);

  }, [searchText]);

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription className="flex items-center gap-3">
          {tCommon("error")}
          <Button size="sm" variant="outline" onClick={() => load(searchText)}>
            <RefreshCw className="size-3.5 mr-1.5" /> {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t("filters.search_placeholder")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 w-10 px-4">#</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_work_type")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_zone")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_text")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_created_at")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4">{t("table_view.col_updated_at")}</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wide h-9 px-4 w-12">{t("table_view.col_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={SearchX}
                    title={t("empty.filtered_title")}
                    description={t("empty.filtered_reset")}
                    action={searchText ? { label: t("empty.filtered_reset"), onClick: () => setSearchText("") } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((hint, idx) => (
                <TableRow key={hint.id}>
                  <TableCell className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">{hint.work_type_name}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{hint.zone_name}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 max-w-xl">
                    <p className="text-sm font-medium line-clamp-2">{hint.text}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{formatDate(hint.created_at)}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{formatDate(hint.updated_at)}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <span className="sr-only">{tCommon("actions")}</span>
                          <span className="text-base leading-none">⋮</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(hint)}>
                          <Pencil className="size-3.5 mr-2" />
                          {t("row_actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(hint)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          {t("row_actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
        ) : data.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t("empty.filtered_title")}
            description={t("empty.filtered_reset")}
          />
        ) : (
          data.map((hint) => (
            <div key={hint.id} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{hint.work_type_name}</Badge>
                <Badge variant="outline" className="text-xs">{hint.zone_name}</Badge>
              </div>
              <p className="text-sm text-foreground leading-relaxed line-clamp-3">{hint.text}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{formatDate(hint.created_at)}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-9 min-h-[44px]" onClick={() => onEdit(hint)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9 min-h-[44px] text-destructive" onClick={() => onDelete(hint)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
