import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContractProvider } from "@/context/ContractContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ContractsList from "@/pages/ContractsList";
import ContractDetail from "@/pages/ContractDetail";
import ContractForm from "@/pages/ContractForm";
import CalendarPage from "@/pages/CalendarPage";
import AlertsPage from "@/pages/AlertsPage";
import SettingsPage from "@/pages/SettingsPage";
import InsightsPage from "@/pages/InsightsPage";
import NotFound from "./pages/NotFound.tsx";

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
              <Route path="/" element={<Dashboard />} />
              <Route path="/contracts" element={<ContractsList />} />
              <Route path="/contracts/new" element={<ContractForm />} />
              <Route path="/contracts/edit/:id" element={<ContractForm />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ContractProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
