import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ContractCategory } from "@/features/contracts/types/contract";
import { useI18n } from '@/i18n/I18nProvider';
import { chartAxisTickStyle, chartTooltipContentStyle, chartTooltipItemStyle, chartTooltipLabelStyle } from '@/lib/chartTheme';

const COLORS = ["#3b8574", "#4a9e8a", "#5ab89f", "#6bd1b5", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

interface InsightsCategoryDatum {
  category: ContractCategory;
  label: string;
  icon: string;
  amount: number;
}

interface InsightsCategoryChartProps {
  data: InsightsCategoryDatum[];
}

export default function InsightsCategoryChart({ data }: InsightsCategoryChartProps) {
  const { formatCurrency } = useI18n();
  const rowHeight = 30;
  const chartHeight = Math.max(260, data.length * rowHeight + 40);

  return (
    <div style={{ height: `${chartHeight}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 6 }} barCategoryGap={10}>
          <XAxis type="number" tick={chartAxisTickStyle} tickFormatter={(v: number) => formatCurrency(v)} height={24} />
          <YAxis type="category" dataKey="label" tick={chartAxisTickStyle} width={140} interval={0} tickMargin={6} />
          <Tooltip contentStyle={chartTooltipContentStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v: number) => formatCurrency(v)} />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
