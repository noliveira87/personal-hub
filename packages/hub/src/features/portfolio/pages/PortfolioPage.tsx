import { useState } from "react";
import { Plus, ChartLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/features/portfolio/components/KpiCards";
import { InvestmentSection } from "@/features/portfolio/components/InvestmentSection";
import { InvestmentDialog } from "@/features/portfolio/components/InvestmentDialog";
import { MonthlyInsights } from "@/features/portfolio/components/MonthlyInsights";
import { useInvestments } from "@/features/portfolio/hooks/useInvestments";
import { Investment, calculateSummary } from "@/features/portfolio/types/investment";
import AppSectionHeader from "@/components/AppSectionHeader";

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
        <div className="container py-6 lg:py-8">
          <div className="flex items-center gap-3 mb-6 sm:hidden">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ChartLine className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">D12 Portfolio</h1>
          </div>
          <KpiCards summary={summary} />
          <MonthlyInsights snapshots={monthlySnapshots} />
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

      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={editingInvestment}
        onSave={handleSave}
      />
    </div>
  );
};

export default Index;
