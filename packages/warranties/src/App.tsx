import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Hub + Warranties
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Warranties from "./pages/Warranties.tsx";
import SettingsPage from "./pages/Settings.tsx";

// Portfolio
import PortfolioPage from "./features/portfolio/pages/PortfolioPage.tsx";

// Contracts
import { ContractProvider } from "./features/contracts/context/ContractContext.tsx";
import ContractsLayout from "./features/contracts/components/Layout.tsx";
import ContractsDashboard from "./features/contracts/pages/ContractsDashboard.tsx";
import ContractsList from "./features/contracts/pages/ContractsList.tsx";
import ContractForm from "./features/contracts/pages/ContractForm.tsx";
import ContractDetail from "./features/contracts/pages/ContractDetail.tsx";
import CalendarPage from "./features/contracts/pages/CalendarPage.tsx";
import AlertsPage from "./features/contracts/pages/AlertsPage.tsx";
import InsightsPage from "./features/contracts/pages/InsightsPage.tsx";
import SettingsPage from "./features/contracts/pages/SettingsPage.tsx";

const queryClient = new QueryClient();

const ContractsSection = () => (
  <ContractProvider>
    <ContractsLayout>
      <Outlet />
    </ContractsLayout>
  </ContractProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/warranties" element={<Warranties />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route element={<ContractsSection />}>
            <Route path="/contracts" element={<ContractsDashboard />} />
            <Route path="/contracts/list" element={<ContractsList />} />
            <Route path="/contracts/list/new" element={<ContractForm />} />
            <Route path="/contracts/list/edit/:id" element={<ContractForm />} />
            <Route path="/contracts/list/:id" element={<ContractDetail />} />
            <Route path="/contracts/calendar" element={<CalendarPage />} />
            <Route path="/contracts/alerts" element={<AlertsPage />} />
            <Route path="/contracts/insights" element={<InsightsPage />} />
            <Route path="/contracts/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
