"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import type { AuditEntry } from "@/lib/types";

interface DiffTableProps {
  diff: AuditEntry["diff"];
}

export function DiffTable({ diff }: DiffTableProps) {
  const t = useTranslations("screen.audit");

  if (!diff || diff.length === 0) return null;

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              {t("columns.entity_name")}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              {t("diff.before")}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              {t("diff.after")}
            </th>
          </tr>
        </thead>
        <tbody>
          {diff.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 font-mono text-muted-foreground">
                {row.field}
              </td>
              <td className="px-3 py-2">
                {row.before !== null && row.before !== undefined ? (
                  <span className="inline-flex rounded bg-destructive/10 text-destructive px-1.5 py-0.5 font-mono line-through">
                    {String(row.before)}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                {row.after !== null && row.after !== undefined ? (
                  <span className="inline-flex rounded bg-success/10 text-success px-1.5 py-0.5 font-mono">
                    {String(row.after)}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
