
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useI18n } from '@/i18n/I18nProvider';
import { Check, ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

interface CarElectricityChartProps {
  contractId: string;
}

interface ElectricityRow {
  id: string;
  contract_id: string;
  year: number;
  month: number;
  day: number | null;
  value_eur: number;
  charging_location?: 'home' | 'outside' | null;
  charging_note?: string | null;
  created_at: string;
}

interface MonthlyGroup {
  key: string;
  year: number;
  month: number;
  total: number;
  rows: ElectricityRow[];
}

const chartConfig = {
  value: {
    label: 'Electricity',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const iconButtonClassName = 'h-10 w-10 rounded-2xl border-border/70 bg-background shadow-sm hover:bg-accent/60';
const subtleIconButtonClassName = 'h-9 w-9 rounded-xl border-border/50 bg-transparent text-muted-foreground shadow-none hover:bg-accent/50 hover:text-foreground';
const subtleActionButtonClassName = 'h-9 rounded-xl border-border/50 bg-transparent px-3 text-muted-foreground shadow-none hover:bg-accent/50 hover:text-foreground';

export default function CarElectricityChart({ contractId }: CarElectricityChartProps) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<ElectricityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [day, setDay] = useState<number>(1);
  const [value, setValue] = useState('');
  const [location, setLocation] = useState<'home' | 'outside'>('home');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editMonth, setEditMonth] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const [visibleMonths, setVisibleMonths] = useState(3);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [entryEditId, setEntryEditId] = useState<string | null>(null);
  const [entryEditValue, setEntryEditValue] = useState('');
  const [entryEditDay, setEntryEditDay] = useState('1');
  const [entryEditLocation, setEntryEditLocation] = useState<'home' | 'outside'>('home');
  const [entryEditNote, setEntryEditNote] = useState('');
  const [entrySubmitting, setEntrySubmitting] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [detailAddMonth, setDetailAddMonth] = useState<string | null>(null);
  const [detailAddDay, setDetailAddDay] = useState('1');
  const [detailAddValue, setDetailAddValue] = useState('');
  const [detailAddLocation, setDetailAddLocation] = useState<'home' | 'outside'>('home');
  const [detailAddNote, setDetailAddNote] = useState('');
  const [detailSubmitting, setDetailSubmitting] = useState(false);

  const valueInputRef = useRef<HTMLInputElement>(null);

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
    const uniqueYears = Array.from(new Set(rows.map(row => row.year))).sort((a, b) => b - a);
    return uniqueYears;
  }, [rows]);

  const monthlyGroupsForYear = useMemo(
    () => monthlyGroups.filter(group => group.year === selectedYear),
    [monthlyGroups, selectedYear],
  );

  const visibleGroups = monthlyGroupsForYear.slice(0, visibleMonths);

  const chartSeries = useMemo(() => {
    const asc = [...monthlyGroupsForYear].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return {
      labels: asc.map(item => {
        const label = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(item.year, item.month - 1, 1));
        return `${label} ${item.year}`;
      }),
      values: asc.map(item => Number(item.total.toFixed(2))),
    };
  }, [monthlyGroupsForYear, locale]);

  const chartData = useMemo(
    () => chartSeries.labels.map((label, index) => ({ label, value: chartSeries.values[index] ?? 0 })),
    [chartSeries.labels, chartSeries.values],
  );

  useEffect(() => {
    if (availableYears.length === 0) {
      setSelectedYear(new Date().getFullYear());
      return;
    }

    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    setVisibleMonths(3);
    setExpandedMonths({});
    setEditMonth(null);
    setDetailAddMonth(null);
    setEntryEditId(null);
  }, [selectedYear]);

  async function fetchData() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('car_electricity_history')
      .select('*')
      .eq('contract_id', contractId)
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .order('day', { ascending: true });

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as ElectricityRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setEditSuccess(null);

    const numeric = Number.parseFloat(value.replace(',', '.'));
    if (!year || !month || !day || Number.isNaN(numeric) || numeric < 0) {
      setFormError(t('contracts.electricity.invalidMainForm'));
      setSubmitting(false);
      return;
    }

    if (location === 'outside' && !note.trim()) {
      setFormError(t('contracts.electricity.outsideNeedsDescription'));
      setSubmitting(false);
      return;
    }

    const existing = rows.find(
      row => row.year === year && row.month === month && (row.day ?? 1) === day,
    );

    if (existing) {
      const { error } = await supabase
        .from('car_electricity_history')
        .update({
          value_eur: Number((existing.value_eur + numeric).toFixed(2)),
          charging_location: location,
          charging_note: location === 'outside' ? note.trim() : null,
        })
        .eq('id', existing.id);

      if (error) {
        setFormError(error.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('car_electricity_history')
        .insert({
          contract_id: contractId,
          year,
          month,
          day,
          value_eur: Number(numeric.toFixed(2)),
          charging_location: location,
          charging_note: location === 'outside' ? note.trim() : null,
        });

      if (error) {
        setFormError(error.message);
        setSubmitting(false);
        return;
      }
    }

    await fetchData();
    setValue('');
    setDay(1);
    setLocation('home');
    setNote('');
    setShowAddForm(false);
    setTimeout(() => valueInputRef.current?.focus(), 50);
    setSubmitting(false);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMonth) return;

    setEditSubmitting(true);
    setEditError(null);
    setEditSuccess(null);

    const numeric = Number.parseFloat(editValue.replace(',', '.'));
    if (Number.isNaN(numeric) || numeric < 0) {
      setEditError(t('contracts.electricity.invalidValue'));
      setEditSubmitting(false);
      return;
    }

    const [yearStr, monthStr] = editMonth.split('-');
    const targetYear = Number(yearStr);
    const targetMonth = Number(monthStr);

    const { error: deleteError } = await supabase
      .from('car_electricity_history')
      .delete()
      .eq('contract_id', contractId)
      .eq('year', targetYear)
      .eq('month', targetMonth);

    if (deleteError) {
      setEditError(deleteError.message);
      setEditSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('car_electricity_history')
      .insert({
        contract_id: contractId,
        year: targetYear,
        month: targetMonth,
        day: 1,
        value_eur: Number(numeric.toFixed(2)),
        charging_location: 'home',
        charging_note: 'Ajuste mensal',
      });

    if (insertError) {
      setEditError(insertError.message);
      setEditSubmitting(false);
      return;
    }

    setEditSuccess(t('contracts.electricity.monthUpdatedSuccess'));
    setEditMonth(null);
    await fetchData();
    setEditSubmitting(false);
  }

  function toggleMonthDetails(monthKey: string) {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  }

  async function handleEntryDelete(entryId: string) {
    setEntrySubmitting(true);
    setEditError(null);
    setEditSuccess(null);

    const { error } = await supabase
      .from('car_electricity_history')
      .delete()
      .eq('id', entryId);

    if (error) {
      setEditError(error.message);
      setEntrySubmitting(false);
      return;
    }

    if (entryEditId === entryId) {
      setEntryEditId(null);
    }

    await fetchData();
    setEntrySubmitting(false);
  }

  async function handleEntryEditSubmit(e: React.FormEvent, rowId: string) {
    e.preventDefault();
    setEntrySubmitting(true);
    setEditError(null);
    setEditSuccess(null);

    const numeric = Number.parseFloat(entryEditValue.replace(',', '.'));
    const parsedDay = Number(entryEditDay);

    if (Number.isNaN(numeric) || numeric < 0 || Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setEditError(t('contracts.electricity.invalidDayOrValue'));
      setEntrySubmitting(false);
      return;
    }

    if (entryEditLocation === 'outside' && !entryEditNote.trim()) {
      setEditError(t('contracts.electricity.outsideNeedsDescription'));
      setEntrySubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('car_electricity_history')
      .update({
        day: parsedDay,
        value_eur: Number(numeric.toFixed(2)),
        charging_location: entryEditLocation,
        charging_note: entryEditLocation === 'outside' ? entryEditNote.trim() : null,
      })
      .eq('id', rowId);

    if (error) {
      setEditError(error.message);
      setEntrySubmitting(false);
      return;
    }

    setEntryEditId(null);
    setEditSuccess(t('contracts.electricity.entryUpdatedSuccess'));
    await fetchData();
    setEntrySubmitting(false);
  }

  async function handleDetailAddSubmit(e: React.FormEvent, group: MonthlyGroup) {
    e.preventDefault();
    setDetailSubmitting(true);
    setEditError(null);
    setEditSuccess(null);

    const parsedDay = Number(detailAddDay);
    const numeric = Number.parseFloat(detailAddValue.replace(',', '.'));

    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31 || Number.isNaN(numeric) || numeric < 0) {
      setEditError(t('contracts.electricity.invalidDayOrValue'));
      setDetailSubmitting(false);
      return;
    }

    if (detailAddLocation === 'outside' && !detailAddNote.trim()) {
      setEditError(t('contracts.electricity.outsideNeedsDescription'));
      setDetailSubmitting(false);
      return;
    }

    const existing = rows.find(
      row => row.year === group.year && row.month === group.month && (row.day ?? 1) === parsedDay,
    );

    if (existing) {
      const { error } = await supabase
        .from('car_electricity_history')
        .update({
          value_eur: Number((existing.value_eur + numeric).toFixed(2)),
          charging_location: detailAddLocation,
          charging_note: detailAddLocation === 'outside' ? detailAddNote.trim() : null,
        })
        .eq('id', existing.id);

      if (error) {
        setEditError(error.message);
        setDetailSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('car_electricity_history')
        .insert({
          contract_id: contractId,
          year: group.year,
          month: group.month,
          day: parsedDay,
          value_eur: Number(numeric.toFixed(2)),
          charging_location: detailAddLocation,
          charging_note: detailAddLocation === 'outside' ? detailAddNote.trim() : null,
        });

      if (error) {
        setEditError(error.message);
        setDetailSubmitting(false);
        return;
      }
    }

    setDetailAddMonth(null);
    setDetailAddDay('1');
    setDetailAddValue('');
    setDetailAddLocation('home');
    setDetailAddNote('');
    setEditSuccess(t('contracts.electricity.entryAddedSuccess'));
    await fetchData();
    setDetailSubmitting(false);
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

      <div className="mb-4 flex items-end justify-between gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="min-w-[180px]">
          <p className="text-xs text-muted-foreground">{t('contracts.electricity.viewYear')}</p>
          <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder={t('contracts.electricity.selectYear')} />
            </SelectTrigger>
            <SelectContent>
              {(availableYears.length === 0 ? [selectedYear] : availableYears).map((availableYear) => (
                <SelectItem key={availableYear} value={String(availableYear)}>
                  {availableYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">{t('contracts.electricity.yearlyHint')}</p>
      </div>

      <div className="mb-4">
        <Button
          type="button"
          size="sm"
          variant={showAddForm ? 'ghost' : 'outline'}
          className={showAddForm ? 'h-8 px-3 text-xs text-muted-foreground hover:text-foreground' : subtleActionButtonClassName}
          onClick={() => setShowAddForm(prev => !prev)}
        >
          {showAddForm ? (
            <><X className="mr-1.5 h-3.5 w-3.5" />{t('contracts.electricity.cancel')}</>
          ) : (
            <><Plus className="mr-1.5 h-3.5 w-3.5" />{t('contracts.electricity.add')}</>
          )}
        </Button>
      </div>

      {showAddForm && (
      <form className="mb-4 flex flex-wrap gap-2 items-end" onSubmit={handleAddEntry} autoComplete="off">
        <div>
          <label className="block text-xs mb-1" htmlFor="elec-year">{t('contracts.electricity.year')}</label>
          <Input id="elec-year" type="number" min={2020} max={2100} className="w-20" value={year} onChange={e => setYear(Number(e.target.value))} disabled={submitting} />
        </div>
        <div>
          <label className="block text-xs mb-1" htmlFor="elec-month">{t('contracts.electricity.month')}</label>
          <Input id="elec-month" type="number" min={1} max={12} className="w-16" value={month} onChange={e => setMonth(Number(e.target.value))} disabled={submitting} />
        </div>
        <div>
          <label className="block text-xs mb-1" htmlFor="elec-day">{t('contracts.electricity.day')}</label>
          <Input id="elec-day" type="number" min={1} max={31} className="w-16" value={day} onChange={e => setDay(Number(e.target.value))} disabled={submitting} />
        </div>
        <div>
          <label className="block text-xs mb-1" htmlFor="elec-value">{t('contracts.electricity.value')}</label>
          <Input
            id="elec-value"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([\.,][0-9]{1,2})?"
            className="w-24"
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={submitting}
            ref={valueInputRef}
          />
        </div>
        <div className="min-w-[150px]">
          <label className="block text-xs mb-1">{t('contracts.electricity.location')}</label>
          <Select value={location} onValueChange={(v: 'home' | 'outside') => setLocation(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">{t('contracts.electricity.home')}</SelectItem>
              <SelectItem value="outside">{t('contracts.electricity.outside')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {location === 'outside' && (
          <div className="min-w-[220px] flex-1">
            <label className="block text-xs mb-1" htmlFor="elec-note">{t('contracts.electricity.description')}</label>
            <Input
              id="elec-note"
              type="text"
              placeholder={t('contracts.electricity.descriptionPlaceholder')}
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={submitting}
            />
          </div>
        )}
        <Button
          type="submit"
          size="sm"
          variant="default"
          className="h-8 px-3 text-xs"
          disabled={submitting}
        >
          {submitting ? (
            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t('contracts.electricity.saving')}</>
          ) : (
            <><Check className="mr-1.5 h-3.5 w-3.5" />{t('contracts.electricity.confirm')}</>
          )}
        </Button>
      </form>
      )}

      {formError && <p className="text-xs text-destructive mb-3">{formError}</p>}
      {editError && <p className="text-xs text-destructive mb-3">{editError}</p>}
      {editSuccess && <p className="text-xs text-green-600 mb-3">{editSuccess}</p>}

      <div className="mb-6">
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
            {visibleGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">{t('contracts.electricity.noData')}</TableCell>
              </TableRow>
            ) : (
              visibleGroups.map(group => (
                <React.Fragment key={group.key}>
                  <TableRow className="align-middle">
                    <TableCell className="font-medium">
                      {new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(group.year, group.month - 1, 1))} {group.year}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{group.rows.length}</Badge>
                        <Badge variant="outline">
                          {t('contracts.electricity.home')} {group.rows.filter(r => (r.charging_location ?? 'home') === 'home').length}
                        </Badge>
                        <Badge variant="outline">
                          {t('contracts.electricity.outside')} {group.rows.filter(r => r.charging_location === 'outside').length}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editMonth === group.key ? (
                        <form className="flex items-center gap-2" onSubmit={handleEditSubmit}>
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]+([\.,][0-9]{1,2})?"
                            className="w-24"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            disabled={editSubmitting}
                            autoFocus
                          />
                          <Button type="submit" size="sm" variant="outline" disabled={editSubmitting}>
                            {editSubmitting ? t('contracts.electricity.saving') : t('common.save')}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditMonth(null);
                              setEditError(null);
                              setEditSuccess(null);
                            }}
                            disabled={editSubmitting}
                          >
                            {t('common.cancel')}
                          </Button>
                        </form>
                      ) : (
                        <span>{group.total.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className={iconButtonClassName}
                              onClick={() => toggleMonthDetails(group.key)}
                              aria-label={expandedMonths[group.key] ? t('contracts.electricity.hideEntries') : t('contracts.electricity.viewEntries')}
                            >
                              {expandedMonths[group.key] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {expandedMonths[group.key] ? t('contracts.electricity.hideEntries') : t('contracts.electricity.viewEntries')}
                          </TooltipContent>
                        </Tooltip>
                        {editMonth !== group.key && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className={iconButtonClassName}
                                onClick={() => {
                                  setEditMonth(group.key);
                                  setEditValue(group.total.toFixed(2));
                                  setEditError(null);
                                  setEditSuccess(null);
                                }}
                                aria-label={t('contracts.electricity.editMonth')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('contracts.electricity.editMonth')}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {expandedMonths[group.key] && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-muted/20">
                        <Collapsible open={expandedMonths[group.key]}>
                          <CollapsibleContent forceMount>
                            <div className="space-y-3 py-2">
                              <p className="text-xs text-muted-foreground">{t('contracts.electricity.monthEntriesHint')}</p>

                              <div className="space-y-2">
                                {[...group.rows]
                                  .sort((a, b) => (a.day ?? 1) - (b.day ?? 1))
                                  .map(row => (
                                    <div key={row.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                                      <div className="text-sm text-muted-foreground min-w-[72px]">{t('contracts.electricity.dayLabel', { day: row.day ?? 1 })}</div>
                                      <Badge variant={(row.charging_location ?? 'home') === 'outside' ? 'default' : 'secondary'}>
                                        {(row.charging_location ?? 'home') === 'outside' ? t('contracts.electricity.outside') : t('contracts.electricity.home')}
                                      </Badge>
                                      {row.charging_location === 'outside' && row.charging_note && (
                                        <span className="text-xs text-muted-foreground max-w-[280px] truncate" title={row.charging_note}>
                                          {row.charging_note}
                                        </span>
                                      )}

                                      {entryEditId === row.id ? (
                                        <form
                                          className="flex flex-wrap items-center gap-2"
                                          onSubmit={e => handleEntryEditSubmit(e, row.id)}
                                        >
                                          <Input
                                            type="number"
                                            min={1}
                                            max={31}
                                            className="w-20"
                                            value={entryEditDay}
                                            onChange={e => setEntryEditDay(e.target.value)}
                                            disabled={entrySubmitting}
                                          />
                                          <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="w-28"
                                            value={entryEditValue}
                                            onChange={e => setEntryEditValue(e.target.value)}
                                            disabled={entrySubmitting}
                                          />
                                          <Select value={entryEditLocation} onValueChange={(v: 'home' | 'outside') => setEntryEditLocation(v)}>
                                            <SelectTrigger className="h-9 w-32">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="home">{t('contracts.electricity.home')}</SelectItem>
                                              <SelectItem value="outside">{t('contracts.electricity.outside')}</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          {entryEditLocation === 'outside' && (
                                            <Input
                                              type="text"
                                              className="w-44"
                                              placeholder={t('contracts.electricity.description')}
                                              value={entryEditNote}
                                              onChange={e => setEntryEditNote(e.target.value)}
                                              disabled={entrySubmitting}
                                            />
                                          )}
                                          <Button type="submit" size="sm" variant="outline" disabled={entrySubmitting}>
                                            {entrySubmitting ? t('contracts.electricity.saving') : t('common.save')}
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEntryEditId(null)}
                                            disabled={entrySubmitting}
                                          >
                                            {t('common.cancel')}
                                          </Button>
                                        </form>
                                      ) : (
                                        <>
                                          <div className="text-sm font-medium min-w-[90px]">
                                            {row.value_eur.toLocaleString('pt-PT', {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })} €
                                          </div>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className={iconButtonClassName}
                                                onClick={() => {
                                                  setEntryEditId(row.id);
                                                  setEntryEditDay(String(row.day ?? 1));
                                                  setEntryEditValue(row.value_eur.toFixed(2));
                                                  setEntryEditLocation((row.charging_location ?? 'home') as 'home' | 'outside');
                                                  setEntryEditNote(row.charging_note ?? '');
                                                  setEditError(null);
                                                  setEditSuccess(null);
                                                }}
                                                aria-label={t('contracts.electricity.editEntry')}
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('contracts.electricity.editEntry')}</TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className={`${iconButtonClassName} text-destructive hover:text-destructive`}
                                                onClick={() => handleEntryDelete(row.id)}
                                                disabled={entrySubmitting}
                                                aria-label={t('common.delete')}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('common.delete')}</TooltipContent>
                                          </Tooltip>
                                        </>
                                      )}
                                    </div>
                                  ))}
                              </div>

                              {detailAddMonth === group.key ? (
                                <form className="flex flex-wrap items-end gap-2" onSubmit={e => handleDetailAddSubmit(e, group)}>
                                  <div>
                                    <label className="block text-xs mb-1">{t('contracts.electricity.day')}</label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={31}
                                      className="w-20"
                                      value={detailAddDay}
                                      onChange={e => setDetailAddDay(e.target.value)}
                                      disabled={detailSubmitting}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs mb-1">{t('contracts.electricity.value')}</label>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      className="w-28"
                                      value={detailAddValue}
                                      onChange={e => setDetailAddValue(e.target.value)}
                                      disabled={detailSubmitting}
                                    />
                                  </div>
                                  <div className="min-w-[150px]">
                                    <label className="block text-xs mb-1">{t('contracts.electricity.location')}</label>
                                    <Select value={detailAddLocation} onValueChange={(v: 'home' | 'outside') => setDetailAddLocation(v)}>
                                      <SelectTrigger className="h-9">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="home">{t('contracts.electricity.home')}</SelectItem>
                                        <SelectItem value="outside">{t('contracts.electricity.outside')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {detailAddLocation === 'outside' && (
                                    <div className="min-w-[220px] flex-1">
                                      <label className="block text-xs mb-1">{t('contracts.electricity.description')}</label>
                                      <Input
                                        type="text"
                                        className="w-full"
                                        placeholder={t('contracts.electricity.descriptionPlaceholder')}
                                        value={detailAddNote}
                                        onChange={e => setDetailAddNote(e.target.value)}
                                        disabled={detailSubmitting}
                                      />
                                    </div>
                                  )}
                                  <Button type="submit" size="sm" variant="outline" disabled={detailSubmitting}>
                                    {detailSubmitting ? t('contracts.electricity.saving') : t('contracts.electricity.addEntry')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDetailAddMonth(null)}
                                    disabled={detailSubmitting}
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </form>
                              ) : (
                                <div className="flex justify-end">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className={subtleIconButtonClassName}
                                        onClick={() => {
                                          setDetailAddMonth(group.key);
                                          setDetailAddDay('1');
                                          setDetailAddValue('');
                                          setDetailAddLocation('home');
                                          setDetailAddNote('');
                                          setEditError(null);
                                          setEditSuccess(null);
                                        }}
                                        aria-label={t('contracts.electricity.newEntryInMonth')}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('contracts.electricity.newEntryInMonth')}</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>

        {monthlyGroupsForYear.length > visibleMonths && (
          <div className="flex justify-center mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setVisibleMonths(v => v + 3)}>
              {t('contracts.electricity.loadMore')}
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl p-6 border shadow-sm" style={{ minHeight: 320 }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">{t('contracts.electricity.trendTitle')}</h3>
          <Badge variant="outline">{selectedYear}</Badge>
        </div>

        {chartData.length === 0 ? (
          <div className="py-4 text-sm text-muted-foreground">{t('contracts.electricity.noData')}</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <LineChart data={chartData} margin={{ left: 8, right: 8, top: 10, bottom: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={18}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={72}
                tickFormatter={(v) => `${Number(v).toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value) => (
                      <span className="font-medium tabular-nums">
                        {Number(value).toLocaleString('pt-PT', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--color-value)' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
