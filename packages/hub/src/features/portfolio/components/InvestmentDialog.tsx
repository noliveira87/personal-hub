import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Investment, InvestmentCategory, InvestmentType } from "@/features/portfolio/types/investment";
import {
  CryptoPosition,
  computeCryptoPositionValues,
  getCryptoTableTotalEur,
  parseCryptoNotes,
  parseCryptoTableNotes,
  serializeCryptoTableNotes,
} from "@/features/portfolio/lib/crypto";

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  btcSpotEur?: number | null;
  onSave: (data: Omit<Investment, "id" | "createdAt" | "updatedAt">) => void;
}

interface EditableCryptoPosition {
  symbol: string;
  marketPriceEur: string;
  investedUnits: string;
  cashbackUnits: string;
}

function toEditablePosition(position: CryptoPosition): EditableCryptoPosition {
  return {
    symbol: position.symbol,
    marketPriceEur: position.marketPriceEur > 0 ? String(position.marketPriceEur) : "",
    investedUnits: position.investedUnits > 0 ? String(position.investedUnits) : "",
    cashbackUnits: position.cashbackUnits > 0 ? String(position.cashbackUnits) : "",
  };
}

function createEmptyCryptoRow(defaultMarketPrice?: number | null): EditableCryptoPosition {
  return {
    symbol: "",
    marketPriceEur: defaultMarketPrice && defaultMarketPrice > 0 ? defaultMarketPrice.toFixed(2) : "",
    investedUnits: "",
    cashbackUnits: "",
  };
}

export function InvestmentDialog({ open, onOpenChange, investment, btcSpotEur, onSave }: InvestmentDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InvestmentCategory>("short-term");
  const [type, setType] = useState<InvestmentType>("cash");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [cryptoRows, setCryptoRows] = useState<EditableCryptoPosition[]>([]);
  const [notes, setNotes] = useState("");

  const investedAmountValue = Number(investedAmount) || 0;
  const enteredCurrentValue = Number(currentValue) || 0;
  const parsedCryptoPositions: CryptoPosition[] = cryptoRows
    .map((row) => {
      const symbol = row.symbol.trim().toUpperCase();
      const marketPriceEur = Number(row.marketPriceEur) || 0;
      const investedUnits = Number(row.investedUnits) || 0;
      const cashbackUnits = Number(row.cashbackUnits) || 0;

      if (!symbol || marketPriceEur <= 0 || (investedUnits <= 0 && cashbackUnits <= 0)) {
        return null;
      }

      return {
        symbol,
        marketPriceEur,
        investedUnits,
        cashbackUnits,
      };
    })
    .filter((row): row is CryptoPosition => Boolean(row));
  const hasCryptoTableSync = type === "crypto" && parsedCryptoPositions.length > 0;
  const resolvedCurrentValue = hasCryptoTableSync ? getCryptoTableTotalEur(parsedCryptoPositions) : enteredCurrentValue;
  const profitLoss = resolvedCurrentValue - investedAmountValue;
  const profitLossClass = profitLoss >= 0 ? "text-profit" : "text-loss";

  useEffect(() => {
    if (investment) {
      setName(investment.name);
      setCategory(investment.category);
      setType(investment.type);
      setInvestedAmount(investment.investedAmount.toString());
      setCurrentValue(investment.currentValue.toString());

      const tableMeta = parseCryptoTableNotes(investment.notes);
      const legacyMeta = parseCryptoNotes(investment.notes);

      if (tableMeta.positions.length > 0) {
        setCryptoRows(tableMeta.positions.map(toEditablePosition));
        setNotes(tableMeta.userNotes || "");
      } else if (investment.type === "crypto" && legacyMeta.btcUnits && legacyMeta.btcUnits > 0) {
        const fallbackMarket = btcSpotEur && btcSpotEur > 0
          ? btcSpotEur
          : investment.currentValue > 0
            ? investment.currentValue / legacyMeta.btcUnits
            : 0;
        setCryptoRows([
          {
            symbol: "BTC",
            marketPriceEur: fallbackMarket > 0 ? fallbackMarket.toFixed(2) : "",
            investedUnits: legacyMeta.btcUnits.toString(),
            cashbackUnits: "",
          },
        ]);
        setNotes(legacyMeta.userNotes || "");
      } else {
        setCryptoRows([]);
        setNotes(legacyMeta.userNotes || "");
      }
    } else {
      setName("");
      setCategory("short-term");
      setType("cash");
      setInvestedAmount("");
      setCurrentValue("");
      setCryptoRows([]);
      setNotes("");
    }
  }, [investment, open, btcSpotEur]);

  useEffect(() => {
    if (type === "crypto" && cryptoRows.length === 0) {
      setCryptoRows([createEmptyCryptoRow(btcSpotEur)]);
    }
  }, [type, cryptoRows.length, btcSpotEur]);

  const updateCryptoRow = (index: number, patch: Partial<EditableCryptoPosition>) => {
    setCryptoRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const addCryptoRow = () => {
    setCryptoRows((prev) => [...prev, createEmptyCryptoRow()]);
  };

  const removeCryptoRow = (index: number) => {
    setCryptoRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const serializedNotes =
      type === "crypto"
        ? serializeCryptoTableNotes(parsedCryptoPositions, notes)
        : notes.trim() || undefined;

    onSave({
      name,
      category,
      type,
      investedAmount: parseFloat(investedAmount) || 0,
      currentValue: hasCryptoTableSync ? resolvedCurrentValue : parseFloat(currentValue) || 0,
      notes: serializedNotes,
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
              <Label htmlFor="invested">Invested (€)</Label>
              <Input id="invested" type="number" step="0.01" value={investedAmount} onChange={e => setInvestedAmount(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="current">Current Value (€)</Label>
              <Input
                id="current"
                type="number"
                step="0.01"
                value={hasCryptoTableSync ? resolvedCurrentValue.toFixed(2) : currentValue}
                onChange={e => setCurrentValue(e.target.value)}
                required
                readOnly={hasCryptoTableSync}
                className={hasCryptoTableSync ? `${profitLossClass} font-semibold` : undefined}
              />
              {hasCryptoTableSync && (
                <p className={`mt-1 text-xs ${profitLossClass}`}>
                  Sync via tabela crypto · P&amp;L: {profitLoss >= 0 ? "+" : ""}{profitLoss.toFixed(2)} €
                </p>
              )}
            </div>
          </div>
          {type === "crypto" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Crypto positions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCryptoRow}>
                  Add row
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">Crypto</th>
                      <th className="px-2 py-2 text-left font-medium">Mkt Price (€)</th>
                      <th className="px-2 py-2 text-left font-medium">Invested Units</th>
                      <th className="px-2 py-2 text-left font-medium">Invested (€)</th>
                      <th className="px-2 py-2 text-left font-medium">Cashback Units</th>
                      <th className="px-2 py-2 text-left font-medium">Cashback (€)</th>
                      <th className="px-2 py-2 text-left font-medium">Euros</th>
                      <th className="px-2 py-2 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cryptoRows.map((row, index) => {
                      const marketPriceEur = Number(row.marketPriceEur) || 0;
                      const investedUnits = Number(row.investedUnits) || 0;
                      const cashbackUnits = Number(row.cashbackUnits) || 0;
                      const values = computeCryptoPositionValues({
                        symbol: row.symbol.trim().toUpperCase() || "-",
                        marketPriceEur,
                        investedUnits,
                        cashbackUnits,
                      });

                      return (
                        <tr key={`${row.symbol}-${index}`} className="border-t">
                          <td className="px-2 py-2">
                            <Input
                              value={row.symbol}
                              onChange={(event) => updateCryptoRow(index, { symbol: event.target.value.toUpperCase() })}
                              placeholder="BTC"
                              className="h-8"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={row.marketPriceEur}
                              onChange={(event) => updateCryptoRow(index, { marketPriceEur: event.target.value })}
                              placeholder="61000"
                              className="h-8"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              step="0.00000001"
                              value={row.investedUnits}
                              onChange={(event) => updateCryptoRow(index, { investedUnits: event.target.value })}
                              placeholder="0.01"
                              className="h-8"
                            />
                          </td>
                          <td className="px-2 py-2 font-medium tabular-nums">{values.investedEur.toFixed(2)}€</td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              step="0.00000001"
                              value={row.cashbackUnits}
                              onChange={(event) => updateCryptoRow(index, { cashbackUnits: event.target.value })}
                              placeholder="0"
                              className="h-8"
                            />
                          </td>
                          <td className="px-2 py-2 font-medium tabular-nums">{values.cashbackEur.toFixed(2)}€</td>
                          <td className="px-2 py-2 font-semibold tabular-nums">{values.totalEur.toFixed(2)}€</td>
                          <td className="px-2 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCryptoRow(index)}
                              disabled={cryptoRows.length === 1}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Total crypto value from table: <span className="font-semibold text-foreground">{getCryptoTableTotalEur(parsedCryptoPositions).toFixed(2)}€</span>
              </p>
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
