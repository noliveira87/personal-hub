import { Pencil, Trash2 } from "lucide-react";
import { Investment, formatCurrency, formatPercentage } from "@/features/portfolio/types/investment";
import { CryptoQuoteMap, parseCryptoNotes, resolveCashbackCurrentValue, resolveInvestmentCurrentValue } from "@/features/portfolio/lib/crypto";

interface InvestmentCardProps {
  investment: Investment;
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
  index: number;
  cryptoSpotEur?: CryptoQuoteMap | null;
  cryptoQuoteLoading?: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  cash: "💰",
  etf: "📈",
  crypto: "₿",
  p2p: "🤝",
  ppr: "🏦",
};

export function InvestmentCard({ investment, onEdit, onDelete, index, cryptoSpotEur, cryptoQuoteLoading }: InvestmentCardProps) {
  const { asset, units, cashbackAsset, cashbackUnits, cashbackDate, userNotes } = parseCryptoNotes(investment.notes);
  const displayCurrentValue = resolveInvestmentCurrentValue(investment, cryptoSpotEur);
  const cashbackCurrentValue = resolveCashbackCurrentValue(investment, cryptoSpotEur);
  const profitLoss = displayCurrentValue - investment.investedAmount;
  const percentage = investment.investedAmount > 0 ? (profitLoss / investment.investedAmount) * 100 : 0;
  const showPercentage = investment.investedAmount > 0;
  const isPositive = profitLoss >= 0;
  const spotEur = cryptoSpotEur?.[asset] ?? null;
  const cashbackSpotEur = cryptoSpotEur?.[cashbackAsset] ?? null;
  const hasLiveCryptoQuote = investment.type === "crypto" && !!units && !!spotEur;
  const hasCashback = investment.type === "crypto" && !!cashbackUnits;
  const isCashbackOnly = investment.type === "crypto" && investment.investedAmount === 0 && !units && !!cashbackUnits;
  const cashbackDisplayValue = cashbackCurrentValue ?? displayCurrentValue;

  return (
    <div
      className="group animate-fade-in rounded-2xl border border-border/80 bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">{TYPE_EMOJI[investment.type] || "💰"}</span>
          <div className="min-w-0 space-y-1">
            <h3 className="truncate font-semibold text-foreground">{investment.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">{investment.type}</span>
              {hasCashback && (
                <span className="inline-flex rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">Cashback</span>
              )}
              {hasLiveCryptoQuote && (
                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">Live {asset}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <button
            onClick={() => onEdit(investment)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(investment.id)}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/40 p-3 sm:p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Current</p>
          <p className={`text-sm font-medium ${isCashbackOnly ? "text-success" : "text-foreground"}`}>
            {formatCurrency(isCashbackOnly ? cashbackDisplayValue : displayCurrentValue)}
          </p>
          {!isCashbackOnly && hasLiveCryptoQuote && (
            <p className="text-[10px] text-muted-foreground whitespace-nowrap">
              {units!.toFixed(6)} {asset} × {formatCurrency(spotEur!)}
            </p>
          )}
          {!isCashbackOnly && investment.type === "crypto" && cryptoQuoteLoading && !hasLiveCryptoQuote && (
            <p className="text-[11px] text-muted-foreground">Fetching crypto quote…</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Invested</p>
          <p className="text-sm font-medium text-foreground">{formatCurrency(investment.investedAmount)}</p>
        </div>
      </div>

      {!isCashbackOnly && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Profit/Loss</p>
            <p className={`text-sm font-bold ${isPositive ? "text-success" : "text-urgent"}`}>
              {formatCurrency(profitLoss)}
            </p>
          </div>
          {showPercentage && (
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                isPositive ? "bg-success/10 text-success" : "bg-urgent/10 text-urgent"
              }`}
            >
              {formatPercentage(percentage)}
            </span>
          )}
        </div>
      )}

      {hasCashback && !isCashbackOnly && (
        <div className="mt-4 rounded-2xl bg-muted/40 p-3 sm:p-4">
          <p className="mt-1 text-sm font-semibold text-foreground">
            {cashbackCurrentValue !== null ? formatCurrency(cashbackCurrentValue) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground whitespace-nowrap">
            {cashbackUnits!.toFixed(6)} {cashbackAsset}
            {cashbackSpotEur ? ` × ${formatCurrency(cashbackSpotEur)}` : ""}
            {cashbackDate ? ` • ${cashbackDate}` : ""}
          </p>
        </div>
      )}

      {hasCashback && isCashbackOnly && (
        <div className="mt-4 rounded-2xl bg-muted/40 p-3 sm:p-4">
          <p className="text-[10px] text-muted-foreground whitespace-nowrap">
            {cashbackSpotEur
              ? `${cashbackUnits!.toFixed(6)} ${cashbackAsset} × ${formatCurrency(cashbackSpotEur)} = ${formatCurrency(cashbackDisplayValue)}`
              : `${cashbackUnits!.toFixed(6)} ${cashbackAsset} × live spot price`}
          </p>
        </div>
      )}

      {userNotes && (
        <p className="mt-4 rounded-2xl bg-muted/40 px-3 py-2 text-xs italic leading-5 text-muted-foreground">{userNotes}</p>
      )}
    </div>
  );
}
