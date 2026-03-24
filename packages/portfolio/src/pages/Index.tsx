import { Suspense, lazy, useState } from "react";
import { Plus, Moon, Sun, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/KpiCards";
import { InvestmentSection } from "@/components/InvestmentSection";
import { MonthlyInsights } from "@/components/MonthlyInsights";
import { useInvestments } from "@/hooks/useInvestments";
import { Investment, calculateSummary } from "@/types/investment";
import { useDarkMode } from "@shared-ui/use-dark-mode";

const InvestmentDialog = lazy(() =>
  import("@/components/InvestmentDialog").then((module) => ({ default: module.InvestmentDialog })),
);

const Index = () => {
  const { investments, monthlySnapshots, shortTerm, longTerm, addInvestment, updateInvestment, deleteInvestment } = useInvestments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const { isDark, toggleDark } = useDarkMode();

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

  const launcherUrl = `${window.location.protocol}//${window.location.hostname}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Personal hub</p>
            <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">D12 Portfolio</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = launcherUrl}
              className="hidden gap-1.5 sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to projects</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleDark} className="text-muted-foreground">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button onClick={handleAdd} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Investment</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:gap-10 lg:px-8 lg:py-10">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = launcherUrl}
                className="gap-1.5 sm:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Projects</span>
              </Button>
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
