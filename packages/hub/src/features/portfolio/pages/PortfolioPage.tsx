import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChartLine, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

const InvestmentDialog = lazy(() =>
  import("@/features/portfolio/components/InvestmentDialog").then((module) => ({ default: module.InvestmentDialog })),
);

const EarningDialog = lazy(() =>
  import("@/features/portfolio/components/EarningDialog").then((module) => ({ default: module.EarningDialog })),
);

const INVESTMENT_TYPE_OPTIONS: Array<{ value: Investment["type"]; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "aforro", label: "Aforro" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Crypto" },
  { value: "p2p", label: "P2P" },
  { value: "ppr", label: "PPR" },
];

type QuickMovementMode = "contribution" | "value_update";

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
  const [quickMovementDialogOpen, setQuickMovementDialogOpen] = useState(false);
  const [quickMovementMode, setQuickMovementMode] = useState<QuickMovementMode>("contribution");
  const [quickMovementType, setQuickMovementType] = useState<Investment["type"]>("cash");
  const [quickMovementInvestmentId, setQuickMovementInvestmentId] = useState("");
  const [quickMovementDate, setQuickMovementDate] = useState(new Date().toISOString().slice(0, 10));
  const [quickMovementAmount, setQuickMovementAmount] = useState("");
  const [quickMovementUnits, setQuickMovementUnits] = useState("");
  const [quickMovementDescription, setQuickMovementDescription] = useState("");
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingEarning, setEditingEarning] = useState<PortfolioEarning | null>(null);
  const hasCryptoInvestments = useMemo(
    () => investments.some((investment) => investment.type === "crypto"),
    [investments],
  );
  const { pricesEur: cryptoSpotEur, loading: cryptoQuoteLoading } = useCryptoQuotes(hasCryptoInvestments);
  const earningsSectionRef = useRef<HTMLDivElement | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();

  const linkedCashbackByAsset = useMemo(() => {
    return earnings.reduce<Record<'BTC' | 'ETH', Array<{ id: string; date: string; amountEur: number; units: number }>>>((acc, earning) => {
      if (earning.externalSource !== 'cashback_hero' || earning.kind !== 'crypto_cashback') {
        return acc;
      }

      if ((earning.cryptoAsset !== 'BTC' && earning.cryptoAsset !== 'ETH') || !earning.cryptoUnits || earning.cryptoUnits <= 0) {
        return acc;
      }

      acc[earning.cryptoAsset].push({
        id: `linked-cashback-entry:${earning.id}`,
        date: earning.date,
        amountEur: earning.amountEur,
        units: earning.cryptoUnits,
      });
      return acc;
    }, { BTC: [], ETH: [] });
  }, [earnings]);

  const scrollToEarnings = () => {
    earningsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resolveInvestmentWithLinkedCashback = (investment: Investment): Investment => {
    if (investment.type !== 'crypto') {
      return {
        ...investment,
        currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
      };
    }

    const parsed = parseCryptoNotes(investment.notes);
    const linkedEntries = linkedCashbackByAsset[parsed.cashbackAsset] ?? [];
    if (linkedEntries.length <= 0) {
      return {
        ...investment,
        currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
      };
    }

    const shouldMergeLinkedCashback = investment.investedAmount === 0 && !parsed.units;
    if (!shouldMergeLinkedCashback) {
      return {
        ...investment,
        currentValue: resolveInvestmentCurrentValue(investment, cryptoSpotEur),
      };
    }

    const linkedUnits = linkedEntries.reduce((sum, item) => sum + item.units, 0);
    const baseMovements = parseInvestmentMovements(investment.notes)
      .filter((movement) => !movement.id.startsWith('linked-cashback-entry:'));
    const linkedMovements = linkedEntries.map((item) => ({
      id: item.id,
      date: item.date,
      kind: 'cashback' as const,
      amount: item.amountEur,
      units: item.units,
      note: 'Synced from Reward Wallet',
    }));
    const mergedMovements = [...baseMovements, ...linkedMovements]
      .sort((a, b) => a.date.localeCompare(b.date));

    const mergedNotes = serializeInvestmentNotes({
      asset: parsed.asset,
      units: parsed.units,
      cashbackAsset: parsed.cashbackAsset,
      cashbackUnits: Math.round((((parsed.cashbackUnits ?? 0) + linkedUnits) * 1e8)) / 1e8,
      cashbackDate: parsed.cashbackDate,
      movements: mergedMovements,
      userNotes: parsed.userNotes,
    });

    const mergedInvestment: Investment = {
      ...investment,
      notes: mergedNotes,
    };

    return {
      ...mergedInvestment,
      currentValue: resolveInvestmentCurrentValue(mergedInvestment, cryptoSpotEur),
    };
  };

  const resolvedInvestments = useMemo(() => {
    return investments.map((investment) => resolveInvestmentWithLinkedCashback(investment));
  }, [investments, cryptoSpotEur, linkedCashbackByAsset]);

  const resolvedShortTerm = useMemo(
    () => shortTerm.map((investment) => resolveInvestmentWithLinkedCashback(investment)),
    [shortTerm, cryptoSpotEur, linkedCashbackByAsset],
  );

  const resolvedLongTerm = useMemo(
    () => longTerm.map((investment) => resolveInvestmentWithLinkedCashback(investment)),
    [longTerm, cryptoSpotEur, linkedCashbackByAsset],
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

  const investmentsByQuickType = useMemo(
    () => resolvedInvestments.filter((investment) => investment.type === quickMovementType),
    [resolvedInvestments, quickMovementType],
  );

  const selectedQuickInvestment = useMemo(
    () => investmentsByQuickType.find((investment) => investment.id === quickMovementInvestmentId) ?? null,
    [investmentsByQuickType, quickMovementInvestmentId],
  );

  const quickMovementNeedsUnits = selectedQuickInvestment?.type === "crypto" && quickMovementMode === "contribution";

  useEffect(() => {
    if (!quickMovementDialogOpen) return;

    if (investmentsByQuickType.length === 0) {
      setQuickMovementInvestmentId("");
      return;
    }

    if (!investmentsByQuickType.some((investment) => investment.id === quickMovementInvestmentId)) {
      setQuickMovementInvestmentId(investmentsByQuickType[0].id);
    }
  }, [quickMovementDialogOpen, investmentsByQuickType, quickMovementInvestmentId]);

  const openQuickMovementDialog = (mode: QuickMovementMode, investmentType: Investment["type"]) => {
    setQuickMovementMode(mode);
    setQuickMovementType(investmentType);
    setQuickMovementDate(new Date().toISOString().slice(0, 10));
    setQuickMovementAmount("");
    setQuickMovementUnits("");
    setQuickMovementDescription("");
    setQuickMovementDialogOpen(true);
  };

  const saveQuickMovementFromHeader = () => {
    if (!selectedQuickInvestment || !quickMovementDate) return;

    const parsedAmount = parseDecimalInput(quickMovementAmount);
    const parsedUnits = parseDecimalInput(quickMovementUnits);

    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) return;
    if (quickMovementMode === "contribution" && parsedAmount < 0) return;

    if (quickMovementNeedsUnits && (!Number.isFinite(parsedUnits) || parsedUnits <= 0)) {
      return;
    }

    handleQuickContribution(selectedQuickInvestment, {
      amount: parsedAmount,
      date: quickMovementDate,
      mode: quickMovementMode,
      unitsBought: quickMovementNeedsUnits ? parsedUnits : null,
      description: quickMovementDescription.trim() ? quickMovementDescription.trim() : undefined,
    });

    setQuickMovementDialogOpen(false);
  };

  const handleSave = (data: Omit<Investment, "id" | "createdAt" | "updatedAt">) => {
    if (editingInvestment) {
      updateInvestment(editingInvestment.id, data);
    } else {
      addInvestment(data);
    }
  };

  const handleDelete = async (id: string) => {
    const approved = await confirm({
      title: "Delete this investment?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!approved) return;
    deleteInvestment(id);
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

  const handleDeleteEarning = async (id: string) => {
    const approved = await confirm({
      title: "Delete this earning?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!approved) return;
    deleteEarning(id);
  };

  const handleDeleteLinkedEarning = (id: string) => {
    deleteEarning(id);
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-10 w-10 rounded-xl px-0 gap-1.5 sm:h-9 sm:w-auto sm:px-3"
                  aria-label="Add actions"
                  title="Add actions"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Investment</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuItem onSelect={handleAdd}>Add Investment</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleAddEarning}>Add Earning</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Add Contribution</DropdownMenuLabel>
                {INVESTMENT_TYPE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={`contrib-${option.value}`}
                    onSelect={() => openQuickMovementDialog("contribution", option.value)}
                  >
                    Contribution · {option.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Add Profit / Return</DropdownMenuLabel>
                {INVESTMENT_TYPE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={`profit-${option.value}`}
                    onSelect={() => openQuickMovementDialog("value_update", option.value)}
                  >
                    Profit / Return · {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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
            onDeleteLinkedEarning={handleDeleteLinkedEarning}
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

      <Dialog open={quickMovementDialogOpen} onOpenChange={setQuickMovementDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{quickMovementMode === "contribution" ? "Add contribution" : "Add profit / return"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Investment type</Label>
              <Select
                value={quickMovementType}
                onValueChange={(value) => setQuickMovementType(value as Investment["type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Investment</Label>
              <Select
                value={quickMovementInvestmentId}
                onValueChange={setQuickMovementInvestmentId}
                disabled={investmentsByQuickType.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={investmentsByQuickType.length === 0 ? "No investments in this type" : "Select investment"} />
                </SelectTrigger>
                <SelectContent>
                  {investmentsByQuickType.map((investment) => (
                    <SelectItem key={investment.id} value={investment.id}>{investment.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quick-header-date">Date</Label>
              <Input
                id="quick-header-date"
                type="date"
                value={quickMovementDate}
                onChange={(event) => setQuickMovementDate(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="quick-header-amount">
                {quickMovementMode === "contribution" ? "Amount to invest (€)" : "Amount gained / lost (€)"}
              </Label>
              <Input
                id="quick-header-amount"
                type="text"
                inputMode="decimal"
                value={quickMovementAmount}
                onChange={(event) => setQuickMovementAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>

            {quickMovementNeedsUnits ? (
              <div>
                <Label htmlFor="quick-header-units">Units bought</Label>
                <Input
                  id="quick-header-units"
                  type="text"
                  inputMode="decimal"
                  value={quickMovementUnits}
                  onChange={(event) => setQuickMovementUnits(event.target.value)}
                  placeholder="0.00000000"
                />
              </div>
            ) : null}

            <div>
              <Label htmlFor="quick-header-description">Description (optional)</Label>
              <Input
                id="quick-header-description"
                value={quickMovementDescription}
                onChange={(event) => setQuickMovementDescription(event.target.value)}
                placeholder="e.g., Abril - reforço"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setQuickMovementDialogOpen(false)}>Cancel</Button>
              <Button
                type="button"
                onClick={saveQuickMovementFromHeader}
                disabled={!selectedQuickInvestment}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {confirmDialog}
    </div>
  );
};

export default Index;
