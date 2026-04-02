import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Investment, InvestmentCategory, InvestmentMovement, InvestmentType } from "@/features/portfolio/types/investment";
import { CryptoAsset, CryptoQuoteMap, parseCryptoNotes, parseInvestmentMovements, serializeInvestmentNotes } from "@/features/portfolio/lib/crypto";

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  cryptoSpotEur?: CryptoQuoteMap | null;
  onSave: (data: Omit<Investment, "id" | "createdAt" | "updatedAt">) => void;
}

export function InvestmentDialog({ open, onOpenChange, investment, cryptoSpotEur, onSave }: InvestmentDialogProps) {
  const parseNumericInput = (value: string) => {
    const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
    if (!normalized) return 0;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatUnitInput = (value: number | null) => {
    if (!value || !Number.isFinite(value)) return "";
    return value.toFixed(8).replace(/\.?0+$/, "");
  };

  const [name, setName] = useState("");
  const [category, setCategory] = useState<InvestmentCategory>("short-term");
  const [type, setType] = useState<InvestmentType>("cash");
  const [hasCashback, setHasCashback] = useState(false);
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>("BTC");
  const [cashbackAsset, setCashbackAsset] = useState<CryptoAsset>("BTC");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [cryptoUnits, setCryptoUnits] = useState("");
  const [cashbackUnits, setCashbackUnits] = useState("");
  const [cashbackDate, setCashbackDate] = useState("");
  const [notes, setNotes] = useState("");
  const [movements, setMovements] = useState<InvestmentMovement[]>([]);
  const [historyMonth, setHistoryMonth] = useState<string | null>(null);
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [editingMovementDate, setEditingMovementDate] = useState("");
  const [editingMovementKind, setEditingMovementKind] = useState<InvestmentMovement["kind"]>("adjustment");
  const [editingMovementAmount, setEditingMovementAmount] = useState("");
  const [editingMovementUnits, setEditingMovementUnits] = useState("");
  const [editingMovementNote, setEditingMovementNote] = useState("");
  // Track whether currentValue was manually edited by the user
  const [currentValueEditedByUser, setCurrentValueEditedByUser] = useState(false);

  const investedAmountValue = parseNumericInput(investedAmount);
  const enteredCurrentValue = parseNumericInput(currentValue);
  const cryptoUnitsValue = parseNumericInput(cryptoUnits);
  const selectedAssetSpotEur = cryptoSpotEur?.[cryptoAsset] ?? null;
  const isCrypto = type === "crypto";
  const hasLiveCryptoSync = type === "crypto" && !hasCashback && cryptoUnitsValue > 0 && !!selectedAssetSpotEur;
  const resolvedCurrentValue = hasLiveCryptoSync ? cryptoUnitsValue * Number(selectedAssetSpotEur) : enteredCurrentValue;
  const profitLoss = resolvedCurrentValue - investedAmountValue;
  const profitLossClass = profitLoss >= 0 ? "text-success" : "text-urgent";
  const hasCryptoValues = isCrypto && !hasCashback && investedAmount.trim() !== "" && (hasLiveCryptoSync || currentValue.trim() !== "");

  useEffect(() => {
    if (investment) {
      setName(investment.name);
      setCategory(investment.category);
      setType(investment.type);
      setInvestedAmount(investment.investedAmount.toString());
      setCurrentValue(investment.currentValue.toString());
      const { asset, units, cashbackAsset: parsedCashbackAsset, cashbackUnits: parsedCashbackUnits, cashbackDate: parsedCashbackDate, userNotes } = parseCryptoNotes(investment.notes);
      const isCashbackEntry = investment.type === "crypto"
        && !units
        && !!parsedCashbackUnits
        && investment.investedAmount === 0;
      setHasCashback(isCashbackEntry);
      setCryptoAsset(asset);
      setCryptoUnits(formatUnitInput(units));
      setCashbackAsset(parsedCashbackAsset);
      setCashbackUnits(formatUnitInput(parsedCashbackUnits));
      setCashbackDate(parsedCashbackDate ?? "");
      setNotes(userNotes || "");
      const parsed = parseInvestmentMovements(investment.notes);
      setMovements(parsed);
      const months = Array.from(new Set(parsed.map((m) => m.date.slice(0, 7)))).sort();
      setHistoryMonth(months.length ? months[months.length - 1] : null);
      setEditingMovementId(null);
      setCurrentValueEditedByUser(false);
    } else {
      setName("");
      setCategory("short-term");
      setType("cash");
      setHasCashback(false);
      setCryptoAsset("BTC");
      setCashbackAsset("BTC");
      setInvestedAmount("");
      setCurrentValue("");
      setCryptoUnits("");
      setCashbackUnits("");
      setCashbackDate("");
      setNotes("");
      setMovements([]);
      setEditingMovementId(null);
      setCurrentValueEditedByUser(false);
    }
  }, [investment, open]);

  const applyMovementImpact = (movement: InvestmentMovement, direction: 1 | -1) => {
    const investedDeltaBase = movement.kind === "contribution"
      ? movement.amount
      : movement.kind === "withdrawal"
        ? -movement.amount
        : 0;

    const currentDeltaBase = movement.kind === "contribution"
      ? movement.amount
      : movement.kind === "withdrawal"
        ? -movement.amount
        : (movement.kind === "adjustment" || movement.kind === "cashback")
          ? movement.amount
          : 0;

    const investedDelta = investedDeltaBase * direction;
    const currentDelta = currentDeltaBase * direction;

    if (investedDelta !== 0) {
      setInvestedAmount((value) => (parseNumericInput(value) + investedDelta).toFixed(2));
    }

    if (!hasLiveCryptoSync && currentDelta !== 0) {
      setCurrentValue((value) => (parseNumericInput(value) + currentDelta).toFixed(2));
    }

    const effectiveUnits = movement.units;

    if (effectiveUnits) {
      if (!hasCashback && (movement.kind === "contribution" || movement.kind === "withdrawal")) {
        const unitsDelta = (movement.kind === "contribution" ? effectiveUnits : -effectiveUnits) * direction;
        setCryptoUnits((value) => parseFloat((Math.max(0, parseNumericInput(value) + unitsDelta)).toFixed(8)).toString());
      }

      if (type === "crypto" && hasCashback && (movement.kind === "adjustment" || movement.kind === "cashback")) {
        const cashbackDelta = effectiveUnits * direction;
        setCashbackUnits((value) => parseFloat((Math.max(0, parseNumericInput(value) + cashbackDelta)).toFixed(8)).toString());
      }
    }
  };

  const handleRemoveMovement = (id: string) => {
    const removed = movements.find((m) => m.id === id);
    if (!removed) return;

    applyMovementImpact(removed, -1);
    if (editingMovementId === id) setEditingMovementId(null);
    setMovements((prev) => prev.filter((m) => m.id !== id));
  };

  const startEditMovement = (movement: InvestmentMovement) => {
    setEditingMovementId(movement.id);
    setEditingMovementDate(movement.date);
    setEditingMovementKind(movement.kind);
    setEditingMovementAmount(String(movement.amount));
    setEditingMovementUnits(movement.units != null ? String(movement.units) : "");
    setEditingMovementNote(movement.note ?? "");
  };

  const cancelEditMovement = () => {
    setEditingMovementId(null);
    setEditingMovementDate("");
    setEditingMovementAmount("");
    setEditingMovementUnits("");
    setEditingMovementNote("");
  };

  const saveMovementEdit = () => {
    if (!editingMovementId) return;

    const nextAmount = parseNumericInput(editingMovementAmount);
    if (!Number.isFinite(nextAmount)) return;
    const parsedUnits = editingMovementUnits.trim() === "" ? undefined : parseNumericInput(editingMovementUnits);
    if (editingMovementUnits.trim() !== "" && !Number.isFinite(parsedUnits)) return;

    const current = movements.find((m) => m.id === editingMovementId);
    if (!current) return;

    const nextMovement: InvestmentMovement = {
      ...current,
      date: editingMovementDate,
      kind: editingMovementKind,
      amount: nextAmount,
      units: parsedUnits,
      note: editingMovementNote.trim() ? editingMovementNote.trim() : undefined,
    };

    applyMovementImpact(current, -1);
    applyMovementImpact(nextMovement, 1);

    setMovements((prev) => prev.map((movement) => movement.id === editingMovementId ? nextMovement : movement));

    cancelEditMovement();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCryptoUnits = type === "crypto" && !hasCashback ? parseNumericInput(cryptoUnits) || null : null;
    const parsedCashbackUnits = type === "crypto" && hasCashback ? parseNumericInput(cashbackUnits) || null : null;
    const normalizedInvestedAmount = type === "crypto" && hasCashback ? 0 : parseNumericInput(investedAmount) || 0;
    const normalizedCurrentValue = type === "crypto" && hasCashback
      ? 0
      : hasLiveCryptoSync
        ? resolvedCurrentValue
        : parseNumericInput(currentValue) || 0;

    // investedAmount is updated in real-time via handleRemoveMovement delta adjustments.
    // Trust what's in the field.
    const finalInvestedAmount = normalizedInvestedAmount;

    // If movements were edited by user, don't auto-recalculate currentValue
    // currentValue is updated in real-time via handleRemoveMovement delta adjustments
    // or by the user editing the field directly. Trust what's in the field.
    const finalCurrentValue = normalizedCurrentValue;

    const allMovements = movements;

    onSave({
      name,
      category,
      type,
      investedAmount: finalInvestedAmount,
      currentValue: finalCurrentValue,
      notes: serializeInvestmentNotes({
        asset: type === "crypto" ? cryptoAsset : undefined,
        units: type === "crypto" ? parsedCryptoUnits : null,
        cashbackAsset: type === "crypto" ? cashbackAsset : undefined,
        cashbackUnits: type === "crypto" ? parsedCashbackUnits : null,
        cashbackDate: type === "crypto" && hasCashback ? cashbackDate || null : null,
        movements: allMovements,
        userNotes: notes,
      }),
    });
    onOpenChange(false);
  };

  const historyMonths = useMemo(() => {
    return Array.from(new Set(movements.map((m) => m.date.slice(0, 7)))).sort();
  }, [movements]);

  // Keep historyMonth pointing to a valid month; fall back to last when one disappears
  useEffect(() => {
    if (historyMonths.length === 0) { setHistoryMonth(null); return; }
    if (historyMonth && historyMonths.includes(historyMonth)) return;
    setHistoryMonth(historyMonths[historyMonths.length - 1]);
  }, [historyMonths, historyMonth]);

  const activeHistoryMonth = historyMonth ?? historyMonths[historyMonths.length - 1] ?? null;
  const historyMonthIdx = activeHistoryMonth ? historyMonths.indexOf(activeHistoryMonth) : -1;
  const visibleMovements = activeHistoryMonth
    ? movements.filter((m) => m.date.startsWith(activeHistoryMonth)).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const formatMonthNav = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-PT", { month: "short", year: "numeric" }).format(new Date(y, (m || 1) - 1, 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[92vh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{investment ? "Edit Investment" : "Add Investment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3 rounded-lg border border-border/70 p-3">
            <p className="text-sm font-medium text-foreground">Investment details</p>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={v => setCategory(v as InvestmentCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short-term">Short-term</SelectItem>
                    <SelectItem value="long-term">Long-term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={v => setType(v as InvestmentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="aforro">Aforro</SelectItem>
                    <SelectItem value="etf">ETF</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="p2p">P2P</SelectItem>
                    <SelectItem value="ppr">PPR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-3">
            <p className="text-sm font-medium text-foreground">Position & value</p>
            {type === "crypto" && (
              <div className="space-y-4 rounded-lg border border-border/70 p-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={hasCashback}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setHasCashback(enabled);
                    if (enabled) {
                      setCashbackAsset(cryptoAsset);
                    }
                  }}
                />
                Add cashback
              </label>

              {!hasCashback && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Crypto Position</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Position Asset</Label>
                      <Select value={cryptoAsset} onValueChange={v => setCryptoAsset(v as CryptoAsset)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BTC">BTC</SelectItem>
                          <SelectItem value="ETH">ETH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="crypto-units">Position Units ({cryptoAsset})</Label>
                      <Input
                        id="crypto-units"
                        type="number"
                        step="0.00000001"
                        value={cryptoUnits}
                        onChange={e => setCryptoUnits(e.target.value)}
                        placeholder={cryptoAsset === "BTC" ? "e.g. 0.052341" : "e.g. 1.245"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {hasCashback && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Cashback details</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Cashback Asset</Label>
                      <Select value={cashbackAsset} onValueChange={v => setCashbackAsset(v as CryptoAsset)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BTC">BTC</SelectItem>
                          <SelectItem value="ETH">ETH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="cashback-units">Cashback Units Earned</Label>
                      <Input
                        id="cashback-units"
                        type="number"
                        step="0.00000001"
                        value={cashbackUnits}
                        onChange={e => setCashbackUnits(e.target.value)}
                        placeholder={cashbackAsset === "BTC" ? "e.g. 0.00012" : "e.g. 0.0045"}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cashback-date">Cashback Date</Label>
                    <Input
                      id="cashback-date"
                      type="date"
                      value={cashbackDate}
                      onChange={e => setCashbackDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
              </div>
            )}
            {type !== "crypto" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Current Value (€)</Label>
                  <Input
                    id="current"
                    type="number"
                    step="0.01"
                    value={currentValue}
                    onChange={e => { setCurrentValue(e.target.value); setCurrentValueEditedByUser(true); }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="invested">Invested (€)</Label>
                  <Input id="invested" type="number" step="0.01" value={investedAmount} onChange={e => setInvestedAmount(e.target.value)} required />
                </div>
              </div>
            )}
            {type === "crypto" && !hasCashback && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Current Value (€)</Label>
                  {hasLiveCryptoSync ? (
                    <p className={`mt-2 text-lg font-semibold tabular-nums ${profitLossClass}`}>
                      {resolvedCurrentValue.toFixed(2)} €
                    </p>
                  ) : (
                    <Input
                      id="current"
                      type="number"
                      step="0.01"
                      value={currentValue}
                      onChange={e => { setCurrentValue(e.target.value); setCurrentValueEditedByUser(true); }}
                      required
                      className={hasCryptoValues ? `${profitLossClass} font-semibold` : undefined}
                    />
                  )}
                  {hasCryptoValues && (
                    <p className={`mt-1 text-xs ${profitLossClass}`}>
                      {hasLiveCryptoSync ? `Live ${cryptoAsset} sync active` : "Profit/Loss"} · {profitLoss >= 0 ? "+" : ""}{profitLoss.toFixed(2)} €
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="invested">Invested (€)</Label>
                  <Input id="invested" type="number" step="0.01" value={investedAmount} onChange={e => setInvestedAmount(e.target.value)} required />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-border/70 p-3">
            <p className="text-sm font-medium text-foreground">Additional notes</p>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-border/70 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Movement history</p>
              <p className="text-xs text-muted-foreground">
                {hasCashback
                  ? "Record of cashback and manual adjustments. Use the Add Movement action in the page header to add new entries."
                  : "Record of contributions and withdrawals. Use the Add Movement action in the page header to add new entries."}
              </p>
            </div>

            {movements.length ? (
              <div className="space-y-2">
                {/* Month navigator */}
                <div className="flex items-center justify-between">
                  <Button
                    type="button" variant="ghost" size="icon"
                    disabled={historyMonthIdx <= 0}
                    onClick={() => setHistoryMonth(historyMonths[historyMonthIdx - 1])}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {activeHistoryMonth ? formatMonthNav(activeHistoryMonth) : "—"}
                    </span>
                    {historyMonthIdx >= 0 && historyMonthIdx < historyMonths.length - 1 ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setHistoryMonth(historyMonths[historyMonths.length - 1])}>
                        Latest
                      </Button>
                    ) : null}
                  </div>
                  <Button
                    type="button" variant="ghost" size="icon"
                    disabled={historyMonthIdx >= historyMonths.length - 1}
                    onClick={() => setHistoryMonth(historyMonths[historyMonthIdx + 1])}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {visibleMovements.length ? (
                  <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                    {visibleMovements.map((movement) => {
                      const kindLabel: Record<string, string> = {
                        contribution: "Contribution",
                        withdrawal: "Withdrawal",
                        cashback: "Cashback",
                        adjustment: "Profit / Loss",
                      };
                      const kindColor: Record<string, string> = {
                        contribution: "text-primary",
                        withdrawal: "text-urgent",
                        cashback: "text-success",
                        adjustment: "text-muted-foreground",
                      };
                      return (
                        <div key={movement.id} className="space-y-2 rounded-md border border-border/60 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-foreground">
                              <span className="whitespace-nowrap">{movement.date}</span>
                              <span className={`whitespace-nowrap text-xs font-semibold ${kindColor[movement.kind] ?? "text-muted-foreground"}`}>
                                {kindLabel[movement.kind] ?? movement.kind}
                              </span>
                              <span className="whitespace-nowrap text-foreground">€{movement.amount.toFixed(2)}</span>
                              {movement.units ? (
                                <span className="whitespace-nowrap text-xs text-muted-foreground">
                                  {`${movement.units.toFixed(8)} ${hasCashback ? cashbackAsset : cryptoAsset}`}
                                </span>
                              ) : null}
                            </p>
                            {movement.note ? <p className="text-xs text-muted-foreground truncate">{movement.note}</p> : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => startEditMovement(movement)}>Edit</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveMovement(movement.id)}>Remove</Button>
                          </div>
                          </div>
                          {editingMovementId === movement.id ? (
                            <div className={`grid grid-cols-1 gap-2 rounded-md bg-muted/40 p-2 ${type === "crypto" ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
                              <Input type="date" value={editingMovementDate} onChange={(e) => setEditingMovementDate(e.target.value)} />
                              <Select value={editingMovementKind} onValueChange={(value) => setEditingMovementKind(value as InvestmentMovement["kind"])}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contribution">Contribution</SelectItem>
                                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                                  <SelectItem value="adjustment">Profit / Loss</SelectItem>
                                  <SelectItem value="cashback">Cashback</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input type="number" step="0.01" value={editingMovementAmount} onChange={(e) => setEditingMovementAmount(e.target.value)} placeholder="Amount" />
                              {type === "crypto" ? (
                                <Input type="number" step="0.00000001" value={editingMovementUnits} onChange={(e) => setEditingMovementUnits(e.target.value)} placeholder="Units" />
                              ) : null}
                              <Input value={editingMovementNote} onChange={(e) => setEditingMovementNote(e.target.value)} placeholder="Note" />
                              <div className={`${type === "crypto" ? "sm:col-span-5" : "sm:col-span-4"} flex justify-end gap-2`}>
                                <Button type="button" variant="outline" size="sm" onClick={cancelEditMovement}>Cancel</Button>
                                <Button type="button" size="sm" onClick={saveMovementEdit}>Save movement</Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No movements recorded in this month.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {hasCashback
                  ? "No movements yet. Use the + button on each card to register cashback/adjustment entries."
                  : "No movements yet. Use the + button on each card to register contributions."}
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto">{investment ? "Save Changes" : "Add Investment"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
