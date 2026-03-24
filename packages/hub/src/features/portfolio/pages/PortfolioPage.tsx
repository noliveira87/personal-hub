import { Suspense, lazy, useState } from "react";
import { Plus, ChartLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/features/portfolio/components/KpiCards";
import { InvestmentSection } from "@/features/portfolio/components/InvestmentSection";
import { MonthlyInsights } from "@/features/portfolio/components/MonthlyInsights";
import { useInvestments } from "@/features/portfolio/hooks/useInvestments";
import { Investment, calculateSummary } from "@/features/portfolio/types/investment";
import AppSectionHeader from "@/components/AppSectionHeader";

const InvestmentDialog = lazy(() =>
  import("@/features/portfolio/components/InvestmentDialog").then((module) => ({ default: module.InvestmentDialog })),
);

const Index = () => {
  const { investments, monthlySnapshots, shortTerm, longTerm, addInvestment, updateInvestment, deleteInvestment } = useInvestments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const summary = calculateSummary(investments);

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
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

          <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
            <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:justify-between lg:px-8">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Portfolio overview
                </span>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    A clear view of the household portfolio.
                  </h2>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Follow short and long-term positions, monitor performance, and keep the overall financial picture organized in one place.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleAdd} className="gap-1.5 shadow-sm">
                  <Plus className="h-4 w-4" />
                  <span>Add investment</span>
                </Button>
              </div>
            </div>
          </section>

          <KpiCards summary={summary} />
          <MonthlyInsights snapshots={monthlySnapshots} />

          <div className="grid gap-6 xl:grid-cols-2 xl:gap-8">
            <InvestmentSection
              title="Short-term Investments"
              investments={shortTerm}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            <InvestmentSection
              title="Long-term Investments"
              investments={longTerm}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </main>

      {dialogOpen ? (
        <Suspense fallback={null}>
          <InvestmentDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            investment={editingInvestment}
            onSave={handleSave}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default Index;
