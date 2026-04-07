import { Suspense, lazy, useMemo, useRef, useState } from "react";
import { Plus, ChartLine, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/features/portfolio/components/KpiCards";
import { EarningsSection } from "@/features/portfolio/components/EarningsSection";
import { AllocationSection } from "@/features/portfolio/components/AllocationSection";
import { InvestmentSection } from "@/features/portfolio/components/InvestmentSection";
import { useInvestments } from "@/features/portfolio/hooks/useInvestments";
import { Investment, InvestmentMovementKind, PortfolioEarning, calculateSummary } from "@/features/portfolio/types/investment";
import AppSectionHeader from "@/components/AppSectionHeader";
import { useCryptoQuotes } from "@/features/portfolio/hooks/use-btc-quote";
import {
  buildSyntheticCryptoCashbackEarnings,
  parseCryptoNotes,
  parseInvestmentMovements,
  resolveInvestmentCurrentValue,
  serializeInvestmentNotes,
} from "@/features/portfolio/lib/crypto";
import { Skeleton } from "@/components/ui/skeleton";

const InvestmentDialog = lazy(() =>
  import("@/features/portfolio/components/InvestmentDialog").then((module) => ({ default: module.InvestmentDialog })),
);

const EarningDialog = lazy(() =>
  import("@/features/portfolio/components/EarningDialog").then((module) => ({ default: module.EarningDialog })),
);

const Index = () => {
  const {
    investments,
    earnings,
    loading,
    earningsLoading,
    shortTerm,
    longTerm,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addEarning,
    updateEarning,
    deleteEarning,
    moveInvestment,
  } = useInvestments({ blockOnSnapshots: false, blockOnEarnings: false });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [earningDialogOpen, setEarningDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingEarning, setEditingEarning] = useState<PortfolioEarning | null>(null);
  const hasCryptoInvestments = useMemo(
    () => investments.some((investment) => investment.type === "crypto"),
    [investments],
  );
  const { pricesEur: cryptoSpotEur, loading: cryptoQuoteLoading } = useCryptoQuotes(hasCryptoInvestments);
  const earningsSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToEarnings = () => {
    earningsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resolvedInvestments = useMemo(() => {
    return investments.map((investment) => ({
      ...investment,
      currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
    }));
  }, [investments, cryptoSpotEur]);

  const resolvedShortTerm = useMemo(
    () => shortTerm.map((investment) => ({
      ...investment,
      currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
    })),
    [shortTerm, cryptoSpotEur],
  );

  const resolvedLongTerm = useMemo(
    () => longTerm.map((investment) => ({
      ...investment,
      currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
    })),
    [longTerm, cryptoSpotEur],
  );

  const portfolioEarnings = useMemo(() => {
    const syntheticCryptoCashback = buildSyntheticCryptoCashbackEarnings(resolvedInvestments, cryptoSpotEur);
    const existingKeys = new Set(
      earnings.map((earning) => `${earning.kind}:${earning.title}:${earning.date}:${earning.cryptoAsset ?? ""}:${earning.cryptoUnits ?? ""}`),
    );

    return [
      ...earnings,
      ...syntheticCryptoCashback.filter((earning) => {
        const key = `${earning.kind}:${earning.title}:${earning.date}:${earning.cryptoAsset ?? ""}:${earning.cryptoUnits ?? ""}`;
        return !existingKeys.has(key);
      }),
    ];
  }, [earnings, resolvedInvestments, cryptoSpotEur]);

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

  const handleAddEarning = () => {
    setEditingEarning(null);
    setEarningDialogOpen(true);
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

  const handleSaveEarning = (data: Omit<PortfolioEarning, "id" | "createdAt" | "updatedAt">) => {
    if (editingEarning) {
      updateEarning(editingEarning.id, data);
    } else {
      addEarning(data);
    }
  };

  const handleEditEarning = (earning: PortfolioEarning) => {
    setEditingEarning(earning);
    setEarningDialogOpen(true);
  };

  const handleDeleteEarning = (id: string) => {
    if (window.confirm("Delete this earning?")) {
      deleteEarning(id);
    }
  };

  const handleQuickContribution = (
    investment: Investment,
    payload: { amount: number; date: string; mode: "contribution" | "value_update"; unitsBought?: number | null; description?: string },
  ) => {
    const { asset, units, cashbackAsset, cashbackUnits, cashbackDate, userNotes: rawUserNotes } = parseCryptoNotes(investment.notes);
    const existingMovements = parseInvestmentMovements(investment.notes);
    const userNotes = rawUserNotes || "";
    const isCashbackOnlyCrypto = investment.type === "crypto" && investment.investedAmount === 0 && !units && !!cashbackUnits;
    const roundUnits = (value: number) => Math.round(value * 1e8) / 1e8;

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
          ...(investment.type === "crypto" && payload.unitsBought != null ? { units: roundUnits(payload.unitsBought) } : {}),
          note: payload.description || "Profit / Return",
        },
      ].sort((a, b) => a.date.localeCompare(b.date));

      const nextUnitsProfit = investment.type === "crypto" && !isCashbackOnlyCrypto
        ? roundUnits((units ?? 0) + (payload.unitsBought ?? 0))
        : units ?? null;
      const nextCashbackUnits = investment.type === "crypto" && isCashbackOnlyCrypto
        ? roundUnits((cashbackUnits ?? 0) + (payload.unitsBought ?? 0))
        : cashbackUnits;

      updateInvestment(investment.id, {
        currentValue: investment.currentValue + payload.amount,
        notes: serializeInvestmentNotes({
          asset: investment.type === "crypto" ? asset : undefined,
          units: investment.type === "crypto" ? nextUnitsProfit : null,
          cashbackAsset: investment.type === "crypto" ? cashbackAsset : undefined,
          cashbackUnits: investment.type === "crypto" ? nextCashbackUnits : null,
          cashbackDate: investment.type === "crypto" && isCashbackOnlyCrypto ? payload.date : cashbackDate,
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
        ...(investment.type === "crypto" && payload.unitsBought ? { units: roundUnits(payload.unitsBought) } : {}),
        ...(payload.description ? { note: payload.description } : {}),
      },
    ].sort((a, b) => a.date.localeCompare(b.date));

    const nextInvestedAmount = investment.investedAmount + payload.amount;
    const nextUnits = investment.type === "crypto"
      ? roundUnits((units ?? 0) + (payload.unitsBought ?? 0))
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
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAdd}
              size="sm"
              className="h-10 w-10 rounded-xl px-0 gap-1.5 sm:h-9 sm:w-auto sm:px-3"
              aria-label="Add Investment"
              title="Add Investment"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Investment</span>
            </Button>

            <Button
              onClick={scrollToEarnings}
              variant="outline"
              size="sm"
              className="h-10 w-10 rounded-xl px-0 gap-1.5 sm:h-9 sm:w-auto sm:px-3"
              aria-label="Go to Earnings"
              title="Earnings"
            >
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Earnings</span>
            </Button>

            {/* Desktop actions */}
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to="/portfolio/insights" aria-label="Open insights" title="Insights" className="flex items-center gap-1.5">
                  <ChartLine className="h-4 w-4" />
                  <span>Insights</span>
                </Link>
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl sm:hidden"
              asChild
              aria-label="Insights"
            >
              <Link to="/portfolio/insights" title="Insights">
                <ChartLine className="h-4 w-4" />
              </Link>
            </Button>
          </div>
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

          {loading ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-9 w-9 rounded-xl" />
                    </div>
                    <Skeleton className="h-9 w-36" />
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-5 border-b border-border/70 pb-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-52" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`alloc-left-${index}`} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`alloc-right-${index}`} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
                      <div className="mb-5 border-b border-border/70 pb-5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-6 w-56" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-52 w-full rounded-2xl" />
                        <Skeleton className="h-52 w-full rounded-2xl" />
                      </div>
                    </div>
                  ))}
                </div>

                <div ref={earningsSectionRef} className="scroll-mt-24 rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
                  <div className="mb-5 border-b border-border/70 pb-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-44" />
                          <Skeleton className="h-4 w-72" />
                        </div>
                      </div>
                      <Skeleton className="h-10 w-32 rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={`earnings-${index}`} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <KpiCards summary={summary} />

              <AllocationSection investments={resolvedInvestments} />

              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6">
                  <InvestmentSection
                    title="Short-term Investments"
                    investments={resolvedShortTerm}
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
                    investments={resolvedLongTerm}
                    category="long-term"
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onQuickContribution={handleQuickContribution}
                    onMoveInvestment={moveInvestment}
                    cryptoSpotEur={cryptoSpotEur}
                    cryptoQuoteLoading={cryptoQuoteLoading}
                  />
                </div>

                <div ref={earningsSectionRef} className="scroll-mt-24">
                  <EarningsSection
                    earnings={portfolioEarnings}
                    cryptoSpotEur={cryptoSpotEur}
                    loading={earningsLoading}
                    onAdd={handleAddEarning}
                    onEdit={handleEditEarning}
                    onDelete={handleDeleteEarning}
                  />
                </div>
              </div>
            </>
          )}
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

      {earningDialogOpen ? (
        <Suspense fallback={null}>
          <EarningDialog
            open={earningDialogOpen}
            onOpenChange={setEarningDialogOpen}
            earning={editingEarning}
            cryptoSpotEur={cryptoSpotEur}
            onSave={handleSaveEarning}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default Index;
