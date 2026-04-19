
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { useI18n } from '@/i18n/I18nProvider';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { parseCarChargingNotes } from '@/features/home-expenses/lib/carCharging';
import { getCarChargingTransactionName } from '@/features/home-expenses/lib/contractMapping';
import { formatCurrency } from '@/features/contracts/lib/contractUtils';

interface CarElectricityChartProps {
  contractId: string;
  contractName: string;
  contractStartDate?: string;
}

interface LegacyElectricityRow {
  id: string;
  contract_id: string;
  year: number;
  month: number;
  day: number | null;
  value_eur: number;
  charging_location?: 'home' | 'outside' | null;
  charging_note?: string | null;
}

interface HomeExpenseRow {
  id: string;
  contract_id: string | null;
  category: string | null;
  name: string;
  date: string;
  amount: number;
  notes: string | null;
}

interface ElectricityRow {
  id: string;
  year: number;
  month: number;
  day: number;
  value_eur: number;
  note: string | null;
  charging_location: 'home' | 'outside' | null;
  source: 'home-expenses' | 'legacy';
}

interface MonthlyGroup {
  key: string;
  year: number;
  month: number;
  total: number;
  rows: ElectricityRow[];
}

interface RentingRow {
  id: string;
  year: number;
  month: number;
  amount: number;
}

const chartConfig = {
  value: {
    label: 'Electricity',
    color: 'hsl(var(--primary))',
  },
  charging: {
    label: 'Charging',
    color: 'hsl(var(--primary))',
  },
  renting: {
    label: 'Renting',
    color: 'hsl(var(--muted-foreground))',
  },
  total: {
    label: 'Total',
    color: 'hsl(var(--foreground))',
  },
} satisfies ChartConfig;

const subtleIconButtonClassName = 'h-9 w-9 rounded-xl border-border/50 bg-transparent text-muted-foreground shadow-none hover:bg-accent/50 hover:text-foreground';

function parseDateParts(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function isChargingExpenseRow(row: HomeExpenseRow): boolean {
  const parsedChargingNotes = parseCarChargingNotes(row.notes);
  if (parsedChargingNotes.location) {
    return true;
  }

  const normalizedName = row.name.trim().toLowerCase();
  return normalizedName.includes('carregamento') || normalizedName.includes('charging');
}

function isRentingExpenseRow(row: HomeExpenseRow): boolean {
  if (row.category === 'carRenting' || row.category === 'car') return true;
  const normalizedName = row.name.trim().toLowerCase();
  return normalizedName.includes('renting')
    || normalizedName.startsWith('carro -')
    || normalizedName.startsWith('car -');
}

export default function CarElectricityChart({ contractId, contractName, contractStartDate }: CarElectricityChartProps) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<ElectricityRow[]>([]);
  const [rentingRows, setRentingRows] = useState<RentingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [visibleMonths, setVisibleMonths] = useState(3);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [source, setSource] = useState<'home-expenses' | 'legacy'>('home-expenses');

  const monthlyGroups = useMemo<MonthlyGroup[]>(() => {
    const map = new Map<string, MonthlyGroup>();

    for (const row of rows) {
      const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          year: row.year,
          month: row.month,
          total: row.value_eur,
          rows: [row],
        });
      } else {
        existing.total += row.value_eur;
        existing.rows.push(row);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [rows]);

  const availableYears = useMemo(() => {
    const datasetYears = [
      ...rows.map((row) => row.year),
      ...rentingRows.map((row) => row.year),
    ].filter((value) => Number.isFinite(value));

    const startYearFromContract = contractStartDate ? Number(contractStartDate.slice(0, 4)) : NaN;
    const minYearFromData = datasetYears.length > 0 ? Math.min(...datasetYears) : NaN;
    const maxYearFromData = datasetYears.length > 0 ? Math.max(...datasetYears) : NaN;
    const currentYear = new Date().getFullYear();

    const startYear = Number.isFinite(startYearFromContract)
      ? startYearFromContract
      : (Number.isFinite(minYearFromData) ? minYearFromData : currentYear);

    const endYear = Math.max(
      currentYear,
      Number.isFinite(maxYearFromData) ? maxYearFromData : currentYear,
    );

    const years: number[] = [];
    for (let year = endYear; year >= startYear; year -= 1) {
      years.push(year);
    }

    return years;
  }, [rows, rentingRows, contractStartDate]);

  const monthlyGroupsForYear = useMemo(
    () => selectedYear === 'all' ? monthlyGroups : monthlyGroups.filter((group) => group.year === selectedYear),
    [monthlyGroups, selectedYear],
  );

  const visibleGroups = monthlyGroupsForYear.slice(0, visibleMonths);

  const chartData = useMemo(() => {
    const sorted = [...monthlyGroupsForYear].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return sorted.map((item) => ({
      label: `${new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(item.year, item.month - 1, 1))} ${item.year}`,
      value: Number(item.total.toFixed(2)),
    }));
  }, [locale, monthlyGroupsForYear]);

  const monthlyTotalCostData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (selectedYear === 'all') {
      if (availableYears.length === 0) return [];

      const yearsAsc = [...availableYears].sort((a, b) => a - b);
      const startYear = yearsAsc[0];
      const endYear = yearsAsc[yearsAsc.length - 1];

      const monthMap = new Map<string, { year: number; month: number; charging: number; renting: number }>();

      for (let year = startYear; year <= endYear; year += 1) {
        const lastMonth = year === currentYear ? currentMonth : 12;
        for (let month = 1; month <= lastMonth; month += 1) {
          const key = `${year}-${String(month).padStart(2, '0')}`;
          monthMap.set(key, { year, month, charging: 0, renting: 0 });
        }
      }

      rows.forEach((row) => {
        const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
        const current = monthMap.get(key);
        if (!current) return;
        current.charging += row.value_eur;
      });

      rentingRows.forEach((row) => {
        const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
        const current = monthMap.get(key);
        if (!current) return;
        current.renting += row.amount;
      });

      return Array.from(monthMap.values())
        .sort((a, b) => (a.year - b.year) || (a.month - b.month))
        .map((item) => ({
          month: item.month,
          label: `${new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(item.year, item.month - 1, 1))} ${item.year}`,
          charging: Number(item.charging.toFixed(2)),
          renting: Number(item.renting.toFixed(2)),
          total: Number((item.charging + item.renting).toFixed(2)),
        }));
    }

    const monthMap = new Map<number, { month: number; charging: number; renting: number }>();

    const lastMonth = selectedYear === currentYear ? currentMonth : 12;
    for (let month = 1; month <= lastMonth; month += 1) {
      monthMap.set(month, { month, charging: 0, renting: 0 });
    }

    rows
      .filter((row) => row.year === selectedYear)
      .forEach((row) => {
        const current = monthMap.get(row.month);
        if (!current) return;
        current.charging += row.value_eur;
      });

    rentingRows
      .filter((row) => row.year === selectedYear)
      .forEach((row) => {
        const current = monthMap.get(row.month);
        if (!current) return;
        current.renting += row.amount;
      });

    return Array.from(monthMap.values())
      .map((item) => ({
        month: item.month,
        label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(selectedYear, item.month - 1, 1)),
        charging: Number(item.charging.toFixed(2)),
        renting: Number(item.renting.toFixed(2)),
        total: Number((item.charging + item.renting).toFixed(2)),
      }));
  }, [rows, rentingRows, selectedYear, locale, availableYears]);

  const chargingTransactionName = useMemo(() => getCarChargingTransactionName(contractName), [contractName]);

  const homeExpensesLink = useMemo(() => {
    const params = new URLSearchParams({
      open: '1',
      contractId,
      category: 'car',
      name: chargingTransactionName,
    });

    return `/home-expenses/transactions?${params.toString()}`;
  }, [contractId, chargingTransactionName]);

  useEffect(() => {
    if (availableYears.length === 0) {
      setSelectedYear(new Date().getFullYear());
      return;
    }

    if (selectedYear !== 'all' && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    setVisibleMonths(3);
    setExpandedMonths({});
  }, [selectedYear]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const [expenseResponse, legacyResponse] = await Promise.all([
        supabase
          .from('home_expenses_transactions')
          .select('id, contract_id, category, name, date, amount, notes')
          .eq('type', 'expense')
          .eq('contract_id', contractId)
          .order('date', { ascending: true }),
        supabase
          .from('car_electricity_history')
          .select('id, contract_id, year, month, day, value_eur, charging_location, charging_note')
          .eq('contract_id', contractId)
          .order('year', { ascending: true })
          .order('month', { ascending: true })
          .order('day', { ascending: true }),
      ]);

      if (legacyResponse.error) {
        setError(legacyResponse.error.message);
        setRows([]);
        setRentingRows([]);
        setLoading(false);
        return;
      }

      const legacyRows = ((legacyResponse.data ?? []) as LegacyElectricityRow[]).map((row) => ({
        id: row.id,
        year: row.year,
        month: row.month,
        day: row.day ?? 1,
        value_eur: Number(row.value_eur),
        note: row.charging_note ?? null,
        charging_location: row.charging_location ?? null,
        source: 'legacy' as const,
      }));

      if (expenseResponse.error) {
        setError(expenseResponse.error.message);
        setRows([]);
        setRentingRows([]);
        setLoading(false);
        return;
      }

      const allExpenseRows = (expenseResponse.data ?? []) as HomeExpenseRow[];

      const expenseRows = allExpenseRows
        .filter(isChargingExpenseRow)
        .map((row) => {
          const parts = parseDateParts(row.date);
          const parsedChargingNotes = parseCarChargingNotes(row.notes);
          return {
            id: row.id,
            year: parts.year,
            month: parts.month,
            day: parts.day,
            value_eur: Number(row.amount),
            note: parsedChargingNotes.description,
            charging_location: parsedChargingNotes.location,
            source: 'home-expenses' as const,
          };
        });

      const rentingExpenseRows = allExpenseRows
        .filter((row) => !isChargingExpenseRow(row) && isRentingExpenseRow(row))
        .map((row) => {
          const parts = parseDateParts(row.date);
          return {
            id: row.id,
            year: parts.year,
            month: parts.month,
            amount: Number(row.amount),
          } satisfies RentingRow;
        });

      const mergedRows = [...legacyRows, ...expenseRows].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        if (a.day !== b.day) return a.day - b.day;
        return a.source.localeCompare(b.source);
      });

      setRows(mergedRows);
      setRentingRows(rentingExpenseRows);
      setSource(expenseRows.length > 0 ? 'home-expenses' : 'legacy');
      setLoading(false);
    }

    void fetchData();
  }, [contractId]);

  function toggleMonthDetails(monthKey: string) {
    setExpandedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  }

  if (loading) {
    return <div className="py-4 text-sm text-muted-foreground">{t('contracts.electricity.loading')}</div>;
  }

  if (error) {
    return <div className="py-4 text-sm text-destructive">{t('contracts.electricity.errorPrefix')}: {error}</div>;
  }

  return (
    <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '180ms' }}>
      <h2 className="text-sm font-semibold text-foreground mb-4">{t('contracts.electricity.title')}</h2>

      <div className="mb-4 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p>
          {source === 'legacy'
            ? t('contracts.electricity.legacyManagedHint')
            : t('contracts.electricity.managedInExpensesHint')}
        </p>
        <div className="mt-3">
          <Link to={homeExpensesLink} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ExternalLink className="h-4 w-4" />
            {t('contracts.electricity.openHomeExpenses')}
          </Link>
        </div>
      </div>

      <div className="mb-4 rounded-lg border bg-muted/20 p-3">
        <div className="max-w-[240px]">
          <p className="text-xs text-muted-foreground">{t('contracts.electricity.viewYear')}</p>
          <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(value === 'all' ? 'all' : Number(value))}>
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder={t('contracts.electricity.selectYear')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('contracts.electricity.allYears')}</SelectItem>
              {(availableYears.length === 0 ? [selectedYear] : availableYears).map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {monthlyTotalCostData.length > 0 ? (
        <div className="mb-5 rounded-2xl border border-border/60 bg-background/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('contracts.electricity.monthlyCarCostTrendTitle', { year: String(selectedYear) })}
            </h3>
            <p className="text-xs text-muted-foreground">{t('contracts.electricity.monthlyCarCostTrendHint')}</p>
          </div>

          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <LineChart data={monthlyTotalCostData} margin={{ left: 8, right: 8, top: 12, bottom: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value: number) => formatCurrency(value)} width={88} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="renting" stroke="var(--color-renting)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-renting)' }} activeDot={{ r: 4, fill: 'var(--color-renting)' }} />
              <Line type="monotone" dataKey="charging" stroke="var(--color-charging)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-charging)' }} activeDot={{ r: 4, fill: 'var(--color-charging)' }} />
              <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2.5} dot={{ r: 3.5, fill: 'var(--color-total)' }} activeDot={{ r: 5, fill: 'var(--color-total)' }} />
            </LineChart>
          </ChartContainer>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="py-4 text-sm text-muted-foreground">{t('contracts.electricity.noData')}</div>
      ) : (
        <>
          <div className="mb-4 rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">{t('contracts.electricity.yearlyHint')}</p>
          </div>

          {chartData.length > 0 && (
            <div className="mb-5 rounded-2xl border border-border/60 bg-background/40 p-3">
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <LineChart data={chartData} margin={{ left: 8, right: 8, top: 12, bottom: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value: number) => formatCurrency(value)} width={88} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="linear"
                    dataKey="value"
                    stroke="var(--color-value)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--color-value)' }}
                    activeDot={{ r: 5, fill: 'var(--color-value)' }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          )}

          <div className="space-y-3 sm:hidden">
            {visibleGroups.map((group) => {
              const isExpanded = expandedMonths[group.key] === true;
              const homeCount = group.rows.filter((row) => row.charging_location === 'home').length;
              const outsideCount = group.rows.filter((row) => row.charging_location === 'outside').length;
              const monthLabel = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(group.year, group.month - 1, 1));

              return (
                <div key={group.key} className="rounded-xl border border-border/70 bg-background/50">
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-foreground">{monthLabel}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{group.rows.length}</Badge>
                        {source === 'legacy' && <Badge variant="outline">{t('contracts.electricity.home')} {homeCount}</Badge>}
                        {source === 'legacy' && <Badge variant="outline">{t('contracts.electricity.outside')} {outsideCount}</Badge>}
                      </div>
                    </div>
                    <Button type="button" size="icon" variant="outline" className={subtleIconButtonClassName} onClick={() => toggleMonthDetails(group.key)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="border-t border-border/60 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{t('contracts.electricity.totalValue')}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                      {Number(group.total.toFixed(2)).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-border/60 px-4 py-2">
                      {group.rows.map((row) => (
                        <div key={row.id} className="border-b border-border/50 py-3 last:border-b-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {t('contracts.electricity.dayLabel', { day: row.day })}
                                {row.note ? ` · ${row.note}` : ''}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {row.charging_location === 'home' && t('contracts.electricity.home')}
                                {row.charging_location === 'outside' && t('contracts.electricity.outside')}
                                {row.source === 'home-expenses' && !row.charging_location && t('contracts.electricity.loggedInExpenses')}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                              {Number(row.value_eur.toFixed(2)).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('contracts.electricity.monthYear')}</TableHead>
                  <TableHead>{t('contracts.electricity.entries')}</TableHead>
                  <TableHead>{t('contracts.electricity.totalValue')}</TableHead>
                  <TableHead className="text-right">{t('contracts.electricity.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleGroups.map((group) => {
                  const isExpanded = expandedMonths[group.key] === true;
                  const homeCount = group.rows.filter((row) => row.charging_location === 'home').length;
                  const outsideCount = group.rows.filter((row) => row.charging_location === 'outside').length;

                  return (
                    <React.Fragment key={group.key}>
                      <TableRow>
                        <TableCell>
                          {new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(group.year, group.month - 1, 1))}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{group.rows.length}</Badge>
                            {source === 'legacy' && <Badge variant="outline">{t('contracts.electricity.home')} {homeCount}</Badge>}
                            {source === 'legacy' && <Badge variant="outline">{t('contracts.electricity.outside')} {outsideCount}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{Number(group.total.toFixed(2)).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" size="icon" variant="outline" className={subtleIconButtonClassName} onClick={() => toggleMonthDetails(group.key)}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && group.rows.map((row) => (
                        <TableRow key={row.id} className="bg-muted/10">
                          <TableCell className="pl-8 text-xs text-muted-foreground">
                            {t('contracts.electricity.dayLabel', { day: row.day })}
                            {row.note ? ` · ${row.note}` : ''}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.charging_location === 'home' && t('contracts.electricity.home')}
                            {row.charging_location === 'outside' && t('contracts.electricity.outside')}
                            {row.source === 'home-expenses' && !row.charging_location && t('contracts.electricity.loggedInExpenses')}
                          </TableCell>
                          <TableCell>{Number(row.value_eur.toFixed(2)).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell />
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {monthlyGroupsForYear.length > visibleMonths && (
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="outline" onClick={() => setVisibleMonths((prev) => prev + 3)}>
                {t('contracts.electricity.loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
