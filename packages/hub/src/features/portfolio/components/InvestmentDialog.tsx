import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Investment, InvestmentCategory, InvestmentType } from "@/features/portfolio/types/investment";
import { CryptoAsset, CryptoQuoteMap, parseCryptoNotes, serializeCryptoNotes } from "@/features/portfolio/lib/crypto";

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
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>("BTC");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [cryptoUnits, setCryptoUnits] = useState("");
  const [notes, setNotes] = useState("");

  const investedAmountValue = Number(investedAmount) || 0;
  const enteredCurrentValue = Number(currentValue) || 0;
  const cryptoUnitsValue = Number(cryptoUnits) || 0;
  const selectedAssetSpotEur = cryptoSpotEur?.[cryptoAsset] ?? null;
  const isCrypto = type === "crypto";
  const hasLiveCryptoSync = type === "crypto" && cryptoUnitsValue > 0 && !!selectedAssetSpotEur;
  const resolvedCurrentValue = hasLiveCryptoSync ? cryptoUnitsValue * Number(selectedAssetSpotEur) : enteredCurrentValue;
  const profitLoss = resolvedCurrentValue - investedAmountValue;
  const profitLossClass = profitLoss >= 0 ? "text-success" : "text-urgent";
  const hasCryptoValues = isCrypto && investedAmount.trim() !== "" && (hasLiveCryptoSync || currentValue.trim() !== "");

  useEffect(() => {
    if (investment) {
      setName(investment.name);
      setCategory(investment.category);
      setType(investment.type);
      setInvestedAmount(investment.investedAmount.toString());
      setCurrentValue(investment.currentValue.toString());
      const { asset, units, userNotes } = parseCryptoNotes(investment.notes);
      setCryptoAsset(asset);
      setCryptoUnits(units ? units.toString() : "");
      setNotes(userNotes || "");
    } else {
      setName("");
      setCategory("short-term");
      setType("cash");
      setCryptoAsset("BTC");
      setInvestedAmount("");
      setCurrentValue("");
      setCryptoUnits("");
      setNotes("");
    }
  }, [investment, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCryptoUnits = type === "crypto" ? Number(cryptoUnits) || null : null;

    onSave({
      name,
      category,
      type,
      investedAmount: parseFloat(investedAmount) || 0,
      currentValue: hasLiveCryptoSync ? resolvedCurrentValue : parseFloat(currentValue) || 0,
      notes: type === "crypto" ? serializeCryptoNotes(cryptoAsset, parsedCryptoUnits, notes) : notes || undefined,
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
                  onChange={e => setCurrentValue(e.target.value)}
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
          {type === "crypto" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Asset</Label>
                <Select value={cryptoAsset} onValueChange={v => setCryptoAsset(v as CryptoAsset)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="crypto-units">{cryptoAsset} amount (optional for live sync)</Label>
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
          )}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
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
