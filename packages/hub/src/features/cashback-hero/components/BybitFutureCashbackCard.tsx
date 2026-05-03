import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Coins, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n/I18nProvider';

type BybitFutureTx = {
  id: string;
  monthKey: string;
  description: string;
  amount: number;
  createdAt: string;
};

const BYBIT_TARGET_EUR = 3500;
const BYBIT_FUTURE_TX_STORAGE_KEY = 'cashback_bybit_future_transactions_v1';

function parseDecimal(input: string): number {
  const normalized = input.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function BybitFutureCashbackCard({
  selectedMonth,
  actualSpent,
}: {
  selectedMonth: string;
  actualSpent: number;
}) {
  const { t, formatCurrency } = useI18n();
  const [transactions, setTransactions] = useState<BybitFutureTx[]>([]);
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(BYBIT_FUTURE_TX_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;

      const sanitized = parsed
        .filter((item): item is BybitFutureTx => {
          if (!item || typeof item !== 'object') return false;
          const candidate = item as Partial<BybitFutureTx>;
          return (
            typeof candidate.id === 'string'
            && typeof candidate.monthKey === 'string'
            && typeof candidate.description === 'string'
            && typeof candidate.amount === 'number'
          );
        })
        .map((item) => ({
          ...item,
          amount: Math.max(0, item.amount),
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
        }));

      setTransactions(sanitized);
    } catch {
      // Ignore persisted storage parsing errors.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(BYBIT_FUTURE_TX_STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      // Ignore storage write failures.
    }
  }, [transactions]);

  const visibleTransactions = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(selectedMonth)) return [];

    return transactions
      .filter((item) => item.monthKey === selectedMonth)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [transactions, selectedMonth]);

  const plannedTotal = useMemo(() => {
    return visibleTransactions.reduce((sum, item) => sum + item.amount, 0);
  }, [visibleTransactions]);

  const projectedTotal = actualSpent + plannedTotal;
  const remainingToTarget = Math.max(0, BYBIT_TARGET_EUR - projectedTotal);
  const projectedProgress = BYBIT_TARGET_EUR > 0 ? Math.min(100, (projectedTotal / BYBIT_TARGET_EUR) * 100) : 100;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!/^\d{4}-\d{2}$/.test(selectedMonth)) return;

    const parsedAmount = parseDecimal(amountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const trimmedDescription = description.trim() || t('cashbackHero.bybitFuture.defaultDescription');

    setTransactions((prev) => [
      {
        id: crypto.randomUUID(),
        monthKey: selectedMonth,
        description: trimmedDescription,
        amount: Math.round(parsedAmount * 100) / 100,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setDescription('');
    setAmountInput('');
  };

  const removeTransaction = (transactionId: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== transactionId));
  };

  return (
    <Card className="rounded-2xl border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Coins className="h-4 w-4" />
          </span>
          {t('cashbackHero.bybitFuture.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('cashbackHero.bybitFuture.target')}</p>
            <p className="mt-0.5 text-sm font-semibold">{formatCurrency(BYBIT_TARGET_EUR, 'EUR')}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('cashbackHero.bybitFuture.actual')}</p>
            <p className="mt-0.5 text-sm font-semibold">{formatCurrency(actualSpent, 'EUR')}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('cashbackHero.bybitFuture.planned')}</p>
            <p className="mt-0.5 text-sm font-semibold">{formatCurrency(plannedTotal, 'EUR')}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('cashbackHero.bybitFuture.remaining')}</p>
            <p className="mt-0.5 text-sm font-semibold">{formatCurrency(remainingToTarget, 'EUR')}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('cashbackHero.bybitFuture.projected')}</span>
            <span>{projectedProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${projectedProgress}%` }} />
          </div>
        </div>

        {!/^\d{4}-\d{2}$/.test(selectedMonth) ? (
          <p className="text-xs text-muted-foreground">{t('cashbackHero.bybitFuture.monthHint')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('cashbackHero.bybitFuture.descriptionPlaceholder')}
            />
            <Input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder={t('cashbackHero.bybitFuture.amountPlaceholder')}
            />
            <Button type="submit" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>{t('cashbackHero.bybitFuture.add')}</span>
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {visibleTransactions.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('cashbackHero.bybitFuture.empty')}</p>
          ) : (
            visibleTransactions.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/80 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.monthKey}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-primary">{formatCurrency(item.amount, 'EUR')}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => removeTransaction(item.id)}
                    aria-label={t('cashbackHero.bybitFuture.remove')}
                    title={t('cashbackHero.bybitFuture.remove')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
