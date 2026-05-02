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
  /** Размер svg (квадратная коробка). default 240. */
  size?: number;
  /** Толщина дуги. default 18. */
  strokeWidth?: number;
  /** Locale для форматирования числа в центре. default "ru-RU". */
  locale?: string;
  className?: string;
}

const STATUS_STROKE: Record<GaugeStatus, string> = {
  danger: "#ef4444", // red-500
  warning: "#f59e0b", // amber-500
  success: "#10b981", // emerald-500
};

const STATUS_BG: Record<GaugeStatus, string> = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

/**
 * Полукруглая шкала прогресса (semicircle gauge).
 * Контент (число / подпись / статус) размещается в normal flow с negative margin,
 * чтобы parent контейнер корректно учитывал высоту всех элементов.
 */
export function HealthGauge({
  value,
  valueSuffix,
  min = 0,
  max = 100,
  status,
  statusLabel,
  size = 240,
  strokeWidth = 18,
  locale = "ru-RU",
  className,
}: HealthGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const arcLength = Math.PI * radius;
  const range = max - min;
  const normalized = range === 0 ? 0 : Math.min(1, Math.max(0, (value - min) / range));
  const filledLength = arcLength * normalized;

  const startX = cx - radius;
  const startY = cy;
  const endX = cx + radius;
  const endY = cy;

  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  const svgHeight = cy + strokeWidth;

  // Контент сдвигаем вверх внутрь дуги. Целевая позиция верха контента ~70% от cy.
  const overlap = Math.round(svgHeight * 0.45);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        width={size}
        height={svgHeight}
        viewBox={`0 0 ${size} ${svgHeight}`}
        role="img"
        aria-label={`${value}${valueSuffix ? " " + valueSuffix : ""}`}
      >
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.15)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={STATUS_STROKE[status]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${arcLength}`}
          style={{ transition: "stroke-dasharray 600ms ease-out" }}
        />
      </svg>

      {/* Center value: pulled up into the arc with negative margin */}
      <div
        className="flex flex-col items-center"
        style={{ marginTop: -overlap }}
      >
        <div className="text-4xl font-bold leading-none tabular-nums">
          {value.toLocaleString(locale)}
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
