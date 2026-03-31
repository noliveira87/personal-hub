
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
  // Mensagem de sucesso para edição
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditSuccess(null);
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
    console.log('[CarElectricityChart] Apagar mês:', { contractId, year: yearStr, month: monthStr });
    // Upsert: substitui o valor desse mês/ano/contrato (day fixo a 1)
    const { error: upsertError } = await supabase
      .from('car_electricity_history')
      .upsert({ contract_id: contractId, year: Number(yearStr), month: Number(monthStr), day: 1, value_eur: numericValue }, { onConflict: 'contract_id,year,month' });
    if (upsertError) {
      setEditError('Erro ao inserir valor: ' + upsertError.message);
    } else {
      setEditSuccess('Valor atualizado com sucesso!');
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


  // Agrupar por mês/ano e mostrar apenas o valor do registo mais recente (ou do dia 1) desse mês
  const monthlyData: { [key: string]: number } = {};
  const monthlyTimestamps: { [key: string]: number } = {};
  data.forEach(d => {
    const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
    // Preferir o registo do dia 1, senão o mais recente (maior dia)
    if (
      !monthlyData[key] ||
      d.day === 1 ||
      (monthlyTimestamps[key] !== undefined && d.day > monthlyTimestamps[key])
    ) {
      monthlyData[key] = d.value_eur;
      monthlyTimestamps[key] = d.day;
    }
  });

  // Ordenar as chaves (ano-mês) do mais recente para o mais antigo
  const sortedKeys = Object.keys(monthlyData).sort((a, b) => {
    // Descendente: mais recente primeiro
    const [aYear, aMonth] = a.split('-').map(Number);
    const [bYear, bMonth] = b.split('-').map(Number);
    if (aYear !== bYear) return bYear - aYear;
    return bMonth - aMonth;
  });
  const visibleKeys = sortedKeys.slice(0, visibleMonths); // pegar os mais recentes
  // Meses abreviados em pt
  const monthLabels = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  // Mostrar mês + ano
  const labels = sortedKeys.map(key => {
    const [year, month] = key.split('-');
    return `${monthLabels[Number(month) - 1]} ${year}`;
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
          <Input id="elec-value" type="text" inputMode="decimal" pattern="[0-9]+([\.,][0-9]{1,2})?" className="w-24" value={value} onChange={e => setValue(e.target.value)} disabled={submitting} ref={valueInputRef} />
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
              <TableHead className="bg-muted px-4 py-2 text-left">Mês/Ano</TableHead>
              <TableHead className="bg-muted px-4 py-2 text-left">Valor Total (€)</TableHead>
              <TableHead className="bg-muted px-4 py-2 text-left">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sem dados de eletricidade.</TableCell>
              </TableRow>
            ) : (
              visibleKeys.map(key => {
                const [year, month] = key.split('-');
                return (
                  <TableRow key={key} className="align-middle hover:bg-accent/40 transition">
                    <TableCell className="px-4 py-3 font-medium text-base">{`${monthLabels[Number(month) - 1]} ${year}`}</TableCell>
                    <TableCell className="px-4 py-3">
                      {editMonth === key ? (
                        <form className="flex gap-2 items-center" onSubmit={handleEditSubmit}>
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]+([\.,][0-9]{1,2})?"
                            className="w-24 text-base"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            disabled={editSubmitting}
                            autoFocus
                          />
                          <Button type="submit" size="sm" variant="default" className="px-3 py-1 rounded-md text-xs font-semibold shadow-sm" disabled={editSubmitting}>
                            Guardar
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="px-3 py-1 rounded-md text-xs font-semibold shadow-none" onClick={() => setEditMonth(null)} disabled={editSubmitting}>
                            Cancelar
                          </Button>
                          {editError && <span className="text-xs text-destructive ml-2">{editError}</span>}
                          {editSuccess && <span className="text-xs text-green-600 ml-2">{editSuccess}</span>}
                        </form>
                      ) : (
                        <span className="text-base">{getMonthlyValue(key).toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {editMonth === key ? null : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="px-3 py-1 rounded-md text-xs font-semibold shadow-sm border-muted-foreground/30"
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
                );
              })
            )}
          </TableBody>
        </Table>
        {sortedKeys.length > visibleMonths && (
          <div className="flex justify-center mt-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shadow-sm px-4 py-1 text-xs font-semibold"
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
