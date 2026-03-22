import { useState } from "react";
import { Plus, Moon, Sun, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/KpiCards";
import { InvestmentSection } from "@/components/InvestmentSection";
import { InvestmentDialog } from "@/components/InvestmentDialog";
import { MonthlyInsights } from "@/components/MonthlyInsights";
import { useInvestments } from "@/hooks/useInvestments";
import { Investment, calculateSummary } from "@/types/investment";

const Index = () => {
  const { investments, monthlySnapshots, shortTerm, longTerm, addInvestment, updateInvestment, deleteInvestment } = useInvestments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isDark, setIsDark] = useState(false);

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

  const toggleDark = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            💼 My Portfolio
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "http://localhost:8081"}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to projects</span>
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

      <main className="container py-6 space-y-8">
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
