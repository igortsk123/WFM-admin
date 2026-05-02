"use client";

import { cn } from "@/lib/utils";

export type GaugeStatus = "danger" | "warning" | "success";

interface HealthGaugeProps {
  /** Главное число в центре шкалы. */
  value: number;
  /** Подпись над value (опционально, например "из 23,3 млн"). */
  valueSuffix?: string;
  /** Минимум шкалы (default 0). */
  min?: number;
  /** Максимум шкалы (default 100). */
  max?: number;
  /** Статус — определяет цвет заливки. */
  status: GaugeStatus;
  /** Подпись-чип под числом (например "Ниже нормы", "Риск нехватки"). */
  statusLabel?: string;
  /** Размер svg (квадратная коробка). default 220. */
  size?: number;
  /** Толщина дуги. default 18. */
  strokeWidth?: number;
  className?: string;
}

const STATUS_COLOR: Record<GaugeStatus, string> = {
  danger: "var(--destructive)",
  warning: "var(--warning, #f59e0b)",
  success: "var(--success, #10b981)",
};

const STATUS_BG: Record<GaugeStatus, string> = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

/**
 * Полукруглая шкала прогресса (semicircle gauge).
 * Используется на дашборде SUPERVISOR+ для health score и budget consumption.
 */
export function HealthGauge({
  value,
  valueSuffix,
  min = 0,
  max = 100,
  status,
  statusLabel,
  size = 220,
  strokeWidth = 18,
  className,
}: HealthGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Полукруг от 180° (слева) до 360°/0° (справа). Длина дуги = π * r.
  const arcLength = Math.PI * radius;

  // Нормализуем value в [0..1]
  const range = max - min;
  const normalized = range === 0 ? 0 : Math.min(1, Math.max(0, (value - min) / range));
  const filledLength = arcLength * normalized;

  // Точки полукруга: start = (cx - radius, cy), end = (cx + radius, cy)
  const startX = cx - radius;
  const startY = cy;
  const endX = cx + radius;
  const endY = cy;

  // SVG path для полукруга (sweep против часовой = верхняя половина)
  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  // Высота svg = половина (полукруг сверху) + место под текст центра
  const svgHeight = cy + strokeWidth;

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <svg
        width={size}
        height={svgHeight}
        viewBox={`0 0 ${size} ${svgHeight}`}
        role="img"
        aria-label={`Шкала: ${value}${valueSuffix ? " " + valueSuffix : ""}`}
      >
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={STATUS_COLOR[status]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${arcLength}`}
          style={{ transition: "stroke-dasharray 600ms ease-out" }}
        />
      </svg>

      {/* Center value (positioned absolutely over the lower part of the arc) */}
      <div
        className="pointer-events-none absolute flex flex-col items-center"
        style={{ top: cy - strokeWidth - 6, left: 0, right: 0 }}
      >
        <div className="text-4xl font-bold leading-none tabular-nums">
          {value.toLocaleString("ru-RU")}
        </div>
        {valueSuffix && (
          <div className="mt-1 text-xs text-muted-foreground">{valueSuffix}</div>
        )}
        {statusLabel && (
          <span
            className={cn(
              "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
              STATUS_BG[status],
            )}
          >
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}
