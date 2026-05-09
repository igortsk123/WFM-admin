"use client";

import dynamic from "next/dynamic";

const RegulationsSparkline = dynamic(
  () =>
    import("../regulations-sparkline").then((m) => m.RegulationsSparkline),
  { ssr: false, loading: () => null },
);

export function MiniSparkline({ value }: { value: number }) {
  // deterministic mini trend from the weekly count
  const data = Array.from({ length: 7 }, (_, i) => ({
    i,
    v: Math.max(0, value + Math.round(Math.sin(i + value) * (value * 0.2))),
  }));
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm tabular-nums">{value}</span>
      <div className="w-12 h-5 shrink-0" aria-hidden="true">
        <RegulationsSparkline data={data} />
      </div>
    </div>
  );
}
