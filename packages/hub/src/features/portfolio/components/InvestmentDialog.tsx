import { useState, useEffect } from "react";
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
  // Track whether currentValue was manually edited by the user
  const [currentValueEditedByUser, setCurrentValueEditedByUser] = useState(false);

  const investedAmountValue = Number(investedAmount) || 0;
  const enteredCurrentValue = Number(currentValue) || 0;
  const cryptoUnitsValue = Number(cryptoUnits) || 0;
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
      setCryptoUnits(units ? units.toString() : "");
      setCashbackAsset(parsedCashbackAsset);
      setCashbackUnits(parsedCashbackUnits ? parsedCashbackUnits.toString() : "");
      setCashbackDate(parsedCashbackDate ?? "");
      setNotes(userNotes || "");
      setMovements(parseInvestmentMovements(investment.notes));
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
      setCurrentValueEditedByUser(false);
    }
  }, [investment, open]);

  const handleRemoveMovement = (id: string) => {
    setMovements((prev) => {
      const removed = prev.find(m => m.id === id);
      if (removed && !(type === "crypto" && hasCashback)) {
        if (removed.kind === "contribution") {
          // Always adjust investedAmount
          setInvestedAmount(v => (Number(v) - removed.amount).toFixed(2));
          // Adjust cryptoUnits if stored in movement
          if (removed.units) setCryptoUnits(v => parseFloat((Math.max(0, Number(v) - removed.units!)).toFixed(8)).toString());
          // Only adjust currentValue if not live crypto (live crypto derives value from units × spot)
          if (!hasLiveCryptoSync && !currentValueEditedByUser) {
            setCurrentValue(v => (Number(v) - removed.amount).toFixed(2));
          }
        } else if (removed.kind === "withdrawal") {
          setInvestedAmount(v => (Number(v) + removed.amount).toFixed(2));
          if (removed.units) setCryptoUnits(v => parseFloat((Number(v) + removed.units!).toFixed(8)).toString());
          if (!hasLiveCryptoSync && !currentValueEditedByUser) {
            setCurrentValue(v => (Number(v) + removed.amount).toFixed(2));
          }
        } else if (removed.kind === "adjustment" || removed.kind === "cashback") {
          // Profit movements don't affect investedAmount
          if (!hasLiveCryptoSync && !currentValueEditedByUser) {
            setCurrentValue(v => (Number(v) - removed.amount).toFixed(2));
          }
        }
      }
      return prev.filter(m => m.id !== id);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCryptoUnits = type === "crypto" && !hasCashback ? Number(cryptoUnits) || null : null;
    const parsedCashbackUnits = type === "crypto" && hasCashback ? Number(cashbackUnits) || null : null;
    const normalizedInvestedAmount = type === "crypto" && hasCashback ? 0 : parseFloat(investedAmount) || 0;
    const normalizedCurrentValue = type === "crypto" && hasCashback
      ? 0
      : hasLiveCryptoSync
        ? resolvedCurrentValue
        : parseFloat(currentValue) || 0;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{investment ? "Edit Investment" : "Add Investment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="p2p">P2P</SelectItem>
                  <SelectItem value="ppr">PPR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                  <div className="grid grid-cols-2 gap-3">
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
                  <p className="text-sm font-medium text-foreground">Crypto Cashback</p>
                  <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="space-y-3 rounded-lg border border-border/70 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Movement history</p>
              <p className="text-xs text-muted-foreground">Record of contributions and withdrawals. Use the + button on each card to add new entries.</p>
            </div>

            {movements.length ? (
              <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                {movements
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((movement) => {
                    const kindLabel: Record<string, string> = {
                      contribution: "Contribution",
                      withdrawal: "Withdrawal",
                      cashback: "Cashback",
                      adjustment: "Adjustment",
                    };
                    const kindColor: Record<string, string> = {
                      contribution: "text-primary",
                      withdrawal: "text-urgent",
                      cashback: "text-success",
                      adjustment: "text-muted-foreground",
                    };
                    return (
                      <div key={movement.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {movement.date}
                            <span className={`ml-2 text-xs font-semibold ${kindColor[movement.kind] ?? "text-muted-foreground"}`}>
                              {kindLabel[movement.kind] ?? movement.kind}
                            </span>
                            <span className="ml-2 text-foreground">€{movement.amount.toFixed(2)}</span>
                          </p>
                          {movement.note ? <p className="text-xs text-muted-foreground truncate">{movement.note}</p> : null}
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveMovement(movement.id)}>Remove</Button>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No movements yet. Use the + button on each card to register contributions.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{investment ? "Save Changes" : "Add Investment"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
