import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Investment, InvestmentCategory, InvestmentType } from "@/features/portfolio/types/investment";
import { parseCryptoNotes, serializeCryptoNotes } from "@/features/portfolio/lib/crypto";

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  onSave: (data: Omit<Investment, "id" | "createdAt" | "updatedAt">) => void;
}

export function InvestmentDialog({ open, onOpenChange, investment, onSave }: InvestmentDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InvestmentCategory>("short-term");
  const [type, setType] = useState<InvestmentType>("cash");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [btcUnits, setBtcUnits] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (investment) {
      setName(investment.name);
      setCategory(investment.category);
      setType(investment.type);
      setInvestedAmount(investment.investedAmount.toString());
      setCurrentValue(investment.currentValue.toString());
      const { btcUnits: parsedBtcUnits, userNotes } = parseCryptoNotes(investment.notes);
      setBtcUnits(parsedBtcUnits ? parsedBtcUnits.toString() : "");
      setNotes(userNotes || "");
    } else {
      setName("");
      setCategory("short-term");
      setType("cash");
      setInvestedAmount("");
      setCurrentValue("");
      setBtcUnits("");
      setNotes("");
    }
  }, [investment, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBtcUnits = type === "crypto" ? Number(btcUnits) || null : null;

    onSave({
      name,
      category,
      type,
      investedAmount: parseFloat(investedAmount) || 0,
      currentValue: parseFloat(currentValue) || 0,
      notes: serializeCryptoNotes(parsedBtcUnits, notes),
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
              <Input id="current" type="number" step="0.01" value={currentValue} onChange={e => setCurrentValue(e.target.value)} required />
            </div>
          </div>
          {type === "crypto" && (
            <div>
              <Label htmlFor="btc-units">BTC amount (optional for live sync)</Label>
              <Input
                id="btc-units"
                type="number"
                step="0.00000001"
                value={btcUnits}
                onChange={e => setBtcUnits(e.target.value)}
                placeholder="e.g. 0.052341"
              />
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
