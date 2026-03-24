import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Moon, Sun, ArrowLeft, Settings, ChartLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/features/portfolio/components/KpiCards";
import { InvestmentSection } from "@/features/portfolio/components/InvestmentSection";
import { InvestmentDialog } from "@/features/portfolio/components/InvestmentDialog";
import { MonthlyInsights } from "@/features/portfolio/components/MonthlyInsights";
import { useInvestments } from "@/features/portfolio/hooks/useInvestments";
import { Investment, calculateSummary } from "@/features/portfolio/types/investment";
import { useDarkMode } from "@shared-ui/use-dark-mode";

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

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to projects</span>
          </Button>
          <div className="hidden sm:flex items-center gap-3 flex-1 justify-center">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ChartLine className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-base font-bold">D12 Portfolio</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleDark} className="text-muted-foreground">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} className="text-muted-foreground">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleAdd} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Investment</span>
            </Button>
          </div>
        </div>
      </header>

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
