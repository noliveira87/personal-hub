import { FormEvent, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CryptoAsset, CryptoQuoteMap } from "@/features/portfolio/lib/crypto";
import { PortfolioEarning, PortfolioEarningKind, formatCurrency } from "@/features/portfolio/types/investment";

interface EarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earning?: PortfolioEarning | null;
  cryptoSpotEur?: CryptoQuoteMap | null;
  onSave: (data: Omit<PortfolioEarning, "id" | "createdAt" | "updatedAt">) => void;
}

const parseDecimalInput = (value: string) => {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export function EarningDialog({ open, onOpenChange, earning, cryptoSpotEur, onSave }: EarningDialogProps) {
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [kind, setKind] = useState<PortfolioEarningKind>("cashback");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountEur, setAmountEur] = useState("");
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>("BTC");
  const [cryptoUnits, setCryptoUnits] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (earning) {
      setTitle(earning.title);
      setProvider(earning.provider ?? "");
      setKind(earning.kind);
      setDate(earning.date);
      setAmountEur(earning.amountEur ? String(earning.amountEur) : "");
      setCryptoAsset(earning.cryptoAsset ?? "BTC");
      setCryptoUnits(earning.cryptoUnits ? String(earning.cryptoUnits) : "");
      setNotes(earning.notes ?? "");
      return;
    }

    setTitle("");
    setProvider("");
    setKind("cashback");
    setDate(new Date().toISOString().slice(0, 10));
    setAmountEur("");
    setCryptoAsset("BTC");
    setCryptoUnits("");
    setNotes("");
  }, [earning, open]);

  const spotEur = cryptoSpotEur?.[cryptoAsset] ?? null;
  const calculatedCryptoValue = useMemo(() => {
    const units = parseDecimalInput(cryptoUnits);
    return kind === "crypto_cashback" && Number.isFinite(units) && units > 0 && spotEur ? units * spotEur : 0;
  }, [cryptoUnits, kind, spotEur]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const parsedAmount = kind === "crypto_cashback" ? calculatedCryptoValue : parseDecimalInput(amountEur);
    if (!title.trim() || !date || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const parsedUnits = kind === "crypto_cashback" ? parseDecimalInput(cryptoUnits) : NaN;
    if (kind === "crypto_cashback" && (!Number.isFinite(parsedUnits) || parsedUnits <= 0 || !spotEur)) return;

    onSave({
      title: title.trim(),
      provider: provider.trim() || undefined,
      kind,
      date,
      amountEur: Math.round(parsedAmount * 100) / 100,
      cryptoAsset: kind === "crypto_cashback" ? cryptoAsset : undefined,
      cryptoUnits: kind === "crypto_cashback" ? Math.round(parsedUnits * 1e8) / 1e8 : null,
      spotEurAtEarned: kind === "crypto_cashback" && spotEur ? Math.round(spotEur * 100) / 100 : null,
      notes: notes.trim() || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>{earning ? "Edit earning" : "Add earning"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3 rounded-lg border border-border/70 p-3">
            <p className="text-sm font-medium text-foreground">Earning details</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="earning-title">Title</Label>
                <Input id="earning-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Amazon, MEO, WhatYouExpect" required />
              </div>
              <div>
                <Label htmlFor="earning-provider">Provider</Label>
                <Input id="earning-provider" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Curve, LetyShops, PayPal" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Select value={kind} onValueChange={(value) => setKind(value as PortfolioEarningKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashback">Cashback</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                    <SelectItem value="dividend">Dividend</SelectItem>
                    <SelectItem value="social_media">Social media</SelectItem>
                    <SelectItem value="crypto_cashback">Crypto cashback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="earning-date">Date</Label>
                <Input id="earning-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>
          </div>

          {kind === "crypto_cashback" ? (
            <div className="space-y-3 rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium text-foreground">Amount & conversion</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Crypto asset</Label>
                  <Select value={cryptoAsset} onValueChange={(value) => setCryptoAsset(value as CryptoAsset)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="earning-crypto-units">Units earned</Label>
                  <Input
                    id="earning-crypto-units"
                    type="text"
                    inputMode="decimal"
                    value={cryptoUnits}
                    onChange={(e) => setCryptoUnits(e.target.value)}
                    placeholder="0,00000000"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {spotEur
                  ? `Calculated monthly value: ${formatCurrency(calculatedCryptoValue)} (${cryptoAsset} × ${formatCurrency(spotEur)})`
                  : "Live crypto quote unavailable — cannot calculate EUR value right now."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium text-foreground">Amount</p>
              <div>
                <Label htmlFor="earning-amount">Amount (€)</Label>
                <Input
                  id="earning-amount"
                  type="text"
                  inputMode="decimal"
                  value={amountEur}
                  onChange={(e) => setAmountEur(e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border/70 p-3">
            <p className="text-sm font-medium text-foreground">Additional notes</p>
            <div>
              <Label htmlFor="earning-notes">Notes (optional)</Label>
              <Textarea id="earning-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto">{earning ? "Save changes" : "Add earning"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
