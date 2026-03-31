import { X } from 'lucide-react';
import { usePriceHistory } from '@/hooks/use-price-history';
import { useI18n } from '@/i18n/I18nProvider';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface PriceHistoryModalProps {
  contractId: string;
  contractName: string;
  currentPrice: number;
  currency: string;
  onClose: () => void;
}

export function PriceHistoryModal({
  contractId,
  contractName,
  currentPrice,
  currency,
  onClose,
}: PriceHistoryModalProps) {
  const { history, loading, error } = usePriceHistory(contractId);
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    history.forEach((entry) => {
      years.add(new Date(entry.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const effectiveYear = availableYears.includes(selectedYear)
    ? selectedYear
    : (availableYears[0] ?? selectedYear);

  const monthlyChartData = useMemo(() => {
    if (history.length === 0) return [];

    const monthLabels = Array.from({ length: 12 }, (_, monthIndex) => ({
      month: new Date(effectiveYear, monthIndex, 1).toLocaleDateString('pt-PT', { month: 'short' }),
      monthIndex,
      value: null as number | null,
    }));

    const latestByMonth = new Map<number, { date: string; value: number }>();

    history
      .filter((entry) => new Date(entry.date).getFullYear() === effectiveYear)
      .forEach((entry) => {
        const monthIndex = new Date(entry.date).getMonth();
        const current = latestByMonth.get(monthIndex);

        if (!current || entry.date > current.date) {
          latestByMonth.set(monthIndex, { date: entry.date, value: entry.price });
        }
      });

    return monthLabels.map((month) => ({
      month: month.month,
      value: latestByMonth.get(month.monthIndex)?.value ?? null,
    }));
  }, [history, effectiveYear]);

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => new Date(entry.date).getFullYear() === effectiveYear);
  }, [history, effectiveYear]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl border max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-card border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{contractName}</h2>
            <p className="text-xs text-muted-foreground mt-1">Current: {formatCurrency(currentPrice, currency)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Price history is now read from Home Expenses. Add or edit linked contract expenses there.
            <div className="mt-3">
              <Link to="/home-expenses/monthly" className="font-medium text-primary hover:underline" onClick={onClose}>
                Open Home Expenses
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading price history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">Error: {error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No linked expense history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">Yearly Evolution</h3>
                {availableYears.length > 0 && (
                  <select
                    value={effectiveYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                )}
              </div>

              {monthlyChartData.some((point) => point.value != null) ? (
                <div className="h-64 rounded-lg border bg-background p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => formatCurrency(Number(value), currency)}
                        width={84}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(Number(value), currency)}
                        labelFormatter={(label) => `${label} ${effectiveYear}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground rounded-lg border bg-muted/20">
                  No data for {effectiveYear}
                </div>
              )}

              <div className="space-y-2">
                {filteredHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(entry.price, currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
