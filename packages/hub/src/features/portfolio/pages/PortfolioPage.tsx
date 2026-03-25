import { Suspense, lazy, useMemo, useState } from "react";
import { Plus, ChartLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/features/portfolio/components/KpiCards";
import { InvestmentSection } from "@/features/portfolio/components/InvestmentSection";
import { MonthlyInsights } from "@/features/portfolio/components/MonthlyInsights";
import { useInvestments } from "@/features/portfolio/hooks/useInvestments";
import { Investment, InvestmentMovementKind, calculateSummary } from "@/features/portfolio/types/investment";
import AppSectionHeader from "@/components/AppSectionHeader";
import { useCryptoQuotes } from "@/features/portfolio/hooks/use-btc-quote";
import { parseCryptoNotes, parseInvestmentMovements, resolveInvestmentCurrentValue, serializeInvestmentNotes } from "@/features/portfolio/lib/crypto";

const InvestmentDialog = lazy(() =>
  import("@/features/portfolio/components/InvestmentDialog").then((module) => ({ default: module.InvestmentDialog })),
);

const Index = () => {
  const { investments, monthlySnapshots, shortTerm, longTerm, addInvestment, updateInvestment, deleteInvestment, moveInvestment } = useInvestments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const { pricesEur: cryptoSpotEur, loading: cryptoQuoteLoading } = useCryptoQuotes();

  const resolvedInvestments = useMemo(() => {
    return investments.map((investment) => ({
      ...investment,
      currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
    }));
  }, [investments, cryptoSpotEur]);

  const summary = calculateSummary(resolvedInvestments);

  // Keep editingInvestment in sync with investments when they change
  // This ensures the dialog always shows the latest data
  const syncedEditingInvestment = editingInvestment
    ? resolvedInvestments.find((inv) => inv.id === editingInvestment.id) || editingInvestment
    : null;

  const handleEdit = (investment: Investment) => {
    setEditingInvestment({
      ...investment,
      currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingInvestment(null);
    setDialogOpen(true);
  };

  const handleSave = (data: Omit<Investment, "id" | "createdAt" | "updatedAt">) => {
    if (editingInvestment) {
      updateInvestment(editingInvestment.id, data);
    } else {
      addInvestment(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this investment?")) {
      deleteInvestment(id);
    }
  };

  const handleQuickContribution = (
    investment: Investment,
    payload: { amount: number; date: string; mode: "contribution" | "value_update"; unitsBought?: number | null },
  ) => {
    const { asset, units, cashbackAsset, cashbackUnits, cashbackDate, userNotes: rawUserNotes } = parseCryptoNotes(investment.notes);
    const existingMovements = parseInvestmentMovements(investment.notes);
    const userNotes = rawUserNotes || "";

    if (payload.mode === "value_update") {
      // Profit / interest / market gain — only current value changes, invested stays the same.
      // Still record as an "adjustment" movement for historical tracking.
      const profitMovements = [
        ...existingMovements,
        {
          id: globalThis.crypto?.randomUUID?.() ?? `movement-${Date.now()}`,
          date: payload.date,
          kind: "adjustment" as InvestmentMovementKind,
          amount: payload.amount,
          note: "Profit / Return",
        },
      ].sort((a, b) => a.date.localeCompare(b.date));

      const nextUnitsProfit = investment.type === "crypto"
        ? (units ?? 0) + (payload.unitsBought ?? 0)
        : null;

      updateInvestment(investment.id, {
        currentValue: investment.currentValue + payload.amount,
        notes: serializeInvestmentNotes({
          asset: investment.type === "crypto" ? asset : undefined,
          units: investment.type === "crypto" ? nextUnitsProfit : null,
          cashbackAsset: investment.type === "crypto" ? cashbackAsset : undefined,
          cashbackUnits: investment.type === "crypto" ? cashbackUnits : null,
          cashbackDate: investment.type === "crypto" ? cashbackDate : null,
          movements: profitMovements,
          userNotes,
        }),
      });
      return;
    }

    // Contribution — new money in
    const nextMovements = [
      ...existingMovements,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `movement-${Date.now()}`,
        date: payload.date,
        kind: "contribution" as InvestmentMovementKind,
        amount: payload.amount,
        ...(investment.type === "crypto" && payload.unitsBought ? { units: payload.unitsBought } : {}),
      },
    ].sort((a, b) => a.date.localeCompare(b.date));

    const nextInvestedAmount = investment.investedAmount + payload.amount;
    const nextUnits = investment.type === "crypto"
      ? (units ?? 0) + (payload.unitsBought ?? 0)
      : null;

    const serializedNotes = serializeInvestmentNotes({
      asset: investment.type === "crypto" ? asset : undefined,
      units: investment.type === "crypto" ? nextUnits : null,
      cashbackAsset: investment.type === "crypto" ? cashbackAsset : undefined,
      cashbackUnits: investment.type === "crypto" ? cashbackUnits : null,
      cashbackDate: investment.type === "crypto" ? cashbackDate : null,
      movements: nextMovements,
      userNotes,
    });

    updateInvestment(investment.id, {
      investedAmount: nextInvestedAmount,
      currentValue: investment.type === "crypto"
        ? investment.currentValue
        : investment.currentValue + payload.amount,
      notes: serializedNotes,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader
        title="D12 Portfolio"
        icon={ChartLine}
        actions={(
          <Button onClick={handleAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Investment</span>
          </Button>
        )}
      />

      <main className="pt-16 min-h-screen">
        <div className="container py-6 lg:py-8 space-y-8 lg:space-y-10">
          <div className="flex items-center gap-3 mb-6 sm:hidden">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ChartLine className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">D12 Portfolio</h1>
          </div>

          <KpiCards summary={summary} />
          <MonthlyInsights snapshots={monthlySnapshots} investments={resolvedInvestments} />

          <div className="grid grid-cols-1 gap-6">
            <InvestmentSection
              title="Short-term Investments"
              investments={shortTerm}
              category="short-term"
              onEdit={handleEdit}
              onDelete={handleDelete}
              onQuickContribution={handleQuickContribution}
              onMoveInvestment={moveInvestment}
              cryptoSpotEur={cryptoSpotEur}
              cryptoQuoteLoading={cryptoQuoteLoading}
            />
            <InvestmentSection
              title="Long-term Investments"
              investments={longTerm}
              category="long-term"
              onEdit={handleEdit}
              onDelete={handleDelete}
              onQuickContribution={handleQuickContribution}
              onMoveInvestment={moveInvestment}
              cryptoSpotEur={cryptoSpotEur}
              cryptoQuoteLoading={cryptoQuoteLoading}
            />
          </div>
        </div>
      </main>

      {dialogOpen ? (
        <Suspense fallback={null}>
          <InvestmentDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            investment={syncedEditingInvestment}
            cryptoSpotEur={cryptoSpotEur}
            onSave={handleSave}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default Index;
