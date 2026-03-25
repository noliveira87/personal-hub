import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ContractCategory } from "@/types/contract";
import { formatCurrency } from "@/lib/contractUtils";

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
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={110} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
