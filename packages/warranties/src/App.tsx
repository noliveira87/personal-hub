import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Warranties from "./pages/Warranties.tsx";
import PortfolioTracker from "./pages/PortfolioTracker.tsx";
import HomeExpenses from "./pages/HomeExpenses.tsx";
import ContractManager from "./pages/ContractManager.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/warranties" element={<Warranties />} />
          <Route path="/portfolio-tracker" element={<PortfolioTracker />} />
          <Route path="/home-expenses" element={<HomeExpenses />} />
          <Route path="/home-contracts" element={<ContractManager />} />
          <Route path="/contract-manager" element={<ContractManager />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
