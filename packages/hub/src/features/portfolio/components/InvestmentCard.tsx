import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Investment, formatCurrency, formatPercentage } from "@/features/portfolio/types/investment";
import { CryptoQuoteMap, parseCryptoNotes, resolveCashbackCurrentValue, resolveInvestmentCurrentValue } from "@/features/portfolio/lib/crypto";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "@/components/ui/sonner";

interface InvestmentCardProps {
  investment: Investment;
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
  onQuickContribution: (investment: Investment, payload: { amount: number; date: string; mode: "contribution" | "value_update"; unitsBought?: number | null }) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  index: number;
  cryptoSpotEur?: CryptoQuoteMap | null;
  cryptoQuoteLoading?: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  cash: "💰",
  etf: "📈",
  crypto: "🪙",
  p2p: "🤝",
  ppr: "🏦",
};

const CRYPTO_SYMBOL: Record<string, string> = {
  BTC: "₿",
  ETH: "Ξ",
};

export function InvestmentCard({ investment, onEdit, onDelete, onQuickContribution, onMove, canMoveUp, canMoveDown, index, cryptoSpotEur, cryptoQuoteLoading }: InvestmentCardProps) {
  const { hideAmounts, t } = useI18n();
  const defaultQuickMode: "contribution" | "value_update" = investment.category === "long-term" ? "value_update" : "contribution";
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickMode, setQuickMode] = useState<"contribution" | "value_update">(defaultQuickMode);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickDate, setQuickDate] = useState(new Date().toISOString().slice(0, 10));
  const [quickUnits, setQuickUnits] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const { asset, units, cashbackAsset, cashbackUnits, cashbackDate, userNotes } = parseCryptoNotes(investment.notes);
  const displayCurrentValue = resolveInvestmentCurrentValue(investment, cryptoSpotEur);
  const cashbackCurrentValue = resolveCashbackCurrentValue(investment, cryptoSpotEur);
  const profitLoss = displayCurrentValue - investment.investedAmount;
  const percentage = investment.investedAmount > 0 ? (profitLoss / investment.investedAmount) * 100 : 0;
  const showPercentage = investment.investedAmount > 0;
  const isPositive = profitLoss >= 0;
  const previewAsset = asset || cashbackAsset || "BTC";
  const spotEur = cryptoSpotEur?.[previewAsset] ?? null;
  const cashbackSpotEur = cryptoSpotEur?.[cashbackAsset] ?? null;
  const hasLiveCryptoQuote = investment.type === "crypto" && !!units && !!spotEur;
  const hasLiveCashbackQuote = investment.type === "crypto" && !!cashbackUnits && !!cashbackAsset && !!cashbackSpotEur;
  const hasCashback = investment.type === "crypto" && !!cashbackUnits;
  const isCashbackOnly = investment.type === "crypto" && investment.investedAmount === 0 && !units && !!cashbackUnits;
  const isCashbackOnlyQuickAdd = isCashbackOnly;
  const isXtbPosition = /xtb/i.test(investment.name);
  const cashbackDisplayValue = cashbackCurrentValue ?? displayCurrentValue;
  const cashbackQuickAsset = cashbackAsset || asset || "BTC";
  const cashbackQuickSpotEur = cryptoSpotEur?.[cashbackQuickAsset] ?? null;
  const cryptoDisplayAsset = investment.type === "crypto" ? (asset || cashbackAsset || "BTC") : null;
  const cardIcon = investment.type === "crypto" ? (CRYPTO_SYMBOL[cryptoDisplayAsset ?? "BTC"] ?? TYPE_EMOJI.crypto) : (TYPE_EMOJI[investment.type] || "💰");

  const parseDecimalInput = (value: string) => {
    const raw = value
      .replace(/\s/g, "")
      .replace(/€/g, "")
      .trim();

    if (!raw) return NaN;

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");

    let normalized = raw;

    if (hasComma && hasDot) {
      const lastComma = raw.lastIndexOf(",");
      const lastDot = raw.lastIndexOf(".");
      const decimalSeparator = lastComma > lastDot ? "," : ".";
      const thousandSeparator = decimalSeparator === "," ? "." : ",";

      normalized = raw.split(thousandSeparator).join("");
      if (decimalSeparator === ",") {
        normalized = normalized.replace(",", ".");
      }
    } else if (hasComma) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const quickAmountValue = parseDecimalInput(quickAmount);
  const quickUnitsValue = parseDecimalInput(quickUnits);
  const isLongTermValueUpdate = !isCashbackOnlyQuickAdd && investment.category === "long-term" && quickMode === "value_update";
  const isXtbValueUpdate = isLongTermValueUpdate && isXtbPosition;
  const computedQuickProfitLoss = Number.isFinite(quickAmountValue)
    ? isXtbValueUpdate
      ? quickAmountValue - displayCurrentValue
      : (investment.investedAmount + quickAmountValue) - displayCurrentValue
    : NaN;
  const quickProfitSuffix = Number.isFinite(computedQuickProfitLoss)
    ? t("portfolio.quickAdd.plToRecord", { pl: formatCurrency(computedQuickProfitLoss) })
    : "";
  const hasQuickUnitsPreview = investment.type === "crypto"
    && quickMode === "contribution"
    && !isCashbackOnlyQuickAdd
    && Number.isFinite(quickUnitsValue)
    && quickUnitsValue > 0
    && Number.isFinite(spotEur);
  const quickUnitsPreviewValue = hasQuickUnitsPreview
    ? quickUnitsValue * Number(spotEur)
    : null;

  const handleQuickSave = () => {
    const rawAmount = parseDecimalInput(quickAmount);
    const rawUnits = parseDecimalInput(quickUnits);
    const effectiveMode: "contribution" | "value_update" = isCashbackOnlyQuickAdd ? "value_update" : quickMode;
    const resolvedLongTermAmount = Number.isFinite(computedQuickProfitLoss) && computedQuickProfitLoss !== 0
      ? computedQuickProfitLoss
      : rawAmount;
    const amount = isCashbackOnlyQuickAdd
      ? (Number.isFinite(rawUnits) && Number.isFinite(cashbackQuickSpotEur)
          ? rawUnits * Number(cashbackQuickSpotEur)
          : NaN)
      : isLongTermValueUpdate
        ? resolvedLongTermAmount
        : rawAmount;
    const unitsBought = isCashbackOnlyQuickAdd ? rawUnits : rawUnits;

    // Contributions must be positive. Profit/loss (value_update) can be negative.
    if (!quickDate) {
      toast.error(t("portfolio.quickAdd.errors.invalidDate"));
      return;
    }

    if (!Number.isFinite(amount)) {
      toast.error(t("portfolio.quickAdd.errors.invalidAmount"));
      return;
    }

    if (amount === 0) {
      toast.error(t("portfolio.quickAdd.errors.zeroAmount"));
      return;
    }

    if (isCashbackOnlyQuickAdd && (!Number.isFinite(unitsBought) || unitsBought === 0 || !Number.isFinite(cashbackQuickSpotEur))) {
      toast.error(t("portfolio.quickAdd.errors.cashbackUnits"));
      return;
    }

    if (effectiveMode === "contribution" && amount < 0) {
      toast.error(t("portfolio.quickAdd.errors.contributionPositive"));
      return;
    }

    if (
      investment.type === "crypto" &&
      effectiveMode === "contribution" &&
      (!Number.isFinite(unitsBought) || unitsBought <= 0)
    ) {
      toast.error(t("portfolio.quickAdd.errors.cryptoUnits"));
      return;
    }

    onQuickContribution(investment, {
      amount,
      date: quickDate,
      mode: effectiveMode,
      unitsBought:
        investment.type === "crypto" && (effectiveMode === "contribution" || isCashbackOnlyQuickAdd)
          ? unitsBought
          : null,
      description: quickDescription || undefined,
    });

    setQuickAmount("");
    setQuickUnits("");
    setQuickDate(new Date().toISOString().slice(0, 10));
    setQuickDescription("");
    setQuickMode(defaultQuickMode);
    setQuickAddOpen(false);
  };

  return (
    <div
      className={cn(
        "group w-full min-w-0 overflow-hidden animate-fade-in rounded-xl border-2 border-border bg-card p-5 shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-lg active:scale-[0.98]",
        isPositive ? "shadow-success/5" : "shadow-urgent/5",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">{cardIcon}</span>
          <div className="min-w-0 space-y-1">
            <h3 className="truncate font-semibold text-foreground">{investment.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">{investment.type}</span>
              {hasCashback && (
                <span className="inline-flex rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">Cashback</span>
              )}
              {hasLiveCryptoQuote && (
                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  Live {CRYPTO_SYMBOL[asset] ?? ""} {asset}
                </span>
              )}
              {!hasLiveCryptoQuote && hasLiveCashbackQuote && (
                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  Live {CRYPTO_SYMBOL[cashbackAsset] ?? ""} {cashbackAsset}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center justify-between rounded-xl border border-border/70 bg-muted/40 p-1.5 opacity-100 transition-opacity sm:ml-auto sm:w-auto sm:justify-start sm:opacity-0 sm:group-hover:opacity-100">
          <div className="flex items-center gap-1 pr-1.5">
            <button
              onClick={() => onMove(investment.id, "up")}
              disabled={!canMoveUp}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
              title={t("portfolio.actions.moveUp")}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onMove(investment.id, "down")}
              disabled={!canMoveDown}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
              title={t("portfolio.actions.moveDown")}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="h-6 w-px bg-border/80" />
          <div className="flex items-center gap-1 pl-1.5">
            <button
              onClick={() => setQuickAddOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:h-8 sm:w-8"
              title={t("portfolio.actions.addMovement")}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onEdit(investment)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:h-8 sm:w-8"
              title={t("portfolio.actions.editInvestment")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(investment.id)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
              title={t("portfolio.actions.deleteInvestment")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl bg-muted/40 p-3 sm:grid-cols-2 sm:p-4">
        <div className="space-y-1 rounded-xl bg-primary/8 px-3 py-2 ring-1 ring-primary/15">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("portfolio.current")}</p>
          <p className={`text-xl font-bold ${isCashbackOnly ? "text-success" : "text-foreground"}`}>
            {formatCurrency(isCashbackOnly ? cashbackDisplayValue : displayCurrentValue)}
          </p>
          {!isCashbackOnly && hasLiveCryptoQuote && asset && (
            <p className="text-[10px] text-muted-foreground break-words sm:whitespace-nowrap">
              {units!.toFixed(6)} {asset} × {formatCurrency(spotEur!)}
            </p>
          )}
          {!isCashbackOnly && investment.type === "crypto" && cryptoQuoteLoading && !hasLiveCryptoQuote && (
            <p className="text-[11px] text-muted-foreground">{t("portfolio.quickAdd.fetchingCryptoQuote")}</p>
          )}
        </div>
        <div className="space-y-1 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("portfolio.invested")}</p>
          <p className="text-lg font-semibold text-foreground/90">{formatCurrency(investment.investedAmount)}</p>
        </div>
      </div>

      {!isCashbackOnly && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("portfolio.profitLoss")}</p>
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
          <p className="text-[10px] text-muted-foreground break-words sm:whitespace-nowrap">
            {cashbackUnits!.toFixed(6)} {cashbackAsset}
            {cashbackSpotEur ? ` × ${formatCurrency(cashbackSpotEur)}` : ""}
            {cashbackDate ? ` • ${cashbackDate}` : ""}
          </p>
        </div>
      )}

      {hasCashback && isCashbackOnly && (
        <div className="mt-4 rounded-2xl bg-muted/40 p-3 sm:p-4">
          <p className="text-[10px] text-muted-foreground break-words sm:whitespace-nowrap">
            {cashbackSpotEur
              ? `${cashbackUnits!.toFixed(6)} ${cashbackAsset} × ${formatCurrency(cashbackSpotEur)} = ${formatCurrency(cashbackDisplayValue)}`
              : `${cashbackUnits!.toFixed(6)} ${cashbackAsset} × live spot price`}
          </p>
        </div>
      )}

      {userNotes && (
        <p className="mt-4 rounded-2xl bg-muted/40 px-3 py-2 text-xs italic leading-5 text-muted-foreground break-words">{userNotes}</p>
      )}

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto p-4 sm:max-w-sm sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {isCashbackOnlyQuickAdd
                ? t("portfolio.quickAdd.titleUpdateCashback")
                : quickMode === "contribution"
                  ? t("portfolio.quickAdd.titleAddContribution")
                  : t("portfolio.quickAdd.titleRecordValueUpdate")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {!isCashbackOnlyQuickAdd && (
              <div className="space-y-3 rounded-lg border border-border/70 p-3">
                <p className="text-sm font-medium text-foreground">{t("portfolio.quickAdd.updateType")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickMode("contribution")}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      quickMode === "contribution"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {t("portfolio.movementLabels.contribution")}
                  </button>
                  <button
                    type="button"
                    onClick={() => !hasLiveCryptoQuote && setQuickMode("value_update")}
                    disabled={hasLiveCryptoQuote}
                    title={hasLiveCryptoQuote ? t("portfolio.quickAdd.notAvailableForLiveCrypto") : undefined}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      hasLiveCryptoQuote
                        ? "border-border text-muted-foreground/40 cursor-not-allowed"
                        : quickMode === "value_update"
                          ? Number(quickAmount) < 0
                            ? "border-urgent bg-urgent/10 text-urgent"
                            : "border-success bg-success/10 text-success"
                        : "border-border text-muted-foreground hover:border-success/40"
                    }`}
                  >
                    {t("portfolio.movementLabels.profitReturn")}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isCashbackOnlyQuickAdd
                    ? t("portfolio.quickAdd.hints.cashbackOnly")
                    : quickMode === "contribution"
                      ? t("portfolio.quickAdd.hints.contribution")
                      : hasLiveCryptoQuote
                        ? t("portfolio.quickAdd.hints.liveCryptoDisabled")
                        : isXtbValueUpdate
                          ? t("portfolio.quickAdd.hints.xtbValueUpdate")
                        : isLongTermValueUpdate
                          ? t("portfolio.quickAdd.hints.longTermValueUpdate")
                          : t("portfolio.quickAdd.hints.valueUpdate")}
                </p>
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium text-foreground">{t("portfolio.quickAdd.entryDetails")}</p>
              <div>
                <Label htmlFor={`quick-date-${investment.id}`}>{t("portfolio.quickAdd.date")}</Label>
                <Input
                  id={`quick-date-${investment.id}`}
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                />
              </div>
            {isCashbackOnlyQuickAdd ? (
              <div>
                <Label htmlFor={`quick-units-${investment.id}`}>{t("portfolio.quickAdd.cashbackUnits", { asset: cashbackQuickAsset })}</Label>
                <Input
                  id={`quick-units-${investment.id}`}
                  type="text"
                  inputMode="decimal"
                  value={quickUnits}
                  onChange={(e) => setQuickUnits(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {Number.isFinite(cashbackQuickSpotEur)
                    ? t("portfolio.quickAdd.calculatedValue", {
                        value: formatCurrency((Number.isFinite(parseDecimalInput(quickUnits)) ? parseDecimalInput(quickUnits) : 0) * Number(cashbackQuickSpotEur)),
                        asset: cashbackQuickAsset,
                      })
                    : t("portfolio.quickAdd.liveSpotUnavailable")}
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor={`quick-amount-${investment.id}`}>
                  {quickMode === "contribution"
                    ? t("portfolio.quickAdd.amountToInvest")
                    : isXtbValueUpdate
                      ? t("portfolio.quickAdd.totalCurrentValue")
                    : isLongTermValueUpdate
                      ? t("portfolio.quickAdd.totalInterestGains")
                      : t("portfolio.quickAdd.amountGainedLost")}
                </Label>
                <Input
                  id={`quick-amount-${investment.id}`}
                  type="text"
                  inputMode="decimal"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                />
                {isLongTermValueUpdate ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isXtbValueUpdate
                      ? t("portfolio.quickAdd.currentRecordedLine", {
                          current: formatCurrency(displayCurrentValue),
                          pl: quickProfitSuffix,
                        })
                      : t("portfolio.quickAdd.interestsLine", {
                          interestsEarned: t("portfolio.interestsEarned"),
                          interests: Number.isFinite(quickAmountValue) ? formatCurrency(quickAmountValue) : formatCurrency(0),
                          pl: quickProfitSuffix,
                        })}
                  </p>
                ) : null}
              </div>
            )}
            <div>
              <Label htmlFor={`quick-description-${investment.id}`}>{t("portfolio.description")}</Label>
              <Input
                id={`quick-description-${investment.id}`}
                type="text"
                placeholder={t("portfolio.quickAdd.descriptionPlaceholder")}
                value={quickDescription}
                onChange={(e) => setQuickDescription(e.target.value)}
              />
            </div>
            {investment.type === "crypto" && quickMode === "contribution" && !isCashbackOnlyQuickAdd ? (
              <div>
                <Label htmlFor={`quick-units-${investment.id}`}>{t("portfolio.quickAdd.unitsBought", { asset: previewAsset })}</Label>
                <Input
                  id={`quick-units-${investment.id}`}
                  type="text"
                  inputMode="decimal"
                  value={quickUnits}
                  onChange={(e) => setQuickUnits(e.target.value)}
                />
                {hasQuickUnitsPreview ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("portfolio.quickAdd.livePreview", {
                      value: formatCurrency(Number(quickUnitsPreviewValue)),
                      units: quickUnitsValue.toFixed(8),
                      asset: previewAsset,
                      spot: formatCurrency(Number(spotEur)),
                    })}
                  </p>
                ) : quickUnits.trim() !== "" ? (
                  <p className="mt-1 text-xs text-muted-foreground">{t("portfolio.quickAdd.livePreviewUnavailable")}</p>
                ) : null}
              </div>
            ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setQuickAddOpen(false)} className="w-full sm:w-auto">{t("common.cancel")}</Button>
              <Button type="button" onClick={handleQuickSave} className="w-full sm:w-auto">{t("common.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
