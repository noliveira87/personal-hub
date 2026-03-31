
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Line } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface CarElectricityChartProps {
  contractId: string;
}

export default function CarElectricityChart({ contractId }: CarElectricityChartProps) {
  // All hooks must be at the top!
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Form state
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [day, setDay] = useState<number>(1);
  const [value, setValue] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  // Edit state for monthly values
  const [editMonth, setEditMonth] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Visible months state must be at the top!
  const [visibleMonths, setVisibleMonths] = useState(3);

  // Helper to get monthly value for editing
  function getMonthlyValue(key: string) {
    return monthlyData[key] || 0;
  }

  // Edit handler for monthly value
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMonth) return;
    setEditSubmitting(true);
    setEditError(null);
    const [yearStr, monthStr] = editMonth.split('-');
    const numericValue = parseFloat(editValue.replace(',', '.'));
    if (isNaN(numericValue) || numericValue < 0) {
      setEditError('Valor inválido.');
      setEditSubmitting(false);
      return;
    }
    // Apagar todos os dias desse mês e inserir um novo (dia=1)
    const { error: delError } = await supabase
      .from('car_electricity_history')
      .delete()
      .eq('contract_id', contractId)
      .eq('year', Number(yearStr))
      .eq('month', Number(monthStr));
    if (delError) {
      setEditError(delError.message);
      setEditSubmitting(false);
      return;
    }
    const { error: insError } = await supabase
      .from('car_electricity_history')
      .insert({ contract_id: contractId, year: Number(yearStr), month: Number(monthStr), day: 1, value_eur: numericValue });
    if (insError) {
      setEditError(insError.message);
    } else {
      setEditMonth(null);
      setEditValue('');
      fetchData();
    }
    setEditSubmitting(false);
  }

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
    if (error) setError(error.message);
    else setData(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    // Simple validation
    if (!year || !month || !day || !value) {
      setFormError('Preenche todos os campos.');
      setSubmitting(false);
      return;
    }
    const numericValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numericValue) || numericValue < 0) {
      setFormError('Valor inválido.');
      setSubmitting(false);
      return;
    }
    // Insert or update (upsert)
    const { error } = await supabase
      .from('car_electricity_history')
      .upsert({ contract_id: contractId, year, month, day, value_eur: numericValue }, { onConflict: 'contract_id,year,month,day' });
    if (error) {
      // Friendly error for RLS
      if (error.message && error.message.toLowerCase().includes('row level security')) {
        setFormError('Não tens permissão para adicionar consumo. (RLS)');
      } else {
        setFormError(error.message);
      }
    } else {
      setValue('');
      setMonth(new Date().getMonth() + 1);
      setYear(new Date().getFullYear());
      setDay(1);
      fetchData();
      // Focus value input for quick entry
      setTimeout(() => valueInputRef.current?.focus(), 100);
    }
    setSubmitting(false);
  }

  if (loading) return <div className="py-4 text-sm text-muted-foreground">A carregar consumo de eletricidade...</div>;
  if (error) return <div className="py-4 text-sm text-destructive">Erro: {error}</div>;


  // Agrupar por mês/ano e somar valores
  const monthlyData: { [key: string]: number } = {};
  data.forEach(d => {
    const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
    if (!monthlyData[key]) monthlyData[key] = 0;
    monthlyData[key] += d.value_eur;
  });

  // Ordenar as chaves (ano-mês)
  const sortedKeys = Object.keys(monthlyData).sort();
  const visibleKeys = sortedKeys.slice(-visibleMonths);
  // Meses abreviados em pt
  const monthLabels = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  const labels = sortedKeys.map(key => {
    const [year, month] = key.split('-');
    return `${monthLabels[Number(month) - 1]}`;
  });
  const values = sortedKeys.map(key => monthlyData[key]);

  return (
    <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '180ms' }}>
      <h2 className="text-sm font-semibold text-foreground mb-4">Consumo de Eletricidade (EUR)</h2>
      <form className="mb-4 flex flex-wrap gap-2 items-end" onSubmit={handleSubmit} autoComplete="off">
        <div>
          <label className="block text-xs mb-1" htmlFor="elec-year">Ano</label>
          <Input id="elec-year" type="number" min={2020} max={2100} className="w-20" value={year} onChange={e => setYear(Number(e.target.value))} disabled={submitting} />
        </div>
        <div>
          <label className="block text-xs mb-1" htmlFor="elec-month">Mês</label>
          <Input id="elec-month" type="number" min={1} max={12} className="w-14" value={month} onChange={e => setMonth(Number(e.target.value))} disabled={submitting} />
        </div>
        <div>
          <label className="block text-xs mb-1" htmlFor="elec-day">Dia</label>
          <Input id="elec-day" type="number" min={1} max={31} className="w-14" value={day} onChange={e => setDay(Number(e.target.value))} disabled={submitting} />
        </div>
        <div>
          <label className="block text-xs mb-1" htmlFor="elec-value">Valor (€)</label>
          <Input id="elec-value" type="number" step="0.01" className="w-24" value={value} onChange={e => setValue(e.target.value)} disabled={submitting} ref={valueInputRef} />
        </div>
        <Button type="submit" size="sm" variant="default" className="flex items-center gap-2 shadow-md" disabled={submitting}>
          {submitting && <span className="loader w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" />}
          Adicionar
        </Button>
        {formError && <span className="text-xs text-destructive ml-2">{formError}</span>}
      </form>

      {/* Tabela de valores mensais editáveis */}
      <div className="mb-6">
        <Table>
          <TableCaption>Editar valores mensais</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Mês/Ano</TableHead>
              <TableHead>Valor Total (€)</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">Sem dados de eletricidade.</TableCell>
              </TableRow>
            ) : (
              visibleKeys.map(key => (
                <TableRow key={key}>
                  <TableCell>{labels[sortedKeys.indexOf(key)]}</TableCell>
                  <TableCell>
                    {editMonth === key ? (
                      <form className="flex gap-2 items-center" onSubmit={handleEditSubmit}>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          disabled={editSubmitting}
                          autoFocus
                        />
                        <Button type="submit" size="sm" variant="default" className="shadow-md" disabled={editSubmitting}>
                          Guardar
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="shadow-none" onClick={() => setEditMonth(null)} disabled={editSubmitting}>
                          Cancelar
                        </Button>
                        {editError && <span className="text-xs text-destructive ml-2">{editError}</span>}
                      </form>
                    ) : (
                      <span>{getMonthlyValue(key).toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editMonth === key ? null : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shadow-sm"
                        onClick={() => {
                          setEditMonth(key);
                          setEditValue(getMonthlyValue(key).toString());
                          setEditError(null);
                        }}
                      >
                        Editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {sortedKeys.length > visibleMonths && (
          <div className="flex justify-center mt-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shadow-sm"
              onClick={() => setVisibleMonths(v => v + 3)}
            >
              Carregar mais
            </Button>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <div className="bg-background rounded-xl p-6 border shadow-sm" style={{ minHeight: 320 }}>
        {(!data || !data.length) ? (
          <div className="py-4 text-sm text-muted-foreground">Sem dados de eletricidade.</div>
        ) : (
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: 'Consumo',
                  data: values,
                  fill: false,
                  borderColor: '#3b82f6',
                  backgroundColor: '#fff',
                  pointBackgroundColor: '#fff',
                  pointBorderColor: '#3b82f6',
                  pointRadius: 5,
                  pointHoverRadius: 7,
                  pointBorderWidth: 3,
                  tension: 0.2,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  enabled: true,
                  callbacks: {
                    label: (ctx) => `${ctx.parsed.y.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}`,
                  },
                  backgroundColor: '#23263a',
                  titleColor: '#fff',
                  bodyColor: '#fff',
                  borderColor: '#3b82f6',
                  borderWidth: 1,
                  padding: 12,
                },
              },
              layout: { padding: 16 },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(255,255,255,0.08)',
                  },
                  ticks: {
                    color: '#fff',
                    callback: (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }),
                  },
                },
                x: {
                  grid: {
                    display: false,
                  },
                  ticks: {
                    color: '#fff',
                  },
                },
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
