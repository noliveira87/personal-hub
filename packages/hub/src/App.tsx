import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContractProvider } from "@/context/ContractContext";
import Layout from "@/components/Layout";

// Hub pages
import Index from "@/pages/Index";
import Dashboard from "@/pages/hub/Dashboard";

// Contracts pages
import ContractsList from "@/pages/contracts/ContractsList";
import ContractDetail from "@/pages/contracts/ContractDetail";
import ContractForm from "@/pages/contracts/ContractForm";
import CalendarPage from "@/pages/contracts/CalendarPage";
import AlertsPage from "@/pages/contracts/AlertsPage";
import InsightsPage from "@/pages/contracts/InsightsPage";

// Portfolio pages
import PortfolioPage from "@/pages/portfolio/PortfolioPage";

// Warranties pages
import WarrantiesPage from "@/pages/warranties/WarrantiesPage";

import SettingsPage from "@/pages/SettingsPage";
import WorkInProgress from "@/pages/WorkInProgress";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ContractProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              {/* Hub */}
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Contracts */}
              <Route path="/contracts" element={<ContractsList />} />
              <Route path="/contracts/new" element={<ContractForm />} />
              <Route path="/contracts/edit/:id" element={<ContractForm />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/insights" element={<InsightsPage />} />

              {/* Portfolio */}
              <Route path="/portfolio" element={<PortfolioPage />} />

              {/* Warranties */}
              <Route path="/warranties" element={<WarrantiesPage />} />

              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />

              {/* Work in Progress */}
              <Route path="/home-expenses" element={<WorkInProgress />} />

              {/* Not found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ContractProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
