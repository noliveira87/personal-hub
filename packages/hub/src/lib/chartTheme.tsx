import type { CSSProperties } from "react";

export const chartAxisTickStyle: CSSProperties = {
  fontSize: 12,
  fill: "hsl(var(--foreground) / 0.78)",
};

export const chartAxisTickStyleCompact: CSSProperties = {
  fontSize: 11,
  fill: "hsl(var(--foreground) / 0.78)",
};

export const chartTooltipContentStyle: CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  boxShadow: "0 10px 30px hsl(var(--foreground) / 0.12)",
  color: "hsl(var(--foreground))",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "hsl(var(--foreground))",
  fontWeight: 600,
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "hsl(var(--foreground))",
};

export function renderChartLegendLabel(value: string) {
  return <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>;
}